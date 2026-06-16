---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "어제 step을 action으로 잘못 명명한 것을 node로 정정하고, 도메인 위계를 stage > node > action 3단으로 못박은 뒤, 비워뒀던 action 층을 node 하위에 실제로 깔고 정보폼을 node·action 공용 쿼리로 일원화하기"

updatedAt: "2026-06-16"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "domain-model"
  - "information-architecture"
  - "naming-rename"
  - "url-routing"
  - "path-to-query"
  - "snb-tree"
  - "adapter-fallback"

relatedCategories:
  - "routing"
  - "nextjs"
  - "typescript"
---

# step의 정체를 node로 바로잡고 그 아래 action을 새로 두기

> 어제 워크플로우 용어를 Task→Action으로 리네임했는데, 도메인 위계를 다시 그려보니 한 칸 잘못 끼웠다는 걸 알았다. 현행 step은 action이 아니라 node였고, action은 그보다 한 단 아래 node의 잎이었다. 오늘은 이 어긋남을 바로잡고, 비워뒀던 action 층을 안전하게 깔고, 정보폼을 node·action이 공유하도록 일원화하는 데까지 갔다.

## 배경

어제 워크플로우 도메인 용어를 Phase→Stage, Task→Action으로 리네임했다. 그게 자연스러워 보였는데, 오늘 아침 도메인 위계를 stage > node > action 3단으로 다시 그려보니 절반이 틀렸다. 현행 step 레벨을 action이라고 불렀는데, 도메인상 그건 action이 아니라 node였다. action은 그보다 한 단 아래, node의 선택적 잎으로 새로 들어와야 하는 레벨이었다.

이름 하나를 한 칸 잘못 끼우면 그 위에 쌓는 모든 게 한 칸씩 어긋난다. 그래서 오늘의 진짜 주제는 "코드를 더 쌓기 전에 어제 이름을 되돌리고, 그 다음에야 진짜 action 층을 깐다"였다. 오전에는 정정과 통일(action→node, URL, 모델·핸들러), 오후에는 신설(node 하위 action 층)과 마무리(정보폼 일원화)로 갔다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- WorkflowAction을 WorkflowNode로 정정
  - 어제 step 레벨을 action으로 명명한 게 틀렸다는 판단이 출발점이다. step은 도메인상 node이므로, 어제 만든 WorkflowAction* 심볼 전부를 WorkflowNode*로 되돌렸다(심볼 33파일, 파일명 10개 리네임). 순수 리네임으로 가둬 런타임·URL 동작은 그대로 뒀다(tasks 라우트·taskId 필드 유지). 도메인 action은 "추후 node 하위 optional 잎으로 신규 도입"으로 미뤄, 오후 작업의 자리만 비워뒀다.

- 워크플로우 URL 세그먼트 tasks→nodes 전환
  - node=현행 step 확정에 맞춰 URL도 정정했다. `/workflows/{id}/tasks/{stepId}` → `/workflows/{id}/nodes/{stepId}`. 빌더·파서 세그먼트만 바꾸고 내부 selection 필드 taskId는 유지해서 동작은 동일하게 뒀다. nodes 스텁 placeholder를 실뷰(WorkflowNodeRouteShell)로 승격하고 info-items를 nodes 하위로 옮겼다. 정보폼 경로→쿼리는 뒤 단계로 분리했다.

- task→node 도메인 모델·핸들러·라우트 통일
  - 필드 tasks→nodes, taskId→nodeId, 핸들러 onSelectTask→onSelectNode 등 도메인 전반을 node로 통일했다. 다만 보존 경계를 의도적으로 그었다. i18n 메시지 키(taskWorkspace 등 UI 카피), 테스트 데이터값(NewTask/ReviewTask는 백엔드 step id), CSS 유틸은 일부러 안 건드렸다. 리네임이 닿는 곳과 닿지 않는 곳을 명시적으로 구분한 것이다.

