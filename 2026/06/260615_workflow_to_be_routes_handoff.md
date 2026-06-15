---
draft: true
type: "content"
domain: "frontend"
category: "routing"
topic: "백엔드가 오기 전에 워크플로우 TO-BE 라우트를 스텁으로 먼저 확정하고, placeholder를 데이터 계약 문서로 쓰기, 그리고 도메인 용어 Phase→Stage·Task→Action 리네임"

updatedAt: "2026-06-15"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "nextjs-app-router"
  - "route-stub"
  - "backend-handoff"
  - "data-contract"
  - "placeholder-as-spec"
  - "domain-rename"
  - "adapter-layer"

relatedCategories:
  - "architecture"
  - "nextjs"
  - "typescript"
---

# 백엔드가 오기 전에 TO-BE 라우트를 먼저 확정하기

> 워크플로우 도메인이 백엔드와의 핸드오프를 앞두고 있어서, FE 쪽에서 TO-BE 라우트 구조와 도메인 용어를 먼저 잡아뒀다. 핵심은 스텁 화면을 그냥 빈 페이지로 두지 않고, 각 라우트가 필요로 하는 데이터를 표로 드러내 그 자체가 백엔드가 채울 스펙이 되게 한 것이다.

## 배경

워크플로우 도메인은 곧 백엔드 데이터 모델과 맞물려야 하는데, 그쪽이 아직 준비 전이다. 여기서 선택지는 두 가지다. 백엔드가 올 때까지 FE를 멈추거나, FE가 먼저 TO-BE 형태를 확정해두고 백엔드가 그 모양에 합류하게 하거나. 오늘은 후자를 골랐다.

다만 후자에는 위험이 있다. 백엔드가 안 정해진 상태에서 FE가 앞서 나가면, 나중에 합류할 때 충돌 표면이 넓어진다. 그래서 오늘의 진짜 주제는 단순히 "라우트를 만든다"가 아니라, "백엔드와의 충돌 표면을 최소로 가두면서 TO-BE를 선반영하는 방법"이었다. 오전에는 라우트 골격과 데이터 계약을 스텁으로 잡았고, 오후에는 도메인 용어를 TO-BE에 맞게 리네임했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- App Route 스텁 추가 및 백엔드 핸드오프 준비
  - 라우트 세그먼트를 재편했다. 기존 `/projects/{id}/workflows/structure-overview`, `.../structural-safety-confirmation` 형태에서 중간의 `workflows` 세그먼트와 긴 slug를 걷어내고 `/projects/{id}/overview`, `/projects/{id}/issues`로 단순화했다. 내부 매핑도 slug 기반 Map에서 segment 기반 Map으로 바꿨고, breadcrumb 라벨 키도 같이 맞췄다.
  - TO-BE의 새 레벨인 노드와 액션 라우트를 스텁으로 추가했다. `.../nodes/{nodeType}`와 `.../nodes/{nodeType}/actions/{actionType}` 두 단계다.
  - 가장 핵심은 ToBeRoutePlaceholder 컴포넌트다. 스텁 화면을 빈 페이지로 두는 대신, 그 라우트가 받는 파라미터, 필요한 데이터 필드(field/type/source/note), 선행 조건(prerequisites), 관련 문서를 표로 렌더링하게 했다. 즉 placeholder 자체가 "백엔드가 무엇을 어떤 모양으로 채워야 하는지"를 화면에 드러내는 데이터 계약이 된다. 데이터가 준비되면 이 placeholder를 실제 뷰로 교체하면 된다.
  - 도메인 매핑을 명시적으로 박아뒀다. 코드의 task(= step)는 도메인의 action에 대응하고, sub_id는 stage(현행 workflowInstanceId), node는 신규 레벨이다. 현재 트리는 root > phase(stage) > step의 2단이라 node 레벨 데이터가 아직 없다는 점, action의 static type 노출이 필요하다는 점을 핸드오프 항목으로 표에 남겼다.
  - 현행 `tasks/{taskId}` 라우트는 일부러 라이브로 유지했다. information-items 딥링크가 거기에 걸려 있어서, 라우트와 필드명을 건드리면 기존 링크가 깨진다. 그래서 TO-BE는 스텁으로 자리만 잡고 라이브 경로는 보존했다.

- 워크플로우 용어 Phase→Stage·Task→Action 리네임
  - FE 도메인의 이름만 바꿨다. Phase를 Stage로, Task를 Action으로 통일했다. 생성 타입(maxflow.ts)과 백엔드는 건드리지 않았고, 그 사이를 transform과 queries가 어댑터로 흡수한다.
  - 백엔드 대기 대신 독립 진행을 골랐다. 근거는 충돌이 나더라도 그 표면이 transform/queries 두 군데로 한정돼 작다는 점이었다. 충돌 비용이 작으니 먼저 가도 된다고 판단했다.
  - 범위를 의도적으로 좁혔다. 이번엔 타입, 컴포넌트, 파일명만 바꿨다. 필드명(tasks/taskId/phaseId), 신규 WorkflowNode 도입, transform의 3단화는 백엔드 어댑터와 함께 후속으로 미뤘다. 라우트의 `tasks/[taskId]`도 information-items 딥링크 보존을 위해 그대로 뒀다.
  - 방식은 기계적으로 갔다. PascalCase는 일괄 sed로 치환하고, import path를 맞춘 뒤 파일 9개를 mv로 옮겼다.
  - 검증: typecheck와 eslint 0 에러, 유닛 360건 통과. analyze 23건 실패는 이번 변경과 무관한 기존 trace ENOENT라 미변경으로 확정했다.

## 정리

오늘 두 작업을 관통하는 한 줄은 "백엔드가 아직 안 온 상태에서 FE가 먼저 TO-BE 형태를 확정해두기"다. 보통 백엔드가 없으면 FE도 멈추기 쉬운데, 그러지 않고 앞서 나가려면 두 가지 안전장치가 필요했다.

첫째는 스텁을 빈 페이지가 아니라 데이터 계약으로 만든 것이다. ToBeRoutePlaceholder가 각 라우트의 필요 데이터를 field/type/source/note 표로 드러내니까, 이 화면이 곧 백엔드가 채울 스펙 문서가 된다. 빈 placeholder는 "여기 뭔가 올 거다"까지만 말하지만, 데이터 계약을 박은 placeholder는 "여기 무엇이 어떤 모양으로 와야 하는지"까지 말한다. 핸드오프 문서를 따로 쓰는 대신 화면 자체가 살아있는 스펙이 되는 셈이라, 코드와 계약이 어긋날 일이 줄어든다.

둘째는 용어 리네임을 어댑터 뒤에 가둔 것이다. Phase→Stage, Task→Action을 바꾸되 생성 타입과 백엔드는 건드리지 않고 transform/queries가 그 차이를 흡수하게 했다. 그래서 독립 진행을 골라도 백엔드와의 충돌 표면이 딱 두 군데로 좁혀진다. "먼저 가도 되는가"의 답은 용기가 아니라 충돌 비용의 크기에서 나왔다. 비용이 작다는 걸 어댑터 경계로 먼저 확인했기 때문에 대기 대신 진행을 고를 수 있었다.

라이브 라우트(tasks/[taskId])를 일부러 안 건드린 것도 같은 결이다. TO-BE를 선반영한다고 해서 현행 딥링크까지 깨면 안 되니까, 새 구조는 스텁으로 자리만 잡고 살아있는 경로는 보존했다. 미래를 앞당겨 그리되 현재를 깨지 않는 선을 어디에 긋느냐가 오늘 내내 반복된 판단이었다.
