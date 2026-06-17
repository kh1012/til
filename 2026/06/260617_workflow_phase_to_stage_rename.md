---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "워크플로우 도메인 용어 phase를 stage로 코드 전반(필드·변수·컴포넌트·파일·geometry·i18n)에서 통일하고, grep으로 못 잡은 동적 i18n 키 오삭제를 정정한 뒤, stage 종류를 라벨 추론에서 workflowId 명시 매핑으로 도출하고 노드가 그 종류를 상속하도록 바꾸기"

updatedAt: "2026-06-17"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "domain-rename"
  - "phase-to-stage"
  - "incremental-refactor"
  - "dynamic-i18n-key"
  - "explicit-mapping"
  - "category-inheritance"
  - "label-inference"

relatedCategories:
  - "routing"
  - "typescript"
  - "i18n"
---

# phase를 stage로 코드 전반에서 통일하고, 종류 도출을 추론에서 매핑으로 바꾸기

> 워크플로우 도메인 용어를 개념 수준에서 stage로 정한 건 며칠 전이었는데, 코드 식별자에는 phase가 아직 곳곳에 남아 있었다. 오늘은 그 잔재를 필드부터 파일명까지 단계(T1~T5)로 끊어 통일했다. 그 과정에서 grep이 못 잡는 동적 i18n 키 하나를 죽은 코드로 오판해 지우는 회귀를 냈고, 바로 되돌렸다. 이름을 정리하고 나서는 stage의 종류를 라벨 추론이 아니라 백엔드 workflowId 매핑으로 도출하도록 바꿔, 오분류의 뿌리를 끊었다.

## 배경

며칠에 걸쳐 워크플로우 도메인 위계를 stage > node > action으로 못박았다. 개념과 타입은 정리됐는데, 코드 식별자에는 옛 이름 phase가 필드, 변수, 컴포넌트, 파일명, geometry 상수, i18n 키까지 여기저기 남아 있었다. 이름이 두 세대 섞여 있으면 읽는 사람이 매번 "이 phase는 stage인가 아닌가"를 되묻게 되므로, routing-to-be 트랙을 본격적으로 깔기 전에 식별자 수준의 통일을 먼저 끝내기로 했다.

문제는 phase라는 단어가 워크플로우 stage 말고 다른 맥락에도 쓰인다는 것이었다. tool 이벤트의 phase(input/result/error), 백엔드 연결단계를 뜻하는 midas onPhase, domain-graph의 OrderPhase 같은 것들은 워크플로우 stage가 아니다. 그래서 오늘의 진짜 주제는 단순 일괄치환이 아니라 "어디까지가 워크플로우 stage이고 어디부터는 건드리면 안 되는 동음이의어인지"를 매 단계 가려내며 좁은 단위로 끊어 바꾸는 것이었다. 작업을 T1~T5로 쪼갠 이유도 한 번에 치환했다가 동음이의어를 같이 망가뜨리지 않기 위해서였다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- phaseId를 stageId로 통일 (T1)
  - 가장 안전한 필드 이름부터 손댔다. phaseId/sourcePhaseId를 stageId/sourceStageId로 바꿨다(entities·widgets·views 15파일). 타입은 이미 WorkflowStageId라 이름만 정합화하는 단계였다. 여기서부터 동음이의어 경계를 그었다. midas-connection의 연결단계 phase와 generated 코드는 오탐으로 제외했다. typecheck·eslint 0 errors로 가두고 다음 단계로 넘어갔다.

- phase를 stage로 변수·컴포넌트·파일까지 통일 (T2+T3)
  - 필드 다음은 변수와 심볼이었다. phase/phases 변수를 stage/stages로, targetPhase를 targetStage로 바꾸고, 컴포넌트와 파일도 리네임했다(WorkflowBoardPhaseNode→StageNode, *-phase-node/title.tsx→*-stage-node/title.tsx). 치환 중 오탐을 되돌린 게 핵심이다. app/api의 tool 이벤트 phase(input/result/error)는 워크플로우 stage가 아니라 도구 실행 단계라 원복했다. 보류 목록(midas onPhase, domain-graph OrderPhase)도 명시해 뒀다.

- phase 잔재 정리 - geometry 상수·domain-graph·i18n (T4)
  - 눈에 잘 안 띄는 잔재를 훑었다. geometry/elements의 PHASE_* 상수를 STAGE_*로(NODE_WIDTH·COLUMN_GAP 등), previousPhaseIndex를 previousStageIndex로 바꿨다. domain-graph의 DomainGraphBoardOrderPhase는 self-contained라 OrderStage로 같이 정리했다. i18n board.emptyPhase는 코드와 ko·en을 함께 emptyStage로 맞췄다. 사용처가 불명확하고 taskCategories와 중복이 의심되는 phases 네임스페이스는 일단 보류로 남겼다.

- dead i18n phases 네임스페이스 제거 (T5)
  - T4에서 보류했던 phases 키(구조개요·모델링·해석·설계·보고서)를 코드에서 미사용으로 판단하고 ko·en에서 제거했다. 근거는 stage 라벨은 stage.title 데이터를 쓰고(display.ts), categoryId 라벨은 taskCategories를 따로 쓰므로 phases 키가 죽었다고 본 것이다. JSON valid와 ko·en 키셋 일치는 확인했다. 다만 이 판단이 곧 틀린 것으로 드러난다.

