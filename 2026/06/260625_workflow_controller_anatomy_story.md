---
draft: true
type: "content"
domain: "frontend"
category: "storybook"
topic: "WorkflowController를 분해해 보여주는 Anatomy 스토리를 별도 파일로 세우면서, data-anatomy DOM 쿼리로 부위를 하이라이트하고 컨테이너 높이와 데코레이터 잔재까지 맞춘 하루. 더불어 overlay 전환에서 남은 prop 잔재가 만든 TS 에러를 먼저 걷어냈다"

updatedAt: "2026-06-25"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "storybook"
  - "anatomy-story"
  - "data-attribute"
  - "dom-query"
  - "workflow-controller"

relatedCategories:
  - "react"
  - "typescript"
---

# WorkflowController를 분해해서 보여주는 Anatomy 스토리 세우기

> WorkflowController가 어떤 부위들로 이루어져 있는지 클릭으로 짚어 가며 보여주는 Anatomy 스토리를 별도 파일로 세웠다. data-anatomy 속성을 DOM에서 쿼리해 부위를 빨갛게 칠하는 방식을 택했고, 스토리 컨테이너 높이와 데코레이터 잔재까지 맞춰 위치를 잡았다. 작업에 앞서 overlay 전환에서 빠뜨린 prop 잔재가 만든 TS 에러부터 정리했다.

## 배경

WorkflowController는 워크플로우 화면 하단에 떠 있는 컨트롤러로, 진행 바와 범위 마커, 반복 노드 피커, 자동 진행 표시 같은 여러 부위가 한 덩어리로 붙어 있는 복합 컴포넌트다. 다른 사람이 이 컴포넌트를 처음 볼 때 "이 부분이 무슨 역할이고 어떤 컴포넌트가 그리는지"를 한눈에 짚을 수 있으면 좋겠다는 게 출발점이었다. 디자인 시스템에서 이런 "구조 해부도"를 흔히 Anatomy라고 부른다.

그런데 그 작업을 시작하기 전에 빌드를 막는 잔재가 하나 있었다. 앞선 overlay 전환 작업에서 WorkflowStageWorkspace의 onAutoNavigateToFirstAction prop을 없앴는데, 정작 그것을 넘기던 route-shell 쪽 코드가 그대로 남아 TS 에러를 내고 있었다. 깨끗한 바닥 위에서 스토리를 세우려면 이 먼지부터 털어야 했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- onAutoNavigateToFirstAction prop 제거
  - overlay 전환 커밋에서 WorkflowStageWorkspace의 onAutoNavigateToFirstAction prop이 사라졌는데, route-shell에는 이 prop을 전달하는 코드가 그대로 남아 TS 에러가 났다. 첫 액션으로 자동 이동시키는 동작은 이미 onSelectNode 쪽에서 같이 처리되고 있어 이 prop은 기능적으로도 잉여였다. 그래서 route-shell의 전달 코드를 걷어내 에러를 없애고 흐름을 한 갈래로 정리했다.
- Anatomy 스토리 추가 및 data-anatomy 속성 부착
  - WorkflowController의 각 부위에 data-anatomy 속성을 달고, 스토리에서는 그 속성을 DOM으로 쿼리해 클릭 토글로 빨갛게(#ef4444) 칠하는 방식을 택했다. 컴포넌트 트리에 프로퍼티를 새로 받게 하지 않고 이미 렌더된 DOM을 바깥에서 들여다보는 쪽이라, 본체에는 속성 한 줄만 더해지고 하이라이트 로직은 스토리에 갇힌다.
  - 부위 이름을 트리에 띄울 때 컴포넌트명은 .name이나 .render.name으로 런타임에 읽을 수 있었지만, 파일명은 브라우저 환경 특성상 얻을 길이 없어 하드코딩으로 두었다. 가능한 부분은 런타임 접근으로, 불가능한 부분은 명시로 갈랐다.
  - 네이밍은 Blueprint와 Anatomy를 두고 고민하다 디자인 시스템 표준 용어인 Anatomy로 정했다. 스토리는 기능 스토리와 데이터를 공유하지 않아 관심사가 분리되므로, 같은 파일에 끼워 넣지 않고 별도 파일로 떼어 Views/Workflow/Controller 아래 Anatomy 탭으로 두었다.
  - RangeBadges와 WorkflowControllerCollapsed처럼 Fragment를 반환하거나 분기로만 존재하는 컴포넌트는 잡을 DOM 노드가 없어 하이라이트가 불가능했다. 이 경우는 억지로 칠하려 하지 않고 트리에 '⊘' 마커를 붙여 "여기는 짚을 수 없는 자리"임을 드러냈다.
  - 우측 정보 패널은 280에서 720px 범위로 드래그 리사이즈할 수 있게 했고, 다른 스토리의 패널 높이에까지 영향을 주던 min-h-screen 데코레이터와 중복된 tags:autodocs를 제거해 부수효과를 끊었다.
- Anatomy 스토리 컨테이너 높이 조정
  - WorkflowController가 absolute bottom-4로 바닥에 고정되는 컴포넌트라, 스토리 컨테이너에서 flex center를 줘도 중앙 정렬이 먹지 않았다. 컨테이너 높이를 20rem으로 잡아 컨트롤러가 화면 안에 자연스러운 위치로 떨어지도록 보정했다.

## 정리

이날의 큰 줄기는 "WorkflowController가 어떤 부위들로 짜여 있는지 보여주는 해부도를 세운다"였고, 그 앞에 전환 작업의 먼지를 터는 짧은 정리가 붙었다. overlay 전환에서 prop 하나를 없애 놓고 그것을 넘기던 자리를 안 치워 둔 탓에 빌드가 막혀 있었는데, 기능은 이미 onSelectNode가 대신하고 있었으니 잔재를 걷어내는 것으로 충분했다. 새 작업을 깨끗한 바닥에서 시작하려면 이런 미완의 끝맺음부터 닫는 게 순서였다.

본 작업에서 마음에 들었던 결정은 하이라이트를 컴포넌트 props가 아니라 data-anatomy 속성과 DOM 쿼리로 푼 것이다. 부위를 짚어 보여주는 일은 본질적으로 "이미 그려진 화면을 바깥에서 들여다보는" 관찰 행위인데, 그걸 위해 본체에 하이라이트 상태나 콜백을 심으면 도구를 위한 빚이 프로덕션 코드에 남는다. 속성 한 줄만 남기고 나머지는 스토리에 가둔 덕에, 컨트롤러는 자기 일만 하고 해부도는 그 위에 얹힌 별개의 렌즈로 분리됐다. 같은 맥락에서 스토리도 기능 스토리와 섞지 않고 별도 파일로 떼어 관심사를 갈랐다.

한편 모든 부위가 똑같이 다뤄지지는 않았다. Fragment나 분기로만 존재해 DOM 노드가 없는 컴포넌트는 하이라이트가 원천적으로 불가능했는데, 여기서 억지로 우회하기보다 '⊘' 마커로 "짚을 수 없는 자리"라고 솔직히 표시한 게 더 정직한 해법이었다. 파일명을 런타임에 못 읽어 하드코딩한 것도 같은 태도다. 자동화할 수 있는 곳과 없는 곳의 경계를 흐리지 않고 그대로 드러내는 편이, 나중에 이 스토리를 읽는 사람에게 덜 헷갈린다. 마지막에 컨테이너 높이를 20rem으로 맞춘 작은 보정은 absolute 고정 컴포넌트를 스토리에 올릴 때 흔히 겪는 함정으로, 부모 높이가 없으면 flex center가 기댈 데가 없다는 걸 다시 확인한 셈이다.
