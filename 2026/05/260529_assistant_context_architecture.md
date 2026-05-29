---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "어시스턴트 컨텍스트 시스템 명명·구조 정리와 입력 맥락 태그"
updatedAt: "2026-05-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "naming"
  - "react-hooks"
  - "jotai"
  - "context"
  - "breadcrumb"

relatedCategories:
  - "typescript"
  - "architecture"
---

# 어시스턴트 컨텍스트 시스템 명명·구조 정리와 입력 맥락 태그

> MAX 어시스턴트의 컨텍스트 생산/소비 축을 일관된 이름으로 통일하고, 그 위에 "지금 무엇을 보는지" 알려주는 입력 맥락 태그를 얹은 하루.

## 배경

MAX 어시스턴트는 화면/주소/입력 필드에서 맥락을 모아 LLM 전송에 싣는다. 그런데 이 맥락을 만드는(생산) 훅과 쓰는(소비) 훅, 그리고 저장하는 store의 이름이 서로 다른 축(무엇 vs 성격 vs 동작)으로 붙어 있어 읽을 때마다 헷갈렸다. BFF가 screenContext만 받는 구조로 바뀌면서 옛 평면 매핑(toAgentContext)이 빌드를 깨뜨린 것이 출발점이었고, 이를 정리하는 김에 명명 축 전체를 한 번에 통일했다. 토대가 정리된 뒤에는 그 맥락을 사용자에게 보여주는 입력 맥락 태그를 확장했다.

## 핵심 내용

### 개별 커밋 기록 (시간순)

- `52ea5daf2` fix(assistant): screenContext 전환 후 남은 toAgentContext 제거
  - BFF가 screenContext-only로 전환되며 AgentContext 타입이 삭제됐는데 toAgentContext와 배럴 export가 그걸 참조해 TS2304/TS2724로 빌드가 깨졌다.
  - 평면 필드 매핑(page/workflowInstanceId/focusedField/formValues)을 폐기하고 screenContext snapshot만 전송하도록 정리. projectId는 URL path로 가므로 바디 중복도 제거.

- `12dcfd221` refactor(assistant): 컨텍스트 store를 subscribed/snapshot으로 정리
  - context-store와 ephemeral-store가 "무엇이냐"와 "성격이냐"로 축이 어긋나 있었다. 둘 다 결국 context store라 이름이 모순.
  - 구독 여부 축으로 통일. subscribed-context-store / snapshot-context-store. activeContextsAtom은 subscribedContextAtom, ephemeralGettersAtom은 snapshotGettersAtom으로.

- `d7d3715ab` refactor(assistant): 생산 훅을 Url/Screen/Field로 명명
  - 맥락을 만드는 훅 이름을 "어디서 오는가"(출처) 축으로 통일. useAssistantContextSync는 useAssistantUrlContext, useAssistantContext는 useAssistantScreenContext, useAssistantEphemeralContext는 useAssistantFieldContext.
  - 고민: 출처 vs 성격 축? 생산자는 출처만 책임지고, 구독/비구독 같은 동작은 소비 훅이 책임지게 분리. ephemeral(성격) 단어를 공개 API에서 걷어냈다.

- `405804191` refactor(assistant): 소비 훅을 Subscribed/Snapshot으로 명명
  - 맥락을 쓰는 훅은 동작·타이밍 축으로 통일. useCurrentContext는 useSubscribedContext, useEphemeralSnapshot은 useSnapshotContext.
  - 고민: Current는 "전부"처럼 들려 mergeContexts와 혼동됐다. Resolved보다 Subscribed가 "Field가 빠진 이유(비구독)"까지 설명해줘서 채택.

- `bf6ef4aad` refactor(assistant): 컨텍스트 조각 타입을 Fragment로 명명
  - AssistantContextEntry를 AssistantContextFragment로. "머지 재료=조각"이라는 의미를 이름에 드러냈다.
  - 고민: Partial<AssistantContext>로 충분한가? scope(출력 전용)와 priority(입력 전용)가 상보적이라 부적합. Entry는 Map 저장 관점은 맞지만 "머지 재료" 역할이 안 드러나 Fragment로.

