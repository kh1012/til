---
type: "content"
domain: "frontend"
category: "state-management"
topic: "elementTarget 소유권 필터를 상속과 버튼 표시에 동시에 쓰다가 터미널 도킹 버튼이 눌러도 꺼지는 버그"
updatedAt: "2026-08-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "shared-state-ownership"
  - "universal-fallback"
  - "toggle-state-bug"
  - "regression-test"
  - "strict-equality-vs-inheritance-filter"

relatedCategories:
  - "react"
  - "testing"
---

# elementTarget 소유권 필터를 상속과 버튼 표시에 동시에 쓰다가 터미널 도킹 버튼이 눌러도 꺼지는 버그

> maxflow 갤러리에는 캔버스 위젯, 터미널 도킹 버튼, 여러 popover composer가 하나의 `elementTarget` 상태를 공유한다. "누가 지금 이 타겟을 소유하는가"를 판정하는 `ownsElementTarget()`이 상속 여부 판정과 버튼의 armed 표시 여부 판정에 동시에 쓰이면서, 캔버스가 armed일 때 터미널 도킹 버튼이 같이 눌린 것처럼 보이고 클릭하면 arm 대신 disarm이 발생하는 버그가 났다.

## 배경

reference-picker 컴포넌트를 수정하던 중 사용자가 "전체 페이지 타겟 지정과 상관없이" 터미널 버튼이 이상하게 동작한다고 보고했다. 8/21에 고쳤던 "terminal one-shot targeting" 회귀인가 의심하고 재확인에 들어갔는데, 실제로는 element target badge 자체는 정상 렌더링되고 있었다(그 부분은 오탐). 대신 도킹 버튼의 armed 표시와 클릭 핸들러 쪽에서 진짜 회귀가 하나 발견됐다.

## 핵심 내용

**`ownsElementTarget(armedBy, source)`는 캔버스를 "만능 소유자"로 취급하는 함수다.** `armedBy === source || armedBy === "canvas"`로 정의되어 있어서, 사용자가 캔버스에서 요소를 먼저 찍어두면 나중에 여는 어떤 에디터든(플러그인, instant-run composer 등) 그 pick을 자동으로 상속받을 수 있다. `DetailRoute.header.instant-run.composers`나 `PluginAgentEntryPoint`처럼 "이 popover가 나중에 열려도 캔버스 pick을 이어받아야 하는" 컨텍스트에서는 이 필터가 정확히 맞는 동작이다.

**문제는 터미널 도킹 버튼이 같은 필터를 그대로 재사용한 것.** `AgentDock.tsx`의 `pickerArmed`가 `ownsElementTarget(elementTarget.armedBy, "terminal")`로 계산되고 있었는데, `armedBy === "canvas"`인 경우도 이 식이 `true`를 반환한다. 그 결과 캔버스만 armed인 상태에서도 터미널 버튼이 "눌린 것처럼" 보였고, 버튼의 클릭 핸들러는 armed 표시를 보고 disarm을 호출하도록 짜여 있었으므로 — 캔버스 armed 상태에서 도킹 버튼을 누르면 캔버스+터미널 둘 다 꺼져버렸다(터미널이 소유권을 가져와서 다시 arm 되어야 정상).

**타겟 상속과 버튼 표시는 서로 다른 질문이라 필터도 달라야 했다.** 프롬프트에 넣을 target 값(`elementTarget` prop)은 계속 `ownsElementTarget`로 느슨하게 상속받아도 되지만, 버튼이 "지금 눌려있는가"를 보여주는 시각 상태는 `elementTarget.armedBy === "terminal"` 엄격 동등 비교로 바꿔야 했다. 즉 같은 전역 상태를 두 곳에서 읽더라도, "값을 물려받을지"와 "내가 소유자로 보일지"는 분리된 필터를 써야 한다는 것. 캔버스 위젯 쪽은 이미 반대 방향으로 `armedBy !== "terminal"`을 명시적으로 걸어 이 구분을 하고 있었는데, 터미널 도킹 버튼 쪽만 그 구분이 빠져 있었다.

**수정 후 회귀 테스트(A-E5)를 추가해 고정했다.** "캔버스 armed일 때 도킹 버튼은 안 눌린 상태여야 하고, 그 상태에서 한 번 클릭하면 캔버스→터미널로 소유권이 넘어가야 한다"를 E2E로 검증하는 테스트를 `agent-dock.spec.ts`에 추가하고, 픽스를 되돌리면 테스트가 실제로 실패하는 것까지 확인했다.

## 정리

여러 UI 컨슈머가 하나의 공유 상태를 "소유권 필터" 함수 하나로 걸러 쓰는 패턴에서는, 그 필터가 원래 어떤 목적(상속 vs 표시)으로 만들어졌는지를 재사용하는 쪽에서 다시 확인해야 한다. 같은 함수라도 컨텍스트마다 "느슨한 소속 판정"이 필요한 곳과 "엄격한 소유자 판정"이 필요한 곳이 갈릴 수 있고, 이 둘을 섞으면 토글 버튼류에서 특히 위험하다 — 표시 상태가 잘못되면 클릭 핸들러의 분기(arm/disarm)까지 같이 틀어지기 때문이다. "보인다"와 "소유한다"를 같은 조건식으로 계산하고 있다면 그 자체가 의심 신호다.
