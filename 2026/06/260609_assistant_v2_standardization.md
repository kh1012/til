---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "assistant 위젯을 v2 primitive로 표준화 - showcase 문서화부터 네이밍 정리, storybook 정합까지"
updatedAt: "2026-06-09"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-system"
  - "v2-primitives"
  - "shadcn"
  - "storybook"
  - "jsdoc"
  - "assistant-widget"
  - "container-presentational"

relatedCategories:
  - "react"
  - "refactoring"
  - "code-quality"
---

# assistant 위젯을 v2로 표준화하면서, 디자인 시스템을 "쓸 수 있게" 만들었다

> showcase를 AI가 읽고 재현할 수 있게 문서화하고, primitive의 이름 중복을 정리한 뒤, 실제 제품(assistant)을 그 v2 기준으로 표준화했다. 그 과정에서 깨진 storybook을 mock과 폭으로 되살렸다. 디자인 시스템을 만드는 일과 쓰는 일은 따로가 아니었다.

## 배경

v2 primitive 세트는 이미 어느 정도 자리를 잡았지만, 두 가지가 비어 있었다. 하나는 "이 showcase를 보고 어떻게 비슷한 UI를 만들지"에 대한 안내가 없다는 점이고, 다른 하나는 정작 실제 제품 화면(assistant 위젯)이 여전히 native 태그와 v1 잔재로 만들어져 있어서 showcase의 톤앤매너와 따로 논다는 점이었다.

오늘은 이 둘을 좁히는 날이었다. 디자인 시스템을 문서로 설명 가능하게 만들고, 이름 충돌을 정리해서 인지 부하를 줄이고, 그 정리된 기준으로 실제 제품을 표준화했다. 표준화는 필연적으로 storybook을 흔들었고, 마지막은 그 정합을 맞추는 일로 끝났다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- v2 showcase 스토리에 AI 재현용 JSDoc 추가
  - 목적이 명확했다. 미래의 AI(혹은 사람)가 JSDoc만 읽고도 비슷한 카드/대시보드 UI를 즉시 재현할 수 있게 하는 것.
  - 세 가지를 먼저 결정했다. 언어는 한국어 산문, 범위는 _pilot 포함 15파일 전부, 형식은 "구성 + 기법 + 응용 + @example".
  - 작업 방식이 핵심이었다. p1-finance 하나를 골든 레퍼런스로 직접 작성한 뒤, 나머지 14개는 서브에이전트 병렬로 돌렸다. 기준 한 장을 손으로 만들어 두면 일관성과 정확성을 동시에 잡을 수 있다.
  - 구조는 두 층위로 갈랐다. 파일 레벨에는 컨셉과 스토리 목록, 그리고 "AI 참고" 라우팅을 넣고, 스토리 레벨에는 60개 export에 1:1로 설명을 달았다.
  - 식별자, prop, className은 영어로 유지하되 색과 간격은 st-* 토큰으로 적었다. 검증은 open/close 균형, export 60-60 커버, tsc·eslint clean으로 마무리했다.

- v2 primitives 원형 5종을 _internal로 격리해 이름 중복 제거
  - 문제는 같은 이름이 두 군데 살아 있다는 것이었다. 루트의 button(maxflow 어댑터, canonical) 옆에 primitives/button.tsx(shadcn 원형)가 있었고, button/badge/popover/spinner/tooltip 5종이 똑같이 겹쳐 인지 부하를 만들었다.
  - 선택지를 두고 고민했다. 어댑터로 통합해 원형을 삭제하는 길은 calendar의 buttonVariants 의존 때문에 룩이 깨질 위험이 있었다. 그래서 원형 5종을 primitives/_internal/로 옮겨 격리하는 쪽을 골랐다.
  - 격리 방식 자체도 underscore prefix와 폴더 이동 사이에서 정했고, _internal/ 폴더 이동으로 결정했다.
  - 적용은 git mv 5종에 import 51곳 갱신(./X를 ./_internal/X로, showcase는 ../X로), 배럴 2개의 주석 경로 갱신이었다. 제품 쪽에 deep import가 없고 어댑터 배럴 export가 그대로라 외부 영향은 0이었다. import { Button } from "@/shared/ui/v2"는 변하지 않았다.