- `d03a680aa` refactor(assistant): 화면 컨텍스트 훅을 ViewContext로 명명
  - useAssistantScreenContext를 useAssistantViewContext로(use-screen-context.ts는 use-view-context.ts). 단 screenContext/WebScreenContext 데이터 필드는 백엔드 계약이라 그대로 두고 훅 식별자만 변경.
  - 진행 중이던 busy/context-tag 작업과 파일이 섞여 rename hunk만 부분 staging.

- `81df25e72` feat(assistant): 입력 맥락 태그를 포커스 필드·화면 2단으로 확장
  - 태그에 projectName만 나오던 것을 페이지 기준으로 확장. 리스트 vs 팝업 UX를 두고 고민하다 "인라인 1차 + 팝업 2차" 하이브리드 방향으로 결론.
  - 핵심 발견: 병목은 표현이 아니라 맥락 생산이었다. focusedField.label이 key만 있고 미생산, 화면 title이 영문 하드코딩, screenContext를 push하는 화면이 1개뿐. 그래서 schema에서 label을 resolve(Phase 0) + 2단 인라인(Phase 1)을 먼저 하고 팝업은 보류.
  - 좁은 패널(320~360px, 한글 2배폭)이라 3단 풀표시 대신 프로젝트 + 가변 1조각(필드>화면)만 상시 노출. 화면명은 전송값(영문 title)과 분리해 표시용 i18n(contextScreen.*)으로 매핑.
  - 고민: onBlur로 필드 세그먼트를 지울까? composer 클릭이 곧 blur라 입력 직전에 사라지고 전송 맥락까지 잃는다. "다음 포커스까지 유지"를 그대로 둠.

- `8e8736579` refactor(assistant): 입력 맥락 태그를 breadcrumb 구조로 전환
  - pill 태그가 사실상 breadcrumb이라, 기본 breadcrumb 표현 + 마지막 path 굵게로 바꿨다.
  - 공용 Breadcrumb를 채택했다가, 좁은 패널 디테일(여백/말줄임/강조 강도)을 자유롭게 조정하고 공용 컴포넌트 영향을 차단하려고 구조(nav>ol>li, muted에서 마지막 강조, chevron)만 차용한 로컬 복제로 전환. 공용 컴포넌트는 원복.

## 정리

오늘 오전부터 오후 초반까지는 "코드를 한 줄도 새로 만들지 않고도 읽기 쉬워지는" 작업이었다. 핵심은 이름 축을 하나로 정한 것이다. 생산 훅은 출처(Url/Screen/Field), 소비 훅은 동작/타이밍(Subscribed/Snapshot), 조각 타입은 역할(Fragment). "무엇을"과 "어떻게"를 같은 이름 공간에서 섞지 않으니 훅을 처음 보는 사람도 책임을 바로 읽을 수 있다. Current를 Subscribed로 바꾼 결정이 특히 마음에 드는데, 단지 더 정확한 단어가 아니라 "Field가 왜 여기 없는지"라는 구조적 사실까지 이름이 설명해주기 때문이다.

맥락 태그 작업에서 배운 건 다른 결이다. 처음엔 표현(리스트냐 팝업이냐, 몇 단을 보여주냐)을 고민했는데, 실제 병목은 맥락 생산 쪽이었다. label이 안 만들어지고 화면 title이 영문 하드코딩이면 표현을 아무리 다듬어도 보여줄 게 없다. 표현 레이어에서 막힐 때 한 단계 아래(데이터 생산)를 의심하는 습관을 다시 확인했다. breadcrumb 전환에서는 공용 컴포넌트를 쓸지 복제할지를 두고, "재사용"이 항상 정답은 아니라는 점을 짚었다. 좁은 패널처럼 디테일을 계속 만질 자리에서는 공용에 영향을 주지 않는 로컬 복제가 오히려 자유도를 준다.
