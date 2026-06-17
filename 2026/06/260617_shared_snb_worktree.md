---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "좌측 SNB 워크트리를 도메인 비종속 generic 슬롯 컴포넌트로 만들어 Storybook과 함께 추가하고, 초기의 HTML 과충실 구현을 packages/ui sidebar 관용구로 전환한 뒤, 노드 상세 패널의 inline 리스트를 이 공용 SNB로 교체하고 백엔드 status를 SNB status로 매핑하기"

updatedAt: "2026-06-17"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "shared-component"
  - "generic-slot"
  - "storybook"
  - "design-token"
  - "status-mapping"
  - "sidebar-idiom"
  - "no-arbitrary-value"

relatedCategories:
  - "architecture"
  - "react"
  - "i18n"
---

# 좌측 SNB를 도메인 비종속 공용 컴포넌트로 빼고 노드 패널에 끼우기

> 워크플로우 노드 트리를 보여주는 좌측 SNB가 여러 화면에서 비슷하게 반복될 조짐이 보여서, 도메인을 모르는 generic 슬롯 컴포넌트로 먼저 뽑고 Storybook으로 모양을 고정했다. 처음엔 디자인 시안 HTML을 너무 충실히 베껴 떴는데, 피드백을 받아 packages/ui의 sidebar 관용구 위에 다시 세웠다. 그런 다음 노드 상세 패널의 inline 리스트를 이 공용 SNB로 교체하고, 백엔드 status를 SNB가 아는 status로 매핑했다.

## 배경

워크플로우 화면 곳곳에서 좌측에 'stage > node > action' 트리를 띄우는 패턴이 반복될 것 같았다. 노드 상세 패널이 자체 inline 리스트를 들고 있었는데, 이런 식으로 화면마다 비슷한 트리를 각자 그리면 모양과 상태 표현이 금방 어긋난다. 그래서 트리 자체를 공용 컴포넌트로 한 번 빼두고, 사용처는 데이터만 주입하게 만드는 게 오늘의 목표였다.

핵심 설계 질문은 "이 컴포넌트가 워크플로우 도메인을 알아야 하는가"였다. 알게 만들면 재사용이 워크플로우에 묶인다. 그래서 컴포넌트는 stage·node·action이라는 도메인 단어 대신 navigation·items·subItems 같은 generic 슬롯만 알게 하고, 도메인 매핑은 사용처가 책임지게 갈랐다. 오후엔 이 공용 컴포넌트를 Storybook으로 모양을 굳히고, 저녁엔 실제 노드 상세 패널에 끼워 첫 사용처를 만들었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 좌측 SNB 워크트리 공용 컴포넌트와 Storybook 추가
  - shared에 도메인 비종속 generic 컴포넌트로 만들었다. navigation·items·subItems 슬롯만 받고, 사용처가 stage·nodes·actions를 주입한다. 작업 중 몇 가지 결정과 함정이 있었다.
    - 용어 충돌: node라는 단어가 헤더와 트리에 동시에 겹쳐서, 헤더는 stage로 분리하고 트리만 node로 뒀다.
    - 스타일 베이스 전환: 처음엔 디자인 시안 HTML을 과하게 충실히 베꼈는데, 피드백 후 packages/ui의 sidebar 관용구(st-sidebar-* 토큰) 위로 옮겼다. 시안을 그대로 뜨는 것과 디자인 시스템 위에 세우는 것은 다르다는 지적이었다.
    - 보존한 3종: 노드 카드, 카드 간 연결 흐름, 강화된 disabled 표현(blocked은 점선·흐림·비활성)은 시안의 핵심이라 유지했다.
    - active 표현: node와 action 모두 accent(st-sidebar-accent) + 제목 font-bold로 두고, action에 선택 상태를 신설했다.
    - 커넥터: 점선+굵은 화살표는 촌스러워서 헤어라인을 거쳐 lucide ArrowDown으로 정착했다.
    - 항상 펼침: 하위 액션을 active 게이팅 없이 항상 펼쳐, 노드 전환 때 접힘과 레이아웃 시프트(CLS)가 안 생기게 했다.
    - 상태 아이콘: danger 3종(작성필요·검토필요·출력NG)은 filled SVG, muted 3종은 lucide 아웃라인으로 갈랐다.
    - 함정 2개: no-tailwind-arbitrary-value 룰에 걸려 임의값을 토큰으로 바꿨고, 스토리가 component 바인딩에서 args를 강요해 loose StoryObj로 풀었다.

- 노드 상세 좌측 패널에 공용 SNB 적용
  - 첫 사용처를 만들었다. WorkflowNodeItemPanel의 inline 리스트를 공용 Snb(SnbNavigation+SnbList)로 교체했다.
    - 데이터 주입: 별도 매핑 없이 stage=workflow, node=Step, action=Step children(HAS_ORDERED_SUB kind=ACTION)으로 꽂았다. workflowDefinitionContents가 stageWithContents에 이미 채워져 있어 추가 페칭이 필요 없었다.
    - status 매핑: 백엔드 status를 SNB status로 옮기는 to-snb-status.ts를 분리했다. done→done, in-progress→running, blocked→locked, ready·free·pending→ask로 매핑했다.
    - 갭 명시: warning·error·waiting은 대응하는 백엔드 status 소스가 아직 없어 미매핑으로 남겼다(추후 리뷰 상태 도입 시 연결).
    - 동작 보존: 액션 선택 시 부모 노드 강조를 해제하는 기존 동작을 유지했다.
    - 헤더 정리: caption을 제거하고 header/list 구분 border를 없애 스토리북과 모양을 맞췄으며, back·collapse 버튼을 헤더 좌우로 재배치했다.
    - 검증: page-content·node-content 등 workflow ui 테스트 8개 통과.

## 정리

오늘의 한 줄은 "도메인을 모르는 껍데기를 먼저 만들고, 도메인은 사용처가 주입하기"다.

좌측 트리를 공용으로 뺄 때 가장 중요한 결정은 컴포넌트에서 도메인 단어를 지운 것이었다. stage·node·action을 알게 두면 재사용이 워크플로우에 묶이지만, navigation·items·subItems라는 generic 슬롯만 알게 두면 트리가 필요한 어디든 데이터만 바꿔 꽂을 수 있다. 노드 상세 패널이 별도 매핑 없이 stage=workflow / node=Step / action=children으로 바로 주입된 게 이 분리가 옳았다는 증거였다.

스타일에서 배운 건 "시안 충실"과 "시스템 위에 세우기"가 다르다는 점이다. 처음엔 디자인 HTML을 그대로 떠서 토큰 밖 임의값과 시안 전용 마크업이 섞였다. 피드백을 받아 packages/ui의 sidebar 관용구(st-sidebar-* 토큰) 위로 옮기니 no-arbitrary-value 룰도 자연히 만족됐다. 시안에서 진짜 지켜야 할 건 픽셀이 아니라 의도(노드 카드·연결 흐름·강화된 disabled)였고, 그건 토큰 위에서도 살릴 수 있었다.

status 매핑에서는 갭을 숨기지 않고 드러낸 게 마음에 든다. done·running·locked·ask는 백엔드 소스가 있어 매핑했지만, warning·error·waiting은 소스가 아직 없다. 임의로 끼워 맞추는 대신 미매핑으로 명시하고 "리뷰 상태 도입 시 연결"이라 적어, 나중에 백엔드가 올 때 어디를 채울지가 코드에 남게 했다. 며칠째 이어지는 "빈 칸을 채우는 대신 안전하게 비워두고 자리를 표시하기"가 status 매핑에서도 똑같이 작동했다.
