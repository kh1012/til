---
draft: true
type: "content"
domain: "frontend"
category: "threejs"
topic: "InstancedMesh 부글거림 본질은 scene graph + Electron 패키징 함정"
updatedAt: "2026-04-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "three.js"
  - "react-three-fiber"
  - "instanced-mesh"
  - "raycast"
  - "electron"
  - "next.js standalone"
  - "fork"
  - "ELECTRON_RUN_AS_NODE"
  - "portable exe"
  - "nsis"
  - "z-fighting"
  - "boundingSphere"

relatedCategories:
  - "react"
  - "electron"
  - "webgl"
  - "rendering"
  - "debugging"
---

# InstancedMesh 부글거림과 Electron 패키징 — 표면 처치 8회 끝에 발견한 본질

> 같은 버그를 10번 다른 각도에서 고치다가, 결국 11번째에 "사실 구조가 잘못됐다"는 걸 깨달은 하루.

## 배경

3D 구조설계 뷰어(Three.js + React Three Fiber)에서 보/기둥/벽체 hover 시 시각적 부글거림(flicker)이 보였다. 슬래브는 멀쩡한데 InstancedMesh를 쓰는 부재 3종만 흔들렸다. 처음엔 "그거야 React 이벤트 처리 최적화 문제겠지" 하고 시작했는데, 표면 처치를 8번 반복하다 결국 **렌더 레벨(scene graph 구조 자체)** 에 가서야 본질이 풀렸다.

같은 날 Electron으로 데스크탑 앱을 패키징하다가 빈 창만 뜨는 회귀도 발견했다. 이것도 "보통 이런 건 fork 옵션 한 줄"이라는 검색 결과를 따라 쳤더니 정말 한 줄로 해결됐다. 그러나 이 두 사건이 같은 본질을 공유한다 — **외부 시스템(GPU 파이프라인 / Electron 런타임)의 가정을 모르면 표면만 만지게 된다.**

## 핵심 내용

### 1. InstancedMesh 부글거림 — 8번의 표면 처치, 1번의 본질 fix

`@react-three/fiber`의 `<instancedMesh>`는 N개 인스턴스를 단일 draw call로 그린다. hover한 인스턴스만 강조하려고 별도 overlay mesh를 위에 덮고 underlying instance는 `setMatrixAt(i, scale=0)`으로 숨기는 트릭을 썼는데, 이게 부글거림의 근원이었다.

**시도한 fix들 (모두 표면 처치)**

| 사이클 | 가정 | 처치 | 결과 |
|--------|------|------|------|
| C63 | overlay opacity가 약해서 시각이 흐릿 | opacity 0.4 → 0.55, scaleBoost 1.005 → 1.02 | ❌ 그대로 |
| C64 | InstancedMesh raycast가 boundingSphere stale로 막힘 | `setMatrixAt` 후 `mesh.computeBoundingSphere()` 명시 호출 | ✅ 이건 진짜 다른 버그(이벤트 미발화)였음. 부글거림은 그대로 |
| C65 | `transparent: true` + opacity 분기 → z-fight | hovered instance scale=0 + 단일 overlay mesh로 패러다임 전환 | ❌ 부글거림 잔존 |
| C66 | slab vs 부재 select 색이 미묘하게 다름 — colorspace | `tmp.set(hex)` (sRGB) vs `tmp.setRGB(r,g,b)` (linear) — 둘이 다른 색 출력. `set(hex)` 쪽으로 통일 | ✅ 색은 같아짐. 부글거림은 그대로 |
| C67 | `setMatrixAt` useEffect deps에 hover/select가 들어가서 매번 N개 instance 재기록 | effect를 items deps + hover/select deps 두 개로 분리 + `prevHoverIdRef`로 prev/cur 단 2개만 갱신 | ❌ 잔존 |
| C68 | `handlePointerMove`가 매 frame `setHoveredId(sameValue)` dispatch → React 19 fiber enqueue → R3F frame loop와 경쟁 → frame timing jitter | `hoveredIdRef` 도입, ref 비교를 `stopPropagation`보다 먼저 — 같은 instance면 진정한 noop | ❌ 잔존 |

이 시점에서 사용자가 "그대로야 다른 가설을 세워야 할 거 같은데" 라고 했고, 그제야 **렌더 레벨**을 의심하기 시작했다.

**C69 — 본질 발견**

slab은 부글거림이 0이었다. 두 패러다임 비교:

