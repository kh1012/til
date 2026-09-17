---
type: "content"
domain: "frontend"
category: "state-management"
topic: "픽 시점에 얼려둔 스냅샷 값이 이후 정본 상태를 덮어쓰는 버그"
updatedAt: "2026-09-16"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "stale-state"
  - "snapshot"
  - "source-of-truth"
  - "broadcastchannel"
  - "navigation"

relatedCategories:
  - "react"
  - "ui-ux"
---

# 픽 시점에 얼려둔 스냅샷 값이 이후 정본 상태를 덮어쓰는 버그

> 예전에 한 번 확정해서 저장해둔 값과, 지금 화면이 실제로 보여주는 값이 서로 다른 저장소에 나뉘어 있으면, 오래된 값이 최신 값을 강제로 덮어쓰는 사고가 난다.

## 배경

`maxys_proto` 저장소 atelier 워크벤치에서, 터미널 창의 "고르기" 기능으로 요소를 지정하면 shell 창이 엉뚱한 스토리로 강제 이동하는 버그를 조사했다. 같은 컴포넌트를 보고 있는데도 다른 스토리로 튀는 재현 조건을 좁혀서 원인을 특정했다.

## 핵심 내용

- 구조: 터미널 pane과 shell 창은 별도 프로세스(창)이고, `BroadcastChannel`(`atelier-dock` 채널, `dock-window.ts`의 `openDockChannel()`)로 `picker-arm` 같은 메시지를 주고받는다.
- 버그 지점: `apps/atelier/shell/src/components/DockPickerBridge.tsx`의 `onArm` 콜백.
  ```js
  const needsMove = at.pathname !== href || (wantStory !== null && at.storyId !== wantStory);
  ```
  컴포넌트(`pathname`)가 같아도 터미널이 보낸 `wantStory`가 지금 보고 있는 스토리와 다르면 `needsMove`가 `true`가 되어 `navigate(href?story=wantStory)`가 실행된다.
- 원인: 터미널 pane이 들고 있는 `PaneTarget.storyId`가 그 순간의 스냅샷일 뿐, 이후 shell에서 스토리를 바꿔도 갱신되지 않는다.
  - `paneTargetOfRun`/`paneTargetOfSeed`(`pane-target.ts`)는 run/seed 생성 시점 값으로 `storyId`를 고정한다.
  - `AgentDock.pane-tree.tsx`의 `onPicked`는 요소를 찍는 순간 `pane.target.storyId`를 그 시점 스토리로 다시 얼려 로컬스토리지(`dock-panes.store.ts`)에 저장한다. 이후 사용자가 shell에서 수동으로 다른 스토리로 이동해도 이 값은 그대로 남는다.
  - 반면 "지금 실제로 보고 있는 스토리"의 정본은 두 곳이다: URL 쿼리 기반 `use-story-param.ts`의 `useActiveStory`, 그리고 화면에 뜬 컷을 즉시 반영하는 `shown-story.ts`의 `shownStory()`.
- 재현 순서: (1) 예전에 픽 완료 시 `storyId`가 `"Default"`로 고정됨 → (2) 사용자가 shell에서 다른 스토리로 수동 이동 → (3) 터미널에서 "고르기"를 다시 누르면 여전히 `storyId: "Default"`가 전송됨 → (4) `onArm`이 현재 스토리와 다르다는 이유로 `needsMove=true` 판정, 강제로 `Default`로 되돌림.
- 수정 방향: `needsMove` 판정을 `at.pathname !== href` 하나로 줄인다. 컴포넌트가 같으면 `wantStory`를 아예 무시하고 픽 모드만 켠다. 송신측(`arm()`)에서 `storyId` 전송 자체를 없애는 방식은 "다른 컴포넌트로 이동하면서 예전에 보던 스토리를 복원"하는 기존 요구사항까지 함께 깨뜨리므로 과도한 수정이다. 버그는 "같은 컴포넌트" 케이스에만 있으므로 수신측 판정 하나만 좁히는 것이 최소 변경.
- 참고로 `pane-target.ts`의 `paneTargetOfShellRoute`는 이미 이 문제를 한 번 인지하고 `storyId: null`로 만들어 피해간 자리였다 — 같은 파일 안에 이미 정답 패턴과 문제 패턴이 공존하고 있었다.

## 정리

- 상태를 "생성 시점에 얼려서 저장"하는 값(스냅샷)과 "지금 실제 화면"을 나타내는 값(정본)이 다른 저장소에 따로 존재할 때는, 어느 쪽이 판정 기준인지 매 사용처마다 명시적으로 골라야 한다. 섞어서 조건식에 넣으면 한쪽이 오래된 값으로 다른 쪽을 밀어버리는 사고가 난다.
- 같은 파일 안에서 이미 한 함수(`paneTargetOfShellRoute`)가 이 문제를 피해간 패턴을 갖고 있었는데, 다른 함수(`paneTargetOfRun`/`paneTargetOfSeed`)는 그 패턴을 따르지 않았다. 비슷한 값을 만드는 여러 헬퍼가 있으면, 그중 하나가 채택한 안전장치를 나머지도 따르는지 점검할 가치가 있다.
