---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "설계 워크플로우 라우팅을 공통 layout으로 승격해 뷰어 리마운트를 막고 렌더러를 node id로 매핑하며, SNB/노드 상태 색상을 SSOT 기준으로 정리"
updatedAt: "2026-07-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "nextjs-layout"
  - "remount"
  - "renderer-registry"
  - "ssot"
  - "status-color"
  - "useParams"

relatedCategories:
  - "react"
  - "design-system"
---

# 설계 워크플로우 라우팅·렌더러·상태 색상 정리

> 노드/액션 전환 때마다 3D 뷰어가 통째로 리마운트되던 문제를 공통 layout으로 풀고, workflowId 대신 node id로 렌더러를 매핑하며, SNB와 노드 상태 색상을 SSOT 하나로 통일한 곁가지 작업 기록.

## 배경

도면 워크스페이스와 별개로, 설계 워크플로우 뷰어 쪽에서 라우팅 구조와 상태 표현에 누적돼 있던 문제들을 정리했다. 라우트가 바뀔 때마다 뷰어가 깜빡이는 리마운트 문제, 렌더러 레지스트리가 실제 온톨로지 구조와 안 맞는 문제, 그리고 상태 색상이 여러 곳에서 제각기 매핑되던 문제가 대상이었다.

세 가지 모두 "중복된 소스를 하나로 모으거나, 잘못된 축으로 분기하던 걸 올바른 축으로 바꾸는" 성격의 구조 정리였다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- SNB Collapsed 상태 dot 색상 톤 반영
  - 선택된 노드/액션 원이 accent-foreground(거의 검정) 배경을 오용해 검정으로 보이던 걸 accent 색상으로 교체했다. 나머지 원은 collapsedDotClass의 중복 색상 매핑을 걷어내고 SnbStatusIcon SSOT(getWorkflowStatusDotClass)를 재사용해 실제 노드/액션 상태 색상을 85% 오파시티로 표시하도록 통일.

- 노드/액션 라우트 공통 layout 도입해 design-web 뷰어 리마운트 방지
  - SNB에서 노드/액션을 전환할 때마다 공통 layout.tsx가 없어 WorkflowStageRouteShell 이하 전체 서브트리(DesignAdapter의 3D 뷰어 포함)가 매번 unmount에서 remount되며 화면이 깜빡였다. nodes/ 아래 layout.tsx를 신설해 WorkflowStageRouteShell을 그 레벨로 승격하고, nodeId/actionId/fieldId/informationId는 useParams/useSearchParams로 클라이언트에서 직접 읽게 전환해 같은 stage 안에서는 라우트가 바뀌어도 뷰어가 유지되게 했다.

- 워크플로우 작업필요 상태 색상 회색으로 변경
  - todo/output_ng/execution_failed(작업필요) 상태의 danger 톤을 st-destructive(빨강)에서 st-muted-foreground(회색)로 바꿨다. SnbStatusIcon SSOT와 노드 hover 카드(경계선·아이콘·설명 텍스트·선행작업 목록·상태 배지)까지 일관되게 회색 계열로 반영.

- 설계 패키지 렌더러를 workflowId 대신 node id로 매핑
  - STAGE_WORKSPACE_RENDERERS(workflowId 기반)는 등록 엔트리가 design 패키지 하나뿐이었는데, StructuralDesignWorkflow/ApartmentStructuralDesignWorkflow/FactoryStructuralDesignWorkflow가 DesignTargetReview·RCDesign·SteelDesign 같은 stepId를 그대로 재사용하는 백엔드 온톨로지 구조라 workflowId로 분기할 이유가 없었다. NODE_WORKSPACE_RENDERERS(node id 기반) 단일 레지스트리로 합쳐, 상위 워크플로우가 무엇이든 노드 id만 맞으면 설계 패키지가 뜨도록 했다.

## 정리

이 갈래의 세 작업은 표면적으로는 리마운트, 렌더러, 색상으로 다르지만 뿌리는 같다. 잘못된 축이나 중복된 소스를 하나의 올바른 기준으로 모으는 것.

리마운트 문제는 Next.js App Router에서 공통 부모가 layout.tsx로 표현되지 않으면, 자식 라우트가 바뀔 때 공유돼야 할 서브트리까지 재생성된다는 걸 다시 보여줬다. 뷰어처럼 마운트 비용이 큰 서브트리는 반드시 공통 layout 레벨로 올리고, 세부 파라미터는 그 아래에서 useParams로 읽어야 한다. "무엇이 유지되고 무엇이 바뀌는가"를 라우트 트리 구조로 명시하는 게 핵심이었다.

렌더러 매핑은 백엔드 온톨로지를 이해하고 나서야 옳은 축이 보였다. 여러 상위 워크플로우가 같은 stepId를 재사용하는 구조라면 분기 기준은 상위(workflowId)가 아니라 노드 자신(node id)이어야 한다. 등록 엔트리가 하나뿐이라 workflowId 분기가 사실상 무의미했다는 점이 그 방증이었다.

색상 두 건은 모두 SnbStatusIcon SSOT(getWorkflowStatusDotClass)로 수렴시켰다는 게 요점이다. 상태 색을 여러 곳에서 각자 매핑하면 오늘처럼 한 곳(collapsed dot)만 accent-foreground를 오용해 검정으로 튀는 일이 생긴다. 색을 바꿀 일이 생기면 SSOT 한 곳만 고치면 되도록 매핑을 한 함수로 모으는 게 결국 정답이었다.
