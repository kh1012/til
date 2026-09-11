---
type: "content"
domain: "frontend"
category: "electron"
topic: "온보딩 화면의 조기 반환이 업데이트 대화상자 대기를 영원히 끝나지 않게 만든 사례"
updatedAt: "2026-09-10"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "electron"
  - "atelier"
  - "boot-update-check"
  - "playwright"
  - "clonefile"
  - "race-condition"

relatedCategories:
  - "testing"
  - "debugging"
---

# 온보딩 화면의 조기 반환이 업데이트 대화상자 대기를 영원히 끝나지 않게 만든 사례

> atelier 앱의 업데이트 대화상자 문구를 좌측 정렬하는 사소한 요청에서 시작해, 실제로 세 가지 업데이트 시나리오를 격리 클론 위에서 Playwright로 눌러보다가 창이 영원히 안 드러나는 결함을 발견하고 고친 기록.

## 배경

`maxflow/apps/atelier/shell/src/components/UpdateDialog.tsx`의 브랜치·HEAD 설명 텍스트를 좌측 정렬해 달라는 요청이 시작점이었다. 화면 정렬만 바꾸고 끝낼 수도 있었지만, 업데이트 대화상자와 관련된 코드라 "업데이트 없음 / 업데이트 하기 / 이미 최신" 세 상태를 실제로 눌러서 확인하기로 했다.

라이브 앱(포트 9141-9143)을 직접 건드리면 실제 사용 중인 프로세스에 영향을 주므로, `cp -c -R`(APFS clonefile 복사, copy-on-write)로 저장소 전체를 `/tmp/atelier-boot-verify/repo`에 복사하고, 그 안에 "낡은 빌드"를 흉내 낸 더미 커밋을 하나 얹은 뒤 Playwright `_electron`으로 그 복사본만 실행해 검증했다.

## 핵심 내용

시나리오 B("업데이트 하기")를 누르자 `server connection lost`, `ERR_CONNECTION_REFUSED` 에러가 뜨고 창이 끝까지 드러나지 않았다.

원인은 두 모듈이 서로 다른 렌더링 상태를 각자 가정한 데 있었다.

- `App.tsx`는 시스템 점검(system-check)·워크벤치 고르기(workbench-picker) 같은 첫 실행 온보딩 화면을 보여줄 때 조기 반환(early return)하며, 이 경로에서는 `<ShellDialogs>` 자체를 렌더링하지 않는다.
- 새로 만든 `boot-update-check.ts`(`useBootUpdateCheck`)는 업데이트 대화상자가 열렸다가 닫히기를 기다린 다음 창을 드러내는데(`revealBootWindow()`), 대화상자가 열린다는 것을 전제로 짜여 있었다.
- 온보딩 화면이 떠 있는 동안 낡은 빌드로 인해 업데이트 체크가 걸리면, 대화상자는 애초에 열리지 않으므로 "닫힘"도 오지 않고, 창을 드러내는 신호가 영영 발화하지 않는다 — 조기 반환으로 건너뛴 렌더링 경로를, 그 렌더링 결과를 기다리는 훅이 모르는 채로 대기하는 교착 상태다.

수정은 `useBootUpdateCheck`에 `blockedByOnboarding: boolean` 인자를 추가하는 방식으로 들어갔다.

```ts
export function useBootUpdateCheck(
  openUpdate: () => void,
  blockedByOnboarding: boolean,
): { ... }
```

내부에서는 `blockedRef`(기존 `openUpdateRef`와 같은 패턴)로 이 값을 추적해, `if (check.packaged && check.prompt && !blockedRef.current) openUpdateRef.current(); else revealBootWindow();` 형태로 분기한다. 렌더마다 effect를 다시 걸지 않기 위해 ref로 감쌌다.

호출부인 `App.tsx`는 이렇게 값을 넘긴다.

```tsx
const systemCheckScreen = useSystemCheckScreen();
const workbenchScreen = useWorkbenchScreen();
const bootUpdate = useBootUpdateCheck(
  () => setOverlay("update"),
  Boolean(systemCheckScreen || workbenchScreen),
);
const bare = bareRoute({ flow, page, onTerminal });
if (bare) return bare;
if (systemCheckScreen) return systemCheckScreen;
if (workbenchScreen) return workbenchScreen;
```

같은 격리 환경으로 정상 경로(업데이트 없이 닫으면 드러남 / 업데이트 시키면 끝까지 안 드러남 / 본문 좌측 정렬)도 재확인한 뒤 `a8a27c9061`로 커밋했다(`maxflow/apps/atelier/shell/src/lib/boot-update-check.ts`, `App.tsx` 등 2개 파일, +22/-6).

## 정리

사소한 CSS 요청이 실제 결함 발견으로 이어진 것은, 고치고 끝내지 않고 관련 상태 전부를 격리 환경에서 직접 눌러봤기 때문이다. 결함 자체는 흔한 패턴이다 — 한 모듈이 조기 반환으로 건너뛴 렌더링 결과를, 다른 모듈(훅)이 "당연히 일어난다"고 가정한 채 기다린다. 이런 교착은 정적 리뷰로는 잘 안 보이고, 상태 조합을 실제로 실행해봐야 드러난다. 라이브 프로세스를 직접 쓰지 않고 `cp -c`(clonefile) 복사본 위에서 Playwright `_electron`으로 검증한 방식도, 운영 중인 것을 건드리지 않고 재현하는 방법으로 기록해 둘 만하다.
