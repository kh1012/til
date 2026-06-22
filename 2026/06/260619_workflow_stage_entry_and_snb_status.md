---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "워크플로우 네비게이션 화면의 진입 경험을 다듬기 — 우측 스테이지 라우트 셸을 useQuery early return에서 useSuspenseQuery + 선언적 Suspense/ErrorBoundary로 바꾸고, 노드 클릭 시 actionId 없이 빈 콘텐츠가 뜨던 문제를 첫 액션 자동 선택으로 메우고, 좌측 SNB가 임시 SnbStatus 중간 레이어를 거치지 않고 WorkflowItemStatus를 직접 받게 정리하면서, 서브아이템 라벨 폰트 크기 실험은 적용했다가 환원하기"

updatedAt: "2026-06-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "usesuspensequery"
  - "error-boundary"
  - "declarative-async"
  - "auto-navigation"
  - "status-mapping-layer"
  - "router-replace"

relatedCategories:
  - "react-query"
  - "typescript"
  - "refactoring"
---

# 워크플로우 스테이지 진입을 선언적으로, SNB 상태를 직결로

> 워크플로우 화면은 좌측 SNB 트리(stage > node > action, 항목마다 상태 아이콘)와 우측 스테이지 콘텐츠로 이뤄진다. 이날 오전 후반은 이 진입 경험을 세 갈래로 다듬었다. 우측 스테이지 셸의 비동기를 useQuery early return에서 useSuspenseQuery + 선언적 경계로 바꾸고, 노드를 클릭했는데 actionId가 없어 빈 화면이 뜨던 구멍을 첫 액션 자동 선택으로 메웠다. 좌측 SNB는 의미 없던 SnbStatus 중간 레이어를 걷어내고 WorkflowItemStatus를 직접 받게 했다. 그 사이 서브아이템 라벨 폰트 크기 실험은 한 번 적용했다가 다시 환원했다.

## 배경

워크플로우 네비게이션은 두 패널이 한 쌍으로 움직인다. 좌측 SNB는 stage > node > action 위계를 트리로 펼치고 항목마다 상태 아이콘을 띄우는 길잡이고, 우측 스테이지 영역은 그 트리에서 고른 지점의 실제 콘텐츠를 그리는 자리다. 사용자는 트리를 클릭해 이동하고, 셸은 그 지점의 데이터를 비동기로 불러와 콘텐츠를 채운다.

이 한 쌍에 거슬리는 자국이 셋 있었다. 첫째, 우측 셸의 비동기 처리가 useQuery에 isLoading/isError early return을 늘어놓는 명령형 방식이라, 데이터가 보장되는 지점이 코드에서 한눈에 안 잡혔다. 둘째, 보드에서 NodeCard를 클릭하면 actionId 없는 URL로 진입해 우측이 빈 콘텐츠로 남았다. 셋째, 좌측 SNB가 WorkflowItemStatus를 toSnbStatus()로 한 번 변환해 SnbStatus라는 별도 타입으로 받고 있었는데, 이 중간 레이어가 실질적으로 하는 일이 없는 임시 껍데기였다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- SNB 서브아이템 라벨 폰트 크기 실험 후 환원
  - 오전 중 서브아이템(액션) 라벨에 text-xs를 적용해 상위 항목과 크기로 위계를 주려고 시도했다. 그런데 잠시 뒤 다시 걷어냈다. 크기로 위계를 표현하는 게 이 자리에서는 득보다 손이라고 판단해, 폰트 크기 지정 없이 기본 크기로 되돌렸다. 들였다 뺀 한 줄이지만, 위계 표현을 크기에 맡길지 다른 단서에 맡길지 한 번 가늠해 본 흔적이다.

- workflow-stage-route-shell을 useSuspenseQuery + 선언적 경계로 전환
  - 우측 셸의 비동기를 명령형에서 선언형으로 바꿨다. useQuery + isLoading/isError early return 패턴을 useSuspenseQuery로 교체하고, 로딩과 에러는 컴포넌트 본문이 아니라 바깥 경계가 책임지게 했다. 외부 셸에 ErrorBoundary(key=retryKey)와 Suspense를 두고, retryKey를 올리면 ErrorBoundary가 재마운트되며 그것이 곧 재시도가 되도록 묶었다. 내부 Content는 데이터가 보장된 뒤에만 렌더하되 workflow가 null인 경우를 가드해 훅 규칙을 지켰다. 그 결과 isLoading prop을 WorkflowStageWorkspace로 내려주던 배선과 ViewStateTransition을 함께 제거할 수 있었다. 데이터가 있는 성공 경로만 본문에 남고, 없는 경우는 전부 경계가 떠안는 모양이 됐다.

