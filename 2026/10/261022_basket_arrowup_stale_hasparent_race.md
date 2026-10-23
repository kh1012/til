---
type: "content"
domain: "frontend"
category: "state-management"
topic: "키보드와 버튼이 같은 상태값으로 게이트되면, 비동기로 늦게 도착하는 상태값 때문에 빠른 키 입력이 사라진다 — Atelier 바스켓 창 ArrowUp 부모 선택 race condition"
updatedAt: "2026-10-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "race-condition"
  - "keyboard-handler"
  - "async-state"
  - "atelier"
  - "basket-window"
  - "asymmetric-gating"

relatedCategories:
  - "react"
  - "testing"
---

# 키보드와 버튼이 같은 상태값으로 게이트되면, 비동기로 늦게 도착하는 상태값 때문에 빠른 키 입력이 사라진다 — Atelier 바스켓 창 ArrowUp 부모 선택 race condition

> `hasParent` 상태가 별도 메시지로 비동기 전달되는 구조에서, 빠르게 ↓ 다음 ↑를 누르면
> ArrowUp 핸들러가 이전 엘리먼트의 낡은 `hasParent` 값을 보고 요청을 버린다. 고친 방법은
> 버튼과 키보드의 게이트 조건을 다르게 둔 것 — 버튼은 `hasParent`를 확인하고, 키보드는
> 확인하지 않는다.

## 배경

`BrowserPane.basket.tsx`에서 요소를 고를 때 ArrowUp으로 부모 요소를 선택하는 기능이
간헐적으로 동작하지 않았다. 브레드크럼이 `#save`를 보여줘야 할 자리에 `#save › span`을
보여주는 e2e 실패로 발견됨.

## 핵심 내용

- `hasParent`는 선택이 바뀐 뒤 별도의 `pick-box` 메시지로 비동기 전달된다. 엘리먼트를
  고른 순간과 `hasParent` 값이 갱신되는 순간 사이에 시간차가 있다.
- 실패 시퀀스: `#save` 선택 → ArrowDown으로 자식 선택 → 응답이 오기 전에 바로 ArrowUp.
  이 시점의 `hasParent`는 아직 이전(부모) 엘리먼트 기준 값이라 ArrowUp 핸들러가 이
  낡은 값으로 분기한다. 값이 `false`였다면 요청 자체가 서버로 가지 않고 버려진다.
- 버튼 클릭 핸들러도 같은 `hasParent`로 게이트되어 있었지만, 버튼은 사용자가 한 번
  보고 누르는 단발 동작이라 값이 이미 안정된 뒤에 눌린다 — 같은 게이트라도 입력 특성이
  달라 실패 양상이 다르다.
- 수정: ArrowUp 핸들러에서 `if (hasParent)` 가드를 제거(`BrowserPane.basket.tsx:199`).
  키보드는 상태를 보지 않고 항상 부모 선택 요청을 보낸다. 버튼 클릭 쪽 가드는 그대로
  둔다 — 이것이 비대칭 게이팅.
- 비대칭이 안전한 이유: 요청을 받는 쪽(`pick-parent` 핸들러)이 부모가 없는 요청은
  응답 없이 조용히 거부한다. 키보드가 무조건 보내도 서버가 유효성을 검사하므로 잘못된
  상태로 넘어갈 일이 없다. 이 전제를 `browser-preload.session.ts` 문서에도 남겼다.
- 회귀 테스트: `hasParent:false`로 마운트한 뒤에도 키보드 ArrowUp이 `onParent`를
  호출하는지 확인하는 유닛 테스트 추가. e2e도 6/6(3회 반복 × 2세트) 통과 확인.

## 정리

- 버튼과 키보드처럼 같은 액션을 트리거하는 경로가 여럿이고 그 중 하나라도 비동기로
  늦게 갱신되는 상태를 게이트 조건으로 쓴다면, 모든 경로에 같은 게이트를 거는 것이
  오히려 버그다. 느린 입력(단발 클릭)과 빠른 입력(연속 키 입력)은 상태 신선도에 대한
  요구가 다르다.
- 게이트를 풀어도 되는 조건은 "요청을 받는 쪽이 잘못된 요청을 안전하게 거부하는가"다.
  서버/수신측이 이미 유효성 검사를 하고 있다면, 클라이언트 쪽 프리체크는 생략해도
  안전하고, 오히려 생략하는 쪽이 race condition을 없앤다.