- node 하위 action 층 데이터·라우팅 신설
  - 비워뒀던 action 층을 실제로 깔았다. WorkflowAction 타입과 WorkflowNode.actions를 두고, transform이 step.children를 node.actions로 채우게 했다. 핵심은 안전 동작이다. 현 백엔드 계약엔 children이 없어서, 없으면 빈 배열로 멀쩡히 돌도록 설계했다. URL은 `/nodes/{node}/actions/{action}`를 추가하고, 액션 라우트 스텁을 실뷰로 승격했다.

- 액션 콘텐츠 영역 분리
  - node·action 페이지 공용 워크스페이스가 actionId로 활성 액션을 찾아 콘텐츠를 분기하도록 전환했다. 액션 전용 WorkflowActionContent를 신설하되 정보폼은 기존 WorkflowStepInformationForms를 재사용하고 action을 node 모양으로 어댑트했다. 액션 데이터가 없으면 노드 콘텐츠로 폴백해 무손상으로 뒀다.

- 좌측 SNB를 스테이지 트리로 전환
  - SNB를 'stage의 노드 목록'에서 'stage > node > action' 3단 트리로 확장했다. 노드 active는 액션 미선택 시에만, 액션 active는 actionId 일치 시로 갈랐다. 스테이지 전환이나 노드 선택 시 노드가 액션 컨테이너면 첫 액션을, 아니면 노드 페이지를 열도록 했다(스테이지는 전용 페이지 없음). 라벨은 action.label → actions.{id} → 식별자 순 폴백 헬퍼로 해석한다.

- 정보폼·필드를 경로에서 쿼리로 전환
  - 정보폼 딥링크를 `/nodes/{n}/information-items/{infoId}?field-id=` 경로에서 노드·액션 공통 쿼리 `?information-item=&field-id=`로 일원화했다. field-id는 이미 쿼리였고 information만 경로로 남아 있던 걸 쿼리로 옮긴 것이다. 덕분에 node든 action이든 같은 쿼리로 정보폼을 딥링크할 수 있게 됐고, information-items 라우트 디렉토리는 삭제했다.

## 정리

오늘 이 작업들을 관통하는 한 줄은 "한 칸 잘못 끼운 추상화 레벨을 바로잡고, 비워뒀던 칸을 안전하게 채우기"다.

어제는 step 레벨을 action이라고 불렀다. 자연스러워 보였지만 위계를 stage > node > action으로 다시 그려보니 step은 node였다. 이름을 한 칸 잘못 끼우면 그 위에 쌓는 게 전부 한 칸씩 어긋나므로, 오늘 첫 일은 코드를 더 쌓기 전에 어제 이름을 되돌리는 것이었다. 되돌리는 비용이 작았던 건 어제 리네임을 순수 리네임으로(런타임·URL 동작 불변) 가둬뒀기 때문이다. 어제 충돌 표면을 좁혀둔 선택이 오늘 정정을 싸게 만들었다.

이름을 바로잡고 나서야 진짜 action 층을 깔 수 있었다. 여기서 신경 쓴 건 "백엔드가 아직 children을 안 준다"는 현실이었다. 그래서 transform이 children을 node.actions로 옮기되 없으면 빈 배열로 동작하게 했고, 워크스페이스도 액션 데이터가 없으면 노드 콘텐츠로 폴백하게 했다. 위계는 미리 3단으로 그려두되, 데이터가 비어도 2단처럼 멀쩡히 도는 구조다. 어제의 "스텁을 데이터 계약으로" 발상이 오늘은 "빈 층을 안전하게 미리 깔기"로 이어졌다.

마지막 정보폼 일원화는 위계 변경의 마무리다. node와 action이 같은 정보폼을 공유해야 하는데, information만 URL 경로에 박혀 있으면 둘이 따로 놀게 된다. 경로에서 쿼리로 빼니 node든 action이든 같은 쿼리로 딥링크가 된다. 위계를 한 단 늘렸으면 그 위계를 가로지르는 공통 관심사는 경로가 아니라 쿼리로 빼야 공유가 깨지지 않는다는 걸 다시 확인했다.
