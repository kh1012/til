---
draft: true
type: "content"
domain: "frontend"
category: "threejs"
topic: "InstancedMesh selection 색상이 안 보이는 함정 — material × instanceColor × lighting"
updatedAt: "2026-04-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "threejs"
  - "InstancedMesh"
  - "react-three-fiber"
  - "meshStandardMaterial"
  - "meshBasicMaterial"
  - "instanceColor"
  - "lighting"

relatedCategories:
  - "react"
  - "performance"
  - "graphics"
---

# InstancedMesh selection 색상이 안 보이는 함정

> 같은 hex 색상을 줘도 평면 mesh와 박스 InstancedMesh에서 시각이 다르게 보이는 이유 — material × instanceColor × lighting의 곱셈 효과를 모르면 한참 헤맨다.

## 배경

3D 구조 모델 viewer에서 부재(보/기둥/벽체/슬라브)를 클릭하면 선택된 부재만 accent 색으로 강조하려 했다. 슬라브는 잘 동작하는데 보/기둥/벽체는 클릭해도 색이 안 변한다. 코드상 같은 `accentColor` 토큰을 동일 함수로 적용했는데 시각이 다르다.

처음엔 `setColorAt`이 안 불리는 줄 알았는데 console.log로 확인하면 정상 호출. instanceColor 값도 정확히 accent. 그런데 화면엔 안 보임.

## 핵심 내용

### Three.js의 final pixel 공식

```
final = lighting × material.color × instanceColor (× opacity)
```

이 곱셈 사슬을 잊으면 디버깅이 어려워진다.

### 슬라브 vs InstancedMesh의 본질적 차이

**ClassifySlabMesh (잘 동작)**

```tsx
<meshStandardMaterial color={fillColor} ... />
// fillColor = selected ? accentColor : baseColor
// 평면 ShapeGeometry — 단일 normal — lighting이 거의 균일하게 한 면에만 적용
```

평면 mesh는 lighting 영향이 균일해서 `accentColor`가 그대로 인지된다.

**InstancedMemberMesh (안 보임)**

```tsx
<meshStandardMaterial color={0xffffff} ... />
// material.color = white (1,1,1)
// instanceColor = setColorAt 으로 base 또는 accent
// final = lighting × white × instanceColor
```

box geometry는 6면이 다른 normal을 갖고 lighting을 받는다. 빛을 적게 받는 면(아래/뒤)은 `lighting ≈ 0.3 ~ 0.5` 수준이라 같은 accent 색이라도 어둡게 mix되어 base 회색과 시각상 거의 구분이 안 된다.

### 왜 material.color = white인가

InstancedMesh에서 instance마다 다른 색을 주려면 `setColorAt(i, color)` 패턴을 쓴다. 이때:

```
final = material.color × instanceColor
```

material.color가 회색이면 instanceColor도 그 회색에 곱해져 어두워진다. 그래서 instanceColor만으로 색을 결정하려면 material.color = white로 두는 게 정석.

문제는 그래도 `lighting`이 남아있다는 것. 평면이면 균일하지만 box는 면별 차이가 크다.

### 해결 방안 3가지

**옵션 A — `meshBasicMaterial`로 변경**

```tsx
<meshBasicMaterial color={0xffffff} toneMapped={false} />
```

lighting 영향을 완전히 제거한다. 단점: 깊이감/그림자 사라짐.

**옵션 B — `emissive` 추가**

```tsx
<meshStandardMaterial
  color={0xffffff}
  emissive={accentColor}
  emissiveIntensity={1}
/>
```

발광체로 처리. lighting 무관하게 색이 또렷이 보인다. 단점: 모든 instance가 같은 emissive (instance별 emissive는 별도 InstancedBufferAttribute 필요).

**옵션 C — accent 색 자체를 더 채도/명도 있게**

가장 단순하지만 디자인 시스템 토큰을 흔드는 trade-off.

이번엔 옵션 A로 통일했다. 슬라브와 동일 머터리얼 패턴으로 맞추니 4종 부재 모두 같은 accent 톤으로 보인다.

## 정리

- **Three.js material × instanceColor × lighting의 곱셈 사슬을 항상 의식하자.** 같은 hex여도 mesh의 형상(평면 vs box)에 따라 시각 톤이 완전히 다르게 나올 수 있다.
- **InstancedMesh setColorAt 패턴은 material.color = white가 전제.** 회색 base에 setColorAt(accent)을 적용하면 회색×accent로 어두워진다.
- **selection 강조처럼 색이 또렷이 보여야 하는 인터랙션은 lighting 영향을 차단하자.** `meshBasicMaterial` 또는 `emissive`. 세련된 음영이 필요한 default 상태와는 별도 머터리얼 전략.
- **디자인 시스템 accent 토큰은 globals.css의 CSS 변수에서 읽되 SSR fallback과 mount 후 실제 값 사이의 1프레임 깜빡임을 의식하자.** `useLayoutEffect`로 즉시 동기화하거나 fallback hex를 실제 토큰과 최대한 가까이 두면 깜빡임이 줄어든다.
- 비슷한 함정이 OpenGL/Vulkan/WebGPU 어떤 그래픽스 API에서도 동일하게 발생한다 — 색상 값과 시각 결과가 다르면 곱셈 사슬을 의심하자.
