---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "WorkflowController/StatusBar 디자인 정리 — Card 구조 재편·색/여백/타이포 표준화·도킹 컨트롤"
updatedAt: "2026-06-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-system"
  - "layout-shift"
  - "cls"
  - "card-anatomy"
  - "tooltip-ref"
  - "atom-reactive"

relatedCategories:
  - "design-system"
  - "css"
---

# WorkflowController/StatusBar 디자인 일관성 잡기

> anatomy 컴포넌트 정리의 연장선에서, StatusBar의 중복 정보를 걷어내고 WorkflowController를 Card 구조로 재편하면서 색/여백/타이포/도킹 컨트롤까지 하루 종일 디자인을 다듬은 기록.

## 배경

앞선 며칠간 진행한 anatomy 컴포넌트 디자인 cleanup(fe-harness todo: anatomy-components-design-cleanup)의 연속이다. WorkflowStatusBar와 WorkflowController가 정보 중복, 색 과다, 비표준 토큰, 레이아웃 시프트 같은 문제를 안고 있어서, 쇼케이스 카드(PayoutThreshold, SavingsTargets 등)의 톤을 참조 기준으로 삼아 두 컴포넌트를 차례로 정돈했다.

작은 커밋을 여러 번 쌓는 방식으로 진행했는데, 이는 시각 결과를 매번 눈으로 확인하면서 한 가지 결정씩 검증하기 위함이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- WorkflowStatusBar 레이아웃 정리 (상태 그룹 우측 정렬 + 진행률 바 하단 라벨)
  - 상태 카운트 3그룹(조치 필요/비활성/완료)을 우측 끝으로 모으고 그룹 사이를 세로 Divider로 구분. aria 전용으로 숨어있던 group i18n을 화면 라벨로 노출(aria-labelledby 연결). 좌측 진행률은 SavingsTargets 패턴을 차용해 바 하단 좌/우에 "% 달성", "경과"를 양끝 배치. 2줄 구조가 되며 h-8→h-12.

- WorkflowStatusBar 좌측 진행률 바 제거 (완료 요약 한 줄)
  - 바로 전 작업을 다시 봤더니 완료 정보가 바 + % + 분수 + 우측 Completion 그룹으로 4중 중복이었다. 좌측 진행률 바를 통째로 삭제하고 "{percent}% achieved · {done}/{total}" 한 줄로 통합. 2줄이 없어지며 h-12→h-8로 복귀. 관련 i18n 키와 LinearProgress import도 정리.

- WorkflowController 색 팔레트 축소 (퍼플 1색 강조, 틸 제거)
  - steel/bubble/gradient/st-primary가 동시에 쓰여 시선이 분산됐다. 강조를 Run 버튼 + 선택 범위로만 한정하고 나머지는 중립화. RangeItemBadge의 start/end/gradient/text-white를 빼고 뉴트럴 칩(border + st-card)으로, 죽은 variant="info"는 prop째 삭제. 슬라이더 thumb은 흰 채움 + 퍼플 테두리, range fill은 st-primary(유일한 컬러 강조).

- 여백 확대 + 재생버튼 모션 진정 + 잠금구간 비활성트랙화
  - "다닥다닥" 붙은 느낌을 쇼케이스 Card 간격 기준으로 풀었다(gap/py 확대). 재생버튼은 기본 transition-all이 클릭 시 그림자/링/이동을 한꺼번에 애니메이트하던 걸 transition-colors로 좁혔다. 잠금구간은 pill + 자물쇠 아이콘 + ring을 떼고 트랙에 얇은 회색 비활성 밴드만 남겼다.

- 재생버튼 레이아웃 시프트 버그 + 잠금구간 정렬 + RangeSummary 중복 제거
  - 오늘 가장 까다로웠던 버그. 재생버튼을 클릭하면 크게 아래로 추락했는데, 원인은 세로 중앙을 -translate-y-1/2로 잡아둔 상태에서 Button 기본 active:translate-y-px가 그 translate를 통째로 덮어써 -50% 중앙정렬이 사라진 것(버튼 높이 절반만큼 떨어짐). top-1/2 + -translate-y-1/2를 inset-y-0 + my-auto(auto 마진 중앙정렬)로 바꿔 active translate와의 충돌을 없앴다. 잠금구간도 별도 컨테이너 대신 슬라이더 블록 안 트랙정렬 레이어로 옮겨 라인 어긋남을 잡고, thumb 위 배지와 겹치던 "시작 -> 끝" 문자열은 제거.

- Card(Header/Content/Footer) 구조로 재편
  - PayoutThreshold 쇼케이스 카드 톤을 차용해 섹션화. 상단 Header(타이틀 + 선택개수/Reset + 접기), 중앙 Content를 row로 묶어 Progress 슬라이더 flex-1 + RunButton을 슬라이더 우측에 배치(기존 좌측 absolute FAB 폐지), 하단 Footer는 Options에 border-t + 배경으로 divider. 카드 톤도 shadow-lg를 ring-1로 바꾸고 backdrop-blur 제거해 참조 카드와 맞췄다.

