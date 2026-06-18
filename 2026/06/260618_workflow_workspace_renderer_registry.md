---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "워크플로우 우측 패널의 stage·node별 분기를 if-else 조건 변수에서 STAGE/NODE 렌더러 레지스트리로 승격하고, 새 건축 모델러 노드를 그 레지스트리에 한 줄로 연결한 뒤, 실제 범위가 Stage인데 Node로 잘못 붙어 있던 컴포넌트·Shell·훅 식별자를 Stage 범위 이름으로 일괄 통일하기"

updatedAt: "2026-06-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "registry-pattern"
  - "declarative-branching"
  - "component-renderer-slot"
  - "adapter-connection"
  - "stage-scope-naming"
  - "open-closed-extension"

relatedCategories:
  - "react"
  - "typescript"
  - "refactoring"
---

# 워크스페이스 우측 패널 분기를 if에서 레지스트리로, 이름을 Stage 범위로 맞추기

> 워크플로우 우측 패널은 어떤 stage·노드를 클릭했는지에 따라 다른 화면을 보여줘야 한다. 처음엔 새 모델러 노드를 기존 패턴 그대로 if 분기로 붙였지만, 노드가 늘 때마다 workspace 본문을 고쳐야 하는 구조가 보였다. 그래서 곧바로 분기를 선언적 레지스트리로 승격하고, 새 노드를 그 레지스트리에 한 줄로 연결했다. 마지막으로 어제 끝낸 phase→stage 통일의 연장선에서, 실제 범위가 Stage인데 이름만 Node로 남아 있던 컴포넌트·Shell·훅을 Stage 범위 식별자로 정리했다.

## 배경

워크플로우 화면의 우측 패널(workspace)은 모든 stage·노드에 같은 기본 콘텐츠를 그리는 게 아니다. 설계 stage는 design-web 패키지를 통째로 띄우고, 특정 노드는 별도 어댑터(건축 모델러, CAD 웹)를 띄운다. 즉 "이 stage 또는 이 노드일 때는 기본 콘텐츠 대신 다른 걸 렌더한다"는 예외 분기가 점점 늘어나는 자리다.

기존 코드는 이 예외를 isDesignStage 같은 boolean 조건 변수로 만들고 JSX에서 삼항으로 늘어놓는 방식이었다. 예외가 한둘일 때는 읽혔지만, 오늘 새 노드를 붙이려는 순간 문제가 드러났다. 노드를 하나 추가할 때마다 조건 변수를 하나 더 만들고 삼항 사다리를 한 칸 더 늘려야 했다. workspace 본문이 분기 목록을 그대로 떠안는 구조라, 추가될수록 비대해지고 어디까지가 예외인지 한눈에 안 들어왔다.

또 하나 거슬렸던 건 이름이었다. 어제 phase를 stage로 통일하면서 위계를 stage > node > action으로 못박았는데, 정작 우측 패널 쪽 컴포넌트·Shell·훅은 여전히 WorkflowNode* 이름을 달고 있었다. 실제로 이들이 다루는 범위는 Stage 레벨(노드와 액션을 양쪽 다 처리)인데 이름만 Node여서, 읽는 사람이 범위를 매번 되짚게 만들었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- DrawingBasedModeling 노드에 건축 모델러 어댑터 연결
  - 트리에서 DrawingBasedModeling 노드를 클릭하면 우측 패널에 건축 모델러(@maxflow/modeler-arch)의 ArchModelerAdapter가 뜨도록 연결했다. 이 시점의 목표는 딱 렌더 연결까지였다. UI 제어(저장·네비게이션 연동)는 뒤로 미루고, 트리 클릭 시 모델러가 그려지는 경로만 먼저 관통시켰다. 구현은 의도적으로 기존 isDesignStage 패턴을 그대로 베껴 node.id === "DrawingBasedModeling" 조건 변수를 추가하는 if 분기로 했다. 다만 커밋 본문에 "다음은 이 if 분기를 노드 ID 기반 선언적 레지스트리로 교체"라고 곧바로 갚을 빚으로 명시해 뒀다.