- i18n phases→stages 리네임 복원 (T5 오삭제 정정)
  - T5의 삭제가 회귀를 냈다. getWorkflowStageTitle이 `stages.{id}` 형태의 동적 키를 참조하는데, T2에서 phases.를 stages.로 치환해 둔 상태였다. 동적 키라 grep으로 사용처가 안 잡혀 죽은 코드로 오판한 것이다. 결과적으로 steps.{id}.title이 없는 design stage 라벨이 "Design"에서 "design"으로 회귀했다. ko·en의 stages 네임스페이스를 복원해 되돌렸다. 정적 grep만으로 죽음을 판정하면 동적 키 참조를 놓친다는 걸 비싸게 확인했다.

- stage 종류를 workflowId 매핑으로 도출 + 노드 categoryId 상속
  - 이름 정리를 끝낸 김에, stage의 종류를 정하는 방식 자체를 바꿨다. 기존엔 라벨 문자열을 보고 추론(inferCategoryId)했는데, 이게 오분류를 냈다. 예를 들어 modeling stage의 "해석 조건 검토" 노드가 라벨에 '해석'이 들어갔다는 이유로 analysis로 잘못 분류됐다. 대신 백엔드 workflowId를 종류에 명시 매핑하는 getStageCategoryId를 두고(StructuralModelingWorkflow→modeling 등), WorkflowStage.categoryId 필드를 신설해 createWorkflowStage가 채우게 했다. 노드(STEP)는 부모 stage의 종류를 상속하도록 해서 라벨 추론 자체를 제거했다. 매핑에 없는 미지 workflowId만 inferCategoryId 폴백으로 남겼다.

- board 테스트에 origin 디자인 반영 (머지 후속)
  - origin/main을 머지하면서 board 디자인이 바뀐 걸 테스트에 반영했다. minimap이 제거되고 원형 노드의 순서번호 표기가 title 표기로 바뀐 변경이다. minimap 검증을 빼고, 순서번호 textContent 검증을 원형 노드 존재 검증으로 바꾸고, 쓰지 않게 된 container 변수를 정리했다. 워크플로우 테스트 14파일 112개 통과로 확인했다.

- 대시보드 진행중 워크플로우 카테고리를 getStageCategoryId로 전환
  - 새로 만든 매핑을 대시보드에도 적용해 표기를 일치시켰다. project-summary의 categoryId 결정을 라벨 추론(inferCategoryId)에서 명시 매핑(getStageCategoryId)으로 바꿨다. 매핑이 비는 경우를 대비해 getStageCategoryId에 label 폴백 인자를 추가해, 미스 시 name 단서를 유지하게 했다. 워크플로우 transform과 같은 종류 표기를 쓰게 되어 대시보드와 보드가 일관됐다. dashboard 테스트 23개 통과.

## 정리

오늘을 관통하는 한 줄은 "두 세대 섞인 이름을 한 세대로 좁히고, 종류를 추측에서 사실로 옮기기"다.

phase를 stage로 바꾸는 일은 단순해 보여도 동음이의어 때문에 일괄치환이 위험했다. 그래서 필드(T1) → 변수·컴포넌트·파일(T2+T3) → 숨은 상수·그래프·i18n(T4) → 죽은 키 제거(T5)로 좁은 단위씩 끊고, 각 단계마다 tool 이벤트 phase, midas 연결단계, domain-graph OrderPhase 같은 동음이의어를 명시적으로 제외했다. 단계마다 typecheck·eslint 0을 게이트로 둔 덕에 어디서 무엇이 깨졌는지 추적이 쉬웠다.

그럼에도 T5에서 회귀를 냈다. phases 네임스페이스를 죽은 코드로 보고 지웠는데, 사실은 `stages.{id}`라는 동적 키로 살아 있었다. 정적 grep은 문자열로 조립되는 키를 못 잡는다. 죽음을 판정할 때 grep 무결과를 곧바로 증거로 쓰면 동적 참조를 놓친다는 걸 다시 배웠다. 다행히 단계를 좁게 끊어둬서 회귀 범위가 i18n 라벨 하나로 가둬졌고, 복원도 한 번에 끝났다. 좁은 단위로 끊는 작업 방식이 실수의 폭발 반경도 함께 좁혀준 셈이다.

이름을 정리하고 나서야 더 근본적인 문제가 보였다. stage 종류를 라벨 문자열로 추론하던 방식은 "해석 조건 검토"를 analysis로 오분류하듯 본질적으로 깨지기 쉬웠다. 라벨은 사람이 읽는 표시값이지 종류의 근거가 아니다. 종류의 진짜 근거는 백엔드 workflowId다. 그래서 추론을 버리고 workflowId 명시 매핑으로 옮기고, 노드는 부모 stage 종류를 상속하게 했다. 표시값에서 식별자로 판단 근거를 옮기니 보드도 대시보드도 같은 종류를 가리키게 됐다. 이름 통일과 종류 도출은 결국 같은 원칙의 두 얼굴이었다. 추측과 표시값에 기대지 말고 사실과 식별자에 기대라는 것.