- 타이포·버튼사이즈 표준화 + 카테고리 끝단 라벨 정렬
  - 비표준 토큰을 primitive 기본값으로 일괄 치환(text-step-n1/n2→text-sm 등, font-bold→font-medium, 5개 파일). 버튼 사이즈도 표준화(xs→sm, RunButton 오버라이드 제거). CategoryMarkers 하단 라벨은 양 끝단(0%/100%)을 각 끝 정렬, 중간만 중앙정렬로 바꿔 끝 라벨이 넘쳐 보이던 걸 해소.

- 헤더 CardTitle 폰트 일치 + 노드수 표시 + Reset ghost화
  - 앞선 표준화 sed에 휩쓸려 헤더 타이틀까지 text-sm으로 줄었던 걸 reference CardTitle(font-heading text-base font-medium)과 동일하게 교정. 좌측에 전체 노드 수 표시(i18n nodeCount 추가), Reset 버튼은 secondary→ghost로 outline 제거.

- Progress 도킹 컨트롤 (헤더 카운트 중복 제거, 재생/리셋/노드수 도크화)
  - 헤더에 total + selected 2개로 중복되던 카운트를 없애고, 슬라이더 하단 중앙에 도킹 컨트롤 바(Reset/재생/노드수)를 만들었다. CLS 방지를 위해 노드수 숫자만 t.rich로 minWidth 2ch 고정폭 슬롯(tabular-nums)에 넣어 1→10→11에서 흔들리지 않게 했다. Reset은 native button + getButtonClassName으로 Tooltip trigger ref를 확보.

- 도크 노드수를 선택범위 카운트(반응형)로
  - 도크 노드수가 itemCount(전체, 정적)라 슬라이더를 움직여도 안 변하던 버그. selectedCount로 교체. controlled는 controlledRangeState.selectedCount, atom 버전은 normalizedRangeAtom을 구독하는 별도 atom으로 반응시키고, CLS-safe t.rich 렌더는 컴포넌트로 분리.

- 도크 우상단 이동 + 타이틀 클릭 접기 + Run 툴팁
  - 도킹 컨트롤을 슬라이더 하단 중앙에서 헤더 우상단으로 옮겼다. collapse 화살표를 타이틀 우측에 붙이고 타이틀 전체를 ghost 클릭영역으로 만들어 클릭 시 최소화. Run 버튼에도 Tooltip을 다는데 Button이 forwardRef 미지원이라 native button + getButtonClassName으로 전환하고 loading은 Loader2 스피너를 수동 처리.

- 타이틀 접기 툴팁 + 도크 border 제거 + 노드수 회색 태그
  - collapse 버튼에 Tooltip 추가, 우상단 도크의 rounded border/bg를 떼고 버튼 그룹만 남김. 노드수는 plain 텍스트에서 회색 태그(rounded-md bg-st-muted)로.

- collapsed 재구성 + 노드뱃지 / 뱃지 ghost·info / 자동화바 트랙두께
  - 마지막 다듬기. collapsed 뷰를 [노드뱃지][Reset][Run][시작→끝 뱃지][확장]으로 재배치하고, 노드수 뱃지는 회색 제거 후 ghost 텍스트로, collapsed 시작→끝은 info Badge로. AutomationProgress 바는 트랙과 동일한 두께(h-2→h-1)로 맞췄다.

## 정리

하루의 큰 줄기는 "정보와 색을 덜어내고 표준 토큰/Card 구조 위에 다시 올리기"였다. StatusBar에서 4중 중복을 한 줄로 줄이고, Controller에서 색을 퍼플 1색으로 좁히고, 비표준 토큰을 primitive 기본값으로 통일한 뒤, 마지막에 컨트롤들을 도크로 모으고 collapsed 뷰까지 정리하는 순서로 갔다.

가장 기억에 남는 건 재생버튼 레이아웃 시프트 버그다. -translate-y-1/2로 중앙을 잡아둔 요소에 Button의 active:translate-y-px가 들어오면, 두 transform이 합쳐지는 게 아니라 후자가 transform 속성 자체를 덮어써서 중앙정렬이 통째로 날아간다. 결국 "위치는 translate, 상호작용도 translate"인 충돌을 피하려고 중앙정렬을 inset-y-0 + my-auto(레이아웃 기반)로 옮긴 게 정답이었다. transform은 한 요소에서 위치와 모션을 동시에 책임지면 이렇게 충돌한다는 걸 다시 새겼다.

또 하나는 CLS다. 노드수처럼 한 자리에서 여러 자리로 바뀌는 숫자는 고정폭 슬롯(minWidth + tabular-nums)에 넣지 않으면 클릭마다 미세하게 흔들린다. 그리고 그 숫자가 정적값(itemCount)이 아니라 슬라이더에 반응하는 값(selectedCount)이어야 한다는 걸 한 박자 늦게 잡았다. 작은 컴포넌트라도 "표시값의 출처가 반응형인가"를 먼저 따졌어야 했다. Tooltip을 달려고 Button을 native button으로 내려야 했던 것(forwardRef 미지원)도, 프리미티브 제약이 디자인 결정과 맞물리는 지점이라 기록해둔다.
