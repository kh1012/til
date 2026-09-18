---
type: "content"
domain: "frontend"
category: "state-management"
topic: "서버가 이미 큐잉으로 막아주는 조건을 클라이언트에서 다시 막으면, 안전은 그대로고 대기 시간만 늘어난다"
updatedAt: "2026-09-17"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "instant-run"
  - "client-side-blocking"
  - "server-queue"
  - "redundant-guard"
  - "derived-state"

relatedCategories:
  - "server-state"
  - "ui-ux"
---

# 서버가 이미 큐잉으로 막아주는 조건을 클라이언트에서 다시 막으면, 안전은 그대로고 대기 시간만 늘어난다

> atelier instant-run 버튼의 "이미 실행 중입니다" 차단은 서버 큐(agent-run-queue.ts)가 이미 같은 대상 파일 충돌을 막고 있었기 때문에, 클라이언트 쪽 차단은 안전에 아무 기여 없이 사용자 대기 시간만 늘리고 있었다.

## 배경

- atelier의 instant-run 버튼(header, meta-card, entry 메뉴, canvas element-pick 등 5곳)은 `instant-run-blocked.ts`의 `instantRunBlockReason` 함수 하나를 공유해서 비활성 사유를 계산했다.
- 이 함수는 두 조건으로 차단했다: 세션 용량 초과(`capacityFull`), 그리고 같은 컴포넌트/스토리가 이미 실행 중인 경우(`activeRun` + `activeStoryId` 매칭).
- 두 번째 조건에는 정교한 예외 규칙도 있었다 — `activeStoryId`가 주어지고 실행 중인 스토리와 다르면 차단을 풀어서, 같은 컴포넌트라도 다른 스토리는 동시에 큐잉할 수 있게 해뒀다. `activeStoryId`가 없는 legacy 레코드나 split 연산은 컴포넌트 전체를 잠갔다.
- 사용자 피드백(2026-09-17): 같은 컴포넌트/스토리가 실행 중이어도 제출은 막지 말고 서버가 큐잉하게 두라는 요청.

## 핵심 내용

- 확인해보니 서버 쪽 `agent-run-queue.ts`가 이미 같은 대상에 대한 동시 실행을 큐에 넣어 파일 충돌을 막고 있었다. 클라이언트의 "이미 실행 중입니다" 차단은 이 서버 보장과 100% 겹치는 이중 검사였고, 실질적으로 하는 일은 사용자를 기다리게 만드는 것뿐이었다.
- 반면 세션 용량 초과(`capacityFull`)는 서버 큐잉으로 해결되는 문제가 아니라 하드 제약이므로 그대로 남겼다.
- 수정: `instantRunBlockReason`을 capacity-full 조건 하나만 검사하도록 단순화. `entry`, `activeStoryId` 파라미터는 5개 호출부의 시그니처를 건드리지 않기 위해 이름만 `_entry`, `_activeStoryId`로 바꿔 남기고 내부 로직에서는 쓰지 않게 했다.
- 이 로직이 순수 함수 하나로 추출되어 5개 소비 지점이 전부 그 함수 하나를 참조하는 구조였기 때문에, 수정 지점 하나만 고치면 header 버튼·meta-card·entry 메뉴·canvas pick이 동시에 풀렸다.
- 테스트는 스토리 매칭 경우의 수를 다루던 6개 케이스에서 capacity 여부만 보는 2개 케이스로 줄었고, 코드는 순 70줄 감소했다.

## 정리

- "안전을 위한 이중 검사"처럼 보이는 클라이언트 차단 로직을 만나면, 그 차단이 막으려는 위험을 서버가 이미 다른 메커니즘(여기서는 큐잉)으로 막고 있지는 않은지부터 확인한다. 중복 보장이면 클라이언트 로직은 안전에 기여 없이 사용자 대기만 늘리는 비용이다.
- 차단 판단을 여러 소비 지점에 흩어 두지 않고 순수 함수 하나로 뽑아 공유해 둔 구조 덕분에, 정책이 바뀌었을 때 한 곳만 고쳐도 전체 화면에 일관되게 반영됐다.