- 우측 패널 분기를 레지스트리 패턴으로 교체
  - 바로 그 빚을 갚았다. isDesignStage / isDrawingBasedModeling 같은 조건 변수를 전부 없애고, 두 개의 렌더러 레지스트리 조회로 단일화했다. workflow-node-renderers.tsx를 새로 분리해 workflowId를 키로 하는 STAGE_WORKSPACE_RENDERERS와 node.id를 키로 하는 NODE_WORKSPACE_RENDERERS를 뒀다. 우측 패널에 주입되는 props는 WorkspaceSlotProps = { nodeId?: string } 한 형태로 통일했다. 조회는 Stage 레지스트리를 먼저 보고 없으면 Node 레지스트리를 보도록 || 로 우선순위를 명시했다. 결과적으로 새 노드를 붙일 때 workspace 본문은 손대지 않고 레지스트리에 한 줄만 추가하면 되는 구조가 됐다. 본문의 삼항 사다리는 CustomRenderer 한 슬롯으로 접혔다.

- Stage 범위 Shell 리네이밍 및 DrawingCleanup 렌더러 추가
  - 이름 정리를 시작했다. WorkflowNodeRouteShell을 WorkflowStageRouteShell로 바꿨다(파일명 포함 6개 참조 일괄 교체). 이 Shell이 실제로 하는 일은 Stage 단위 데이터 페칭과 네비게이션 핸들러 제공인데 이름이 Node여서 범위가 모호했기 때문이다. 같은 김에 방금 만든 레지스트리에 DrawingCleanup 노드 → CadWebAdapter 매핑을 한 줄 추가했다. 레지스트리 구조가 약속한 "한 줄 추가"가 실제로 그대로 동작하는지 노드 하나를 더 붙여 확인한 셈이다.

- Stage 범위 컴포넌트 일괄 리네이밍
  - 나머지 Node 이름도 전부 Stage로 맞췄다. WorkflowNodeWorkspace → WorkflowStageWorkspace, WorkflowNodeItemPanel → WorkflowStageItemPanel, WorkflowNodeBottomNav → WorkflowStageBottomNav, 저장 컨텍스트 일가(WorkflowNodeSaveProvider/Handler/Context → WorkflowStageSave*)와 훅(useWorkflowNodeSaveBar → useWorkflowStageSaveBar, useRegisterWorkflowNodeSave → useRegisterWorkflowStageSave)까지 파일명과 함께 옮겼다. 근거는 일관됐다. 이 컴포넌트들의 실제 범위는 Stage 레벨이라 노드와 액션을 양쪽 다 처리하는데, 이름만 Node여서 범위를 좁게 오해하게 만들었다.

## 정리

오늘 오전을 관통하는 한 줄은 "관성으로 붙은 이름과 분기를 실제 구조에 맞추기"다.

흐름이 feat 하나에 refactor 셋이라는 점이 이날의 성격을 잘 보여준다. 새 모델러 노드를 붙일 때 일부러 기존 if 패턴을 그대로 베껴 먼저 동작시키고, 그 즉시 같은 손으로 분기 전체를 레지스트리로 승격했다. 처음부터 완벽한 추상화를 그리려다 멈추기보다, 작동하는 경로를 먼저 관통시키고 빚을 본문에 적어둔 뒤 바로 갚는 방식이다. 덕분에 추상화가 실제로 필요한 모양(stage 우선, node 폴백, 단일 슬롯 props)을 노드 두 개를 붙여보며 확인하고 굳힐 수 있었다.

레지스트리로 바꾸면서 얻은 본질은 workspace 본문이 더 이상 "어떤 예외들이 있는지"를 알 필요가 없어졌다는 것이다. 본문은 CustomRenderer 슬롯 하나만 알고, 예외 목록은 레지스트리 파일 한 곳에 모였다. 노드가 늘어도 본문은 닫혀 있고 레지스트리만 열려서 자라는, 확장에는 열리고 수정에는 닫힌 구조다. DrawingCleanup을 한 줄로 더 붙여보며 이 약속이 말뿐이 아님을 확인했다.

이름 정리는 어제 phase→stage 통일과 같은 원칙의 연장이었다. 어제는 도메인 용어를, 오늘은 컴포넌트 범위를 사실에 맞췄다. Shell과 워크스페이스 컴포넌트들이 다루는 진짜 범위는 Stage인데 이름만 Node로 남아 있으면, 코드를 읽을 때마다 "이게 노드 단위인가 stage 단위인가"를 되묻게 된다. 이름은 범위에 대한 약속이라, 약속이 사실과 어긋나면 매번 비용을 치른다. 분기를 선언적으로 바꾼 일과 이름을 범위에 맞춘 일은 결국 같은 지향이다. 읽는 사람이 추측하지 않아도 구조가 스스로 드러나게 만드는 것.