```
slab:
  단일 mesh (ShapeGeometry)
  hover 시 → material.color/opacity prop만 변경
  → React가 ThreeJS Object 재사용, scene graph 변동 0

부재 (InstancedMesh + scale=0 트릭):
  underlying instance N개 (polygonOffset factor=1)
  hovered instance scale=0으로 숨김 (vertex shader에서 collapse → degenerate triangle)
  + overlay mesh 단일 박스를 같은 위치에 transparent로 렌더 (polygonOffset 없음)
  → z-fight + zero-scale degenerate → 일부 GPU 드라이버에서 dirty pixel
  → 카메라 micro-rotation에서 sub-pixel jitter 시각화
```

**fix**: overlay mesh 폐기 + scale=0 트릭 폐기. hover/select 상태를 instance 자체의 `setColorAt`으로만 표현 (slab과 동일 패러다임).

```ts
// 3-effect 구조
// effect 1 (items deps): 전체 instance를 base color로 초기화
// effect 2 (hoveredId deps): prev/cur 단 2개만 setColorAt
// effect 3 (selectedId deps): prev/cur 단 2개만 setColorAt
// 우선순위: select > hover (selected instance에 hover가 와도 select 색 유지)
```

부글거림 0. 8번의 이벤트 레벨 fix가 모두 빗나간 이유는 명확하다 — **본질은 GPU 파이프라인의 z-fight + degenerate triangle 처리였고, React/이벤트 영역에서는 잡을 수 없는 문제였다.**

### 2. Three.js InstancedMesh 함정 정리 (오늘 발견한 것들)

| 함정 | 증상 | 본질 |
|------|------|------|
| `setMatrixAt` 후 `boundingSphere` stale | items 변경 시 raycast가 mesh-level bound check에서 차단되어 **이벤트 firing 자체가 발생 안 함** | `setMatrixAt`은 `instanceMatrix.needsUpdate`만 set, BS는 자동 갱신 안 됨. items deps에서 `mesh.computeBoundingSphere()` 명시 호출 필수 |
| `Color.set(hex)` vs `Color.setRGB(r,g,b)` | 같은 색을 줬는데 InstancedMesh와 단일 mesh의 출력이 미묘하게 다름 | `set(hex)`는 sRGB→linear 자동 변환, `setRGB`는 LinearSRGB 기본. 통일 필요 |
| Scale=0 instance | vertex shader에서 collapse → degenerate triangle → 일부 드라이버에서 dirty pixel | 차라리 `setColorAt`으로 색만 변경. instance를 "숨기는" 트릭은 위험 |
| `polygonOffset` 부분 적용 | 같은 위치 두 mesh 중 한쪽만 polygonOffset이면 z-fight | 전부 적용 또는 전부 빼기. 또는 overlay 패러다임 자체를 폐기 |
| `setState(sameValue)` in `onPointerMove` | React 19에서 `Object.is` bail-out은 있지만 그 전에 fiber root에 dispatch enqueue. R3F의 `useFrame` loop와 경쟁 시 frame timing jitter | ref 비교로 `setState` 호출 자체를 차단해야 진정한 noop |
| `onPointerMove` 매 frame 발화 | InstancedMesh는 instance 간 이동 추적용으로 필요하지만, 같은 instance 위 micro-move에서도 매 frame 호출 | ref-first guard로 같은 id 시 즉시 return |

### 3. Electron + Next.js standalone — `ELECTRON_RUN_AS_NODE` 한 줄

Windows 11 64bit에서 portable .exe 더블클릭 시 Task Manager에는 프로세스가 떠있는데 UI 창은 절대 안 뜨는 회귀. main.ts의 `startProductionServer`:

```ts
// Before (회귀)
serverProcess = fork(serverPath, [], {
  cwd: path.join(unpackedPath, ".next", "standalone"),
  env: {
    ...process.env,
    PORT: "3000",
    HOSTNAME: "localhost",
    // ❌ ELECTRON_RUN_AS_NODE 누락
  },
});
```

Electron 런타임의 `child_process.fork()`는 기본적으로 자식을 **Electron 바이너리로 spawn**한다 (Node 바이너리가 아님). `server.js`가 새 Electron 인스턴스로 시작되면 GUI 모드로 진입하고 server.js는 entry point로 인식되지 않아 서버가 안 뜬다 → `loadURL("http://localhost:3000")` → ERR_CONNECTION_REFUSED → 빈 창.

**fix**: `ELECTRON_RUN_AS_NODE: "1"` 추가. 이 환경변수가 set되면 fork된 자식은 Node 모드로 실행되어 server.js가 정상 동작한다.

```ts
env: {
  ...process.env,
  PORT: "3000",
  HOSTNAME: "localhost",
  ELECTRON_RUN_AS_NODE: "1",  // ← 한 줄
},
```

추가 보강: ready 매칭 정규식 확장 `/Ready|started|Local:|listening/i`, `loadOnce` 가드, `did-fail-load` 시 1회 재시도, server stdout/stderr/error/exit 4종 진단 로그.