- assistant의 native/v1 컴포넌트를 v2 primitive로 표준화
  - 색만이 아니라 여백, 높이, radius까지 완전히 표준화해서 showcase 톤앤매너에 맞췄다.
  - 어댑터 Button은 forwardRef가 없고 children을 span으로 감싸기 때문에, Tooltip이나 truncate, 회전링이 필요한 자리에는 어댑터 대신 plain button에 getButtonClassName을 붙였다. 작은 아이콘 버튼은 어댑터에 icon-sm이 없어서 getButtonClassName(icon + size-6)으로 처리했다.
  - actionBtn 공유 상수를 v2화하니 retry/copy/feedback이 한 번에 전환됐다. feedback-dialog의 accent/control/step, step-n2 같은 v1 잔재는 st- 토큰으로 바꾸고 사유칩은 ToggleGroup으로 옮겼다. 검색 영역은 InputGroup/Item/ToggleGroup을 적용하고 입력 높이를 h-7에서 h-8로 키웠다.
  - 표준화가 불가능한 곳은 예외로 남겼다. 원형 전송 버튼, tool-call의 grid 토글, 투명 에디터, 숨김 file input, 오버레이, truncate 행, 텍스트 링크는 v2로 표현이 안 돼 토큰과 base만 입혔다.
  - 덤으로 thread-row의 더보기 메뉴를 별도 파일로 분리해 max-lines를 해소했다(R005/R006).

- 스토리 오류 개선: 컨텍스트 구독 컴포넌트를 mock Provider로 감싸기
  - 표준화 이후 message-bubble, message-list, panel 스토리가 깨졌다. 원인은 메시지 footer의 AssistantMessageFeedback이 채팅 컨텍스트(status/projectId)를 구독하는데 스토리에는 그 Provider가 없었던 것.
  - presentational 셸과 container 의존 컴포넌트가 한 스토리에 섞여 있는 구조라, 세 스토리의 meta decorators에 createAssistantChatMock으로 만든 AssistantChatContextProvider를 둘러줬다.

- storybook 패널 폭 정합: 데모에서 헤더와 composer가 잘리지 않게
  - 실사용 기본 폭은 360이지만, 데모에서는 thread 선택(208)과 검색(280)이 들어간 헤더와 composer가 그 폭에서 잘렸다.
  - assistant-chat과 panel 스토리에 useSetPanelWidth로 데모 폭을 520으로 넓히고, 개별 Frame/Panel 데코의 고정 width도 380~420에서 460~560으로 올려 잘림을 없앴다.

## 정리

오늘의 다섯 작업은 결국 하나의 질문을 따라 흘렀다. "디자인 시스템이 있다"와 "디자인 시스템을 쓸 수 있다"는 같지 않다는 것.

showcase에 JSDoc을 붙인 건 시스템을 설명 가능하게 만든 일이었다. 골든 레퍼런스 한 장을 손으로 쓰고 나머지를 병렬로 펼친 방식은, 일관성은 기준에서 나오고 양은 병렬에서 나온다는 분업이 잘 맞아떨어진 사례였다. primitive의 이름 중복을 _internal로 격리한 건 시스템을 헷갈리지 않게 만든 일이었고, 통합 대신 격리를 고른 건 룩이 깨질 위험과 인지 부하 사이의 저울질이었다. 위험이 0인 쪽을 택했다.

그리고 실제 제품인 assistant를 그 기준으로 표준화하면서, 어댑터가 모든 자리를 덮지 못한다는 현실을 마주했다. forwardRef가 없고 icon-sm이 없는 어댑터 앞에서, 무리하게 어댑터로 우겨넣지 않고 plain button + getButtonClassName이라는 탈출구를 인정한 게 오히려 깔끔했다. 표현이 안 되는 7곳을 예외로 남긴 판단도 같은 맥락이다. 표준화는 100%를 강제하는 게 아니라, 어디까지가 표준이고 어디부터가 예외인지를 명시하는 일에 가깝다.

마지막 두 작업은 표준화가 storybook을 흔든 흔적을 수습하는 일이었다. 컴포넌트가 컨텍스트를 구독하기 시작하면 스토리도 그 컨텍스트를 mock으로 제공해야 하고, 레이아웃이 바뀌면 데모 폭도 따라가야 한다. 시스템을 바꾸는 일은 늘 그것을 비추는 거울(showcase, storybook)까지 같이 손봐야 끝난다는 걸 다시 확인했다. 만드는 일과 쓰는 일, 그리고 비추는 일은 분리되지 않는다.
