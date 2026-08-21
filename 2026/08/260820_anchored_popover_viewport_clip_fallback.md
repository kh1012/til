---
type: "content"
domain: "frontend"
category: "ui-ux"
topic: "앵커 팝오버가 뷰포트를 벗어나거나 짤릴 때 캔버스 상단 중앙으로 되돌리는 opt-in fallback"
updatedAt: "2026-08-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "popover"
  - "positioning"
  - "viewport-clip"
  - "getBoundingClientRect"
  - "opt-in-prop"

relatedCategories:
  - "react"
---

# 앵커 팝오버가 뷰포트를 벗어나거나 짤릴 때 캔버스 상단 중앙으로 되돌리는 opt-in fallback

> maxflow의 `AnchoredPopover`는 앵커 상대 배치만 하던 컴포넌트였다. "요소를 찍어 노트를 남기는" 캔버스 위 노트 폼(`NoteForm`)에서, 스크롤로 앵커가 화면 밖으로 밀려나거나 팝오버 자체가 짤리는 문제가 나왔고, 해결책은 전역 동작을 바꾸는 대신 선택적 `containerRef` prop 하나로 그 호출부만 다른 동작을 갖게 하는 것이었다.

## 배경

`AnchoredPopover`는 여러 곳(뱃지 팝오버, 노트 폼 등)에서 재사용되는 공용 컴포넌트다. 요청은 구체적이었다 — "이 컴포저가 생겨날 때, viewport를 벗어나거나 영역이 짤리면 현 캔버스 영역의 상단 중앙에 일정 여백(top-4 정도) 띄우고 팝업되게 해줘." 캔버스 위에서 요소를 찍고 노트를 다는 워크플로 특성상, 스크롤이 길게 밀려나면 앵커도 함께 화면 밖으로 나가버리는 게 일반적인 상황이었다.

## 핵심 내용

**fallback 트리거는 두 조건의 OR.** 앵커가 뷰포트 밖으로 나간 경우와, 앵커는 화면 안에 있지만 위/아래 어느 쪽으로 배치해도 패널이 다 안 들어가 스크롤이 생기는(짤리는) 경우는 서로 다른 상황이라 따로 계산해야 했다.
```ts
const anchorOutOfViewport =
  rect.bottom < 0 || rect.top > window.innerHeight ||
  rect.left + rect.width < 0 || rect.left > window.innerWidth;
const clipped = shownHeight < height;
if (containerRect && (anchorOutOfViewport || clipped)) { /* fallback */ }
```
`shownHeight`는 기존 배치 로직이 이미 `maxHeight`로 클램프한 값이라 `height`(패널 실제 높이)와 비교하는 것만으로 짤림을 감지할 수 있었다 — 별도 감지 로직을 새로 안 만들고 기존 계산 결과를 재사용.

**전역 동작을 바꾸지 않고 opt-in prop으로 격리.** `containerRef?: RefObject<HTMLElement | null>`를 선택적으로 받아, 이 값이 없는 기존 호출부(뱃지 팝오버 등)는 코드 변경 없이 그대로 동작한다. 값이 있는 호출부(노트 폼)만 `containerRect.top + FALLBACK_TOP_OFFSET`으로 캔버스의 "스크롤되지 않는 뷰포트 자신"(`canvasRef`) 상단 중앙에 재배치된다. 새 기능을 추가하면서 기존 사용처의 회귀 위험을 아예 차단하는 방식 — 조건 분기가 아니라 prop의 유무 자체가 게이트다.

**여백 상수는 매직 넘버 대신 이름 + 근거 주석.** `FALLBACK_TOP_OFFSET = 16`을 선언하면서 "top-4(1rem), 뷰포트를 벗어난 앵커를 캔버스 영역 위쪽으로 되돌려 앉힐 때 위에 두는 여백"이라는 주석을 바로 옆에 남겼다 — 숫자 자체보다 "왜 16인지"(요청의 top-4를 그대로 px로 옮김)가 나중에 값을 조정할 때 필요한 정보였다.

**effect 의존성 배열에 `containerRef` 추가를 잊지 않음.** `[anchor, panel]` → `[anchor, panel, containerRef]`. 새 조건 분기가 `containerRef.current`를 읽는 이상, 그 값이 바뀔 때도 재배치 로직이 다시 돌아야 하기 때문 — 새 prop을 쓰는 로직을 추가할 때 흔히 놓치는 지점이다.

## 정리

기존 컴포넌트에 새 동작을 얹을 때 "조건문으로 분기"보다 "선택적 prop으로 호출부를 나누는" 편이 안전하다는 걸 다시 확인했다. prop이 없으면 코드 경로 자체를 안 타므로 기존 호출부의 회귀 테스트가 필요 없어진다. 또 fallback 조건은 하나가 아니라 "밖으로 나감"과 "짤림"이라는 서로 다른 실패 모드였고, 이미 계산해둔 `shownHeight` 같은 중간값을 재사용하면 새 감지 로직을 따로 만들 필요가 없었다.