### 4. Portable .exe 콜드 스타트의 본질 — 매 실행 재추출

처음엔 "Electron 앱이 원래 무겁구나" 했는데, 분포를 까보니:

```
release/win-unpacked/  1.3GB
├── resources/         984M
│   ├── app.asar.unpacked/  903M  ← 핵심
│   │   └── node_modules/   749M  ← 비효율의 근원
│   └── app.asar       81M
├── MAX.exe (Electron) 204M
├── locales/           46M
└── *.dll              ~50M
```

`asarUnpack: ["node_modules/**/*"]`로 root `node_modules` 749M을 통째로 unpacked → `.next/standalone`이 이미 production-trace된 minimal node_modules 53M을 포함하는데, 그 위에 root node_modules 전체가 또 들어감.

Portable .exe (Nullsoft self-extracting)는 **매 실행마다 1.3GB를 %TEMP%에 추출**한다. 캐시 안 됨. 첫 실행과 두 번째 실행 시간이 거의 동일. SSD에서 25-50초, HDD에서 60-110초.

대안: **NSIS 인스톨러** (`win.target: nsis`). 한 번 설치 후 영구 저장 → 콜드 스타트 8-16초 (60-75% 단축).

다만 NSIS도 5-10초 floor가 있다 — Electron Chromium 초기화 + Next.js standalone fork + 첫 React 렌더는 본질적으로 그만큼 걸린다. 5초 이하는 fork() 폐기하고 main process에 server를 직접 embed해야 가능.

### 5. 디버깅 패턴 — 이벤트 레벨에서 못 잡으면 렌더 레벨로

오늘의 가장 큰 수확. 8번의 표면 처치를 통해 배운 발견 절차:

1. **이벤트/state 레벨**: handler 호출 비용, setState dispatch, deps, ref guard, stopPropagation
2. **React reconciliation 레벨**: useMemo equality, key, mount/unmount, batched commit
3. **렌더 레벨**: scene graph 구조, depth ordering, alpha blending, polygonOffset, GPU 파이프라인 가정
4. **OS 레벨**: 카메라 jitter, OrbitControls damping, 드라이버 차이

레벨 1-2에서 잡을 수 있으면 좋지만, 같은 증상이 5-6회 fix해도 잔존하면 **레벨이 잘못 짚인 것**이다. "혹시 더 깊은 곳에 있는 게 아닐까?" 를 빨리 물어야 한다.

## 정리

**Three.js / R3F 관련**
- InstancedMesh는 "최적화된 단일 mesh"가 아니라 **"제약이 많은 특수 mesh"** 다. 단일 mesh의 mental model을 그대로 끌어오면 함정이 많다.
- "hover된 instance를 시각적으로 다르게 보여주는" 가장 안전한 방법은 **`instanceColor` 변경 + 단일 opacity (`transparent: true` 모든 instance 동일)**. overlay 패러다임은 z-fight 위험이 본질적으로 항상 있다.
- React 19 + R3F 조합에서 `onPointerMove` 핸들러는 매 frame 호출되므로, 같은 state로 setState 호출하는 패턴(ref-first guard 없는)은 보이지 않는 비용이 크다.

**Electron 관련**
- `child_process.fork()`는 Electron에서는 다른 의미다. 자식 entry는 항상 Electron 바이너리로 spawn — Node로 실행하려면 `ELECTRON_RUN_AS_NODE=1`.
- Portable .exe는 "설치 안 하는 편의성"이지만 콜드 스타트의 본질이 압축 해제이므로 일상 사용엔 NSIS 인스톨러가 압도적으로 빠르다. 둘 다 산출하는 게 좋다 (`win.target: [portable, nsis]`).
- macOS와 Windows의 child process 분기 (`open -a` vs `spawn`)는 항상 별도 처리가 필요하고 try/catch로 main process Uncaught Exception은 절대 막아야 한다.

**디버깅 메타**
- 같은 가설(이벤트 레벨)에서 fix를 5-6번 반복했는데도 증상이 그대로면 가설 자체가 틀렸다. 다른 추상화 계층(렌더, OS, 드라이버)으로 가설을 옮겨야 한다.
- 표면 처치도 가치가 있다 — 각 사이클이 가능성을 하나씩 제거해주므로 본질에 도달하기 위한 좁히기 과정이다. 8번의 시도가 모두 실패한 게 아니라, 각각 "이 레벨에서는 본질이 아니다"를 증명한 셈.
- 사용자가 "다른 가설을 세워봐야 할 거 같다" 라고 말해주는 순간이 있다. 이런 신호를 놓치지 말 것.
