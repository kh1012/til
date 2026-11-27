---
type: "content"
domain: "frontend"
category: "state-management"
topic: "에이전트 커서 박스가 페이지 리로드 때 깜빡이던 문제 — scroll과 reload를 구분 못해 생긴 레이스를 frozen/hidden 상태 분리와 grace period로 고침"
updatedAt: "2026-11-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "state-machine"
  - "race-condition"
  - "mutation-testing"
  - "electron"
  - "grace-period"

relatedCategories:
  - "testing"
  - "performance"
---

# 에이전트 커서 박스 리로드 깜빡임 — scroll과 reload를 구분하는 상태 기계

> cursor.moving 신호 하나로 스크롤과 페이지 리로드를 둘 다 가리키고 있어서, 리로드 중 화이트스크린 구간에 박스가 사라졌다 나타났다 하는 문제를 frozen/hidden 상태 분리 + scroll 플래그 + 200ms grace period로 고쳤다.

## 배경

Plugin Builder의 agent-cursor 기능은 에이전트가 수정 중인 코드 위치를 화면에 박스로 표시한다. 기존 엔진은 `hidden` 플래그 하나로 "타이머를 멈춘다"와 "화면에서 안 보인다"를 동시에 표현했다. `cursor.moving` 메시지가 오면 무조건 이 플래그를 세워 박스를 숨겼는데, 이 메시지는 실제 스크롤에서도 오고 페이지 리로드로 뷰포트가 바뀔 때도 왔다. 리로드는 화이트스크린 구간이 350~500ms 걸리는데, 그동안 박스가 사라지고 리로드 diff가 도착해야 다시 나타나는 깜빡임이 프로덕션에서 관찰됐다.

## 핵심 내용

- **frozen과 hidden을 분리**: frozen은 타이머만 멈추고 화면엔 그대로 보이는 상태, hidden은 실제로 안 보이는 상태로 나눴다. 리로드 중엔 freeze만 하고 숨기지 않아야 깜빡임이 없다.
- **stale 상황을 세 가지로 구분**:
  - `doc`(새 문서 로드) → freeze만, hidden 안 함
  - `scroll`(실제 스크롤/리사이즈) → 즉시 hidden
  - `moving`(구버전 번들이라 scroll 플래그가 없어 판별 불가) → 200ms grace period 동안 기다렸다가, 그 사이 reload diff가 오면 `doc`으로, 안 오면 `scroll`로 확정
- **신호 쪽(bridge)도 같이 고침**: `cursor.moving` 메시지에 `scroll?: true` 플래그를 추가하고, `watch.pending()`으로 "리로드 후 첫 diff를 기다리는 중"인 구간을 판정해 그 구간엔 `cursor.moving` 자체를 보내지 않는다. 측정해보니 이 구간은 3~8ms 수준으로 짧다.
- **등장 시점도 조정**: 박스가 나타나는 시점을 segment 끝이 아니라 `T.move.settle`(커서가 안착하는 지점)로 계산해서, 커서가 처음 닿는 순간 더 일찍 보이게 했다.
- **mutation test로 조건의 필요성을 검증**: `why !== "scroll"` 조건을 일부러 지우고 테스트를 돌려, 23개 중 2개가 바로 실패하는 걸 확인했다. 조건을 지우면 리로드 중에도 박스가 숨겨지는 걸 테스트가 정확히 잡아낸다는 뜻이다.

## 정리

- 하나의 비동기 신호(`cursor.moving`)가 원인이 다른 두 이벤트(스크롤, 리로드)를 가리킬 때, 신호를 보내는 쪽에 플래그를 추가하는 방법과 신호를 받는 쪽에서 모호하면 잠깐 기다려보는 방법을 같이 썼다. 신호 쪽만 고치면 구버전 번들이 못 따라오고, 받는 쪽만 고치면 모든 경우에 불필요한 지연이 생긴다 — 두 방법을 동시에 넣어야 신버전은 즉시 판별하고 구버전은 grace period로 보완된다.
- mutation test(조건을 일부러 지워서 테스트가 깨지는지 보는 것)는 "이 조건을 지우면 실제로 버그가 재현되는가"를 직접 확인하는 방법으로 유효했다. 테스트가 통과한다는 것만으로는 그 조건이 꼭 필요한지 알 수 없는데, 지웠을 때 깨지는 걸 보고 나서야 조건의 존재 이유가 테스트에 반영돼 있음을 확인했다.