- SnbStatus 중간 레이어 제거 및 WorkflowItemStatus 직접 연결
  - 좌측 SNB의 임시 변환 계층을 걷어냈다. SnbStatus가 의미 없는 중간 레이어라는 피드백에 따라 toSnbStatus() 변환을 전부 제거하고, SNB 컴포넌트(Item/SubItem/StatusIcon)가 WorkflowItemStatus 값을 직접 수신하게 했다. 변환을 없애니 그동안 가려져 있던 빈틈도 드러났다. approved 상태에는 아이콘이 아예 없었던 것이라, lucide의 Check 아이콘을 추가했다. 변환 계층이 쓰던 옛 조건 값도 도메인 값에 맞춰 locked는 blocked로, done은 approved로 갱신했다.

- 노드 진입 시 첫 번째 액션 자동 선택
  - 빈 콘텐츠 구멍을 메웠다. 보드에서 NodeCard를 클릭하면 actionId 없는 /nodes/{nodeId} URL로 진입하는데, step definition의 contents가 비동기로 로드되기 전까지는 actions가 확정되지 않아 자동으로 이동할 데가 없었고, 그래서 우측이 빈 채로 남았다. onAutoNavigateToFirstAction 콜백을 신설하고 WorkflowStageWorkspace의 useEffect가 이를 감지하게 했다. 감지 deps를 activeNode.actions?.[0]?.id로 두어 비동기 로드가 끝나 첫 액션 id가 생기는 순간 자동으로 트리거되게 했고, actionId가 설정된 뒤에는 guard로 조기 반환해 중복 이동을 막았다. 이동 방식은 router.push와 replace를 두고 replace를 택했는데, 자동 이동이 히스토리를 오염시키면 뒤로 가기 동선이 꼬이기 때문이다.

## 정리

이날 오전 후반을 관통하는 한 줄은 "진입 순간에 사용자가 빈 화면이나 추측을 마주하지 않게 만들기"다. 세 작업이 표면적으로는 따로지만, 모두 워크플로우 화면에 들어선 직후의 경험을 매끄럽게 하는 데 모인다.

선언적 전환은 그 중 가장 구조적인 수확이었다. useQuery에 early return을 늘어놓는 방식은 본문이 로딩, 에러, 성공 세 상태를 다 떠안아서 "지금 데이터가 있나"를 매 줄 되묻게 한다. useSuspenseQuery로 바꾸고 로딩과 에러를 바깥 경계로 밀어내자, 본문에는 데이터가 보장된 성공 경로만 남았다. 재시도조차 retryKey로 ErrorBoundary를 재마운트하는 선언적 장치로 표현해, 상태 분기를 명령형으로 적는 대신 경계의 모양으로 드러냈다. 같은 방향의 일이 자동 이동이다. 노드에 들어섰는데 actionId가 없어 빈 화면이 뜨는 건 사용자에게 "여기서 뭘 눌러야 하나"를 떠넘기는 일이라, 비동기 로드가 끝나는 순간 첫 액션으로 자동 이동시켜 그 빈틈을 메웠다. push가 아니라 replace를 고른 건 자동 동작이 사용자의 뒤로 가기 기대를 망치지 않게 하려는 작은 배려였다.

SnbStatus 제거는 결이 조금 다르지만 같은 정리벽의 연장이다. WorkflowItemStatus를 SnbStatus로 한 번 변환해 받는 중간 레이어는 의미 없는 환승역이었고, 그걸 걷어내 SNB가 도메인 상태를 직접 받게 했다. 변환을 없애자 approved에 아이콘이 빠져 있던 빈틈이 드러난 것은 덤이었다. 중간 레이어가 있을 때는 그 변환이 무언가를 채워주는 듯 보였지만, 실제로는 빈틈을 가리고만 있었던 셈이다. 그 사이 라벨 폰트 크기를 들였다 뺀 것은 작지만 정직한 흔적이다. 위계를 크기로 표현해 볼까 시도했다가, 이 자리에는 맞지 않는다고 보고 곧바로 환원했다. 큰 구조 정리와 작은 스타일 가늠이 한 오전에 함께 있었다.
