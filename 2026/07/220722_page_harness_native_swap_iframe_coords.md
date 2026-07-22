---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "Puck 기반 페이지 편집기(page-harness)의 UI를 네이티브·기본 상태에서 앱 디자인시스템 수준으로 끌어올린 하루. 새벽엔 캔버스 크롬(도크·줌·세그먼트·레이어·퀵인서트)의 시각 밀도·토큰·아이콘을 정리하고, 오전부터는 window.confirm을 ConfirmDialog로, 네이티브 select를 커스텀 Select로 교체하며 컨텍스트 메뉴 '요소 변경' 기능을 얹었다. 편집 캔버스가 iframe 안에 있다는 구조적 사실에서 비롯된 액션바·오버레이·캔버스 고착 버그들을 좌표계 관점으로 정합했고, base-ui Select 팝업과 전역 단축키가 경합하던 회귀를 capture 단계 리스너로 잡았다"
updatedAt: "2026-07-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "page-harness"
  - "puck"
  - "confirm-dialog"
  - "custom-select"
  - "base-ui"
  - "context-menu"
  - "iframe-coordinate"
  - "action-bar"
  - "design-token"
  - "keyboard-shortcut-regression"

relatedCategories:
  - "css"
  - "react"
---

# 페이지 편집기 네이티브 UI를 디자인시스템으로 교체하고, iframe 좌표계 버그를 정합한 날

> Puck 기반 페이지 편집기의 크롬을 토큰·아이콘·밀도로 정리하고, window.confirm과 네이티브 select를 앱 컴포넌트로 교체하며 컨텍스트 메뉴 '요소 변경'을 얹었다. 편집 캔버스가 iframe 안에 있다는 사실에서 비롯된 액션바·오버레이·캔버스 고착 버그를 좌표계 관점으로 잡고, base-ui 팝업과 전역 단축키의 경합을 capture 리스너로 풀었다.

## 배경

컴포넌트 갤러리와 짝이 되는 페이지 쪽, 즉 Puck 기반 페이지 편집기(page-harness)의 편집기 UI를 정돈하는 날이었다. 큰 방향은 하나였다. 아직 네이티브거나 기본 상태로 남아 있던 편집기 표면들을 앱 디자인시스템 수준으로 끌어올리는 것.

하루의 곡선이 두 세션으로 뚜렷하게 갈렸다. 새벽 세션은 캔버스 크롬의 시각을 다듬는 저위험 마감이었다. 인스펙터 패널 여백, 줌 컨트롤 단순화, 캔버스 도크의 반경·그림자 토큰화, 세그먼트 버튼 아이콘화, 레이어 패널 전체 접기·펼치기, 퀵인서트 버튼 회전 전환까지 시각 밀도와 토큰을 정리했다. 그러다 오전부터는 성격이 바뀌어, 네이티브 위젯(window.confirm, 네이티브 select)을 앱 컴포넌트(ConfirmDialog, 커스텀 Select)로 교체하고 컨텍스트 메뉴에 '요소 변경' 기능을 얹는 기능·구조 작업으로 넘어갔다.

그리고 이 두 세션을 관통해 계속 걸린 것이 "편집 캔버스가 iframe 안에 있다"는 구조적 사실이었다. 액션바가 top document 셀렉터에 안 잡히고, 새 페이지가 CSS fallback 높이에 고착되고, 선택 오버레이가 잘리는 버그들이 전부 여기서 나왔다. 캔버스는 호버·선택 상태를 스크린샷으로 잡기 어려워, 거의 모든 변경을 브라우저 실측과 콘솔 로그로 검증하는 루프가 반복됐다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 인스펙터 속성 패널 마감: 스크롤 하단 여백 + 진입 애니메이션 제거
  - 필드가 많아 스크롤될 때 마지막 필드가 패널 바닥에 붙지 않도록, 스크롤 컨테이너 자신(Chrome의 scroll-end clip)이 아니라 자식 필드 블록에 padding-bottom 20px을 뒀다. 이어서 선택 대상이 바뀔 때마다 재생되던 fade-in과 슬라이드 진입 모션을 없애 전환을 즉시화했다. 레이아웃 여백은 유지했고 미선택 상태의 EmptyState는 형제라 무영향이라 회귀에 안전했다.

- 줌 컨트롤 단순화: 가운데 % readout 제거, 버튼 툴팁 추가
  - 가운데 숫자·퍼센트 readout div와 그 클릭-타이핑 편집 머신러리를 통째로 걷어냈다. readout이 유일한 사용처였던 editable prop, SlidingNumber, AnimatePresence, editing/draft/inputRef까지 함께 제거했고, editable 제거가 puck 어댑터 필드·기본값·registry meta까지 파급돼 no-op 토글이 생기지 않도록 정리했다. -/+ 버튼만 남긴 뒤 축소·확대 버튼에 title 네이티브 툴팁을 붙였다.

- 캔버스 도크 시각 토큰화, 그리고 CSS 주석이 토큰을 삼킨 버그
  - 캔버스 도킹 바 트랙 반경을 리터럴 4px에서 var(--ph-radius-pill)로 교체하고 토큰을 16px로 정의했다. overlay elevation 그림자의 blur·spread를 키워 도크가 더 넓게 떠오르게 했다. 그런데 반경이 폴백 0px로 나오는 걸 실측하다, --ph-radius-pill 선언 위 주석 본문의 `st-*`/`ph-*` 표기에 든 `*/` 시퀀스가 CSS 주석을 조기 종료해 바로 아래 토큰 선언을 파서가 삼켜버린 걸 발견했다. 주석에서 글롭 문자를 제거해 조기 종료를 없애고 반경 토큰을 복구했다.

- 세그먼트 컨트롤 정리: 트랙 → 밀도 → 아이콘화
  - 세그먼트 컨트롤 트랙의 padding·border를 제거하고 선택 배경 대비를 강화, gap을 1px로 줄여 밀도를 높였다. 버튼 높이를 chrome-lint 밀도 스케일에 맞춰 28px(.ph-select와 정렬)로 낮췄다. 마지막으로 변형·사이징·가로/세로 고정 세그먼트를 아이콘 버튼으로 바꾸고(세로/가로/격자/카드 → Rows3/Columns3/LayoutGrid/Square 등), 라벨은 title·aria-label 툴팁으로 옮겨 a11y를 유지했다.

- 레이어 패널 전체 접기·펼치기 토글 (codex 위임)
  - Page 행 우측에 ChevronsUp(전체 접기)·ChevronsDown(전체 펼치기) 버튼을 추가했다. collapseAll은 자식 있는 노드 id를 모아 collapsed에 넣고 expandAll은 초기화한다. 개별 캐럿 토글·다중선택과 독립 동작하도록 stopPropagation으로 Page 행 선택과 충돌을 막았다. 구현은 codex exec에 위임하고 이 세션이 typecheck·eslint·브라우저 3케이스 실측으로 검증했다.

- 퀵인서트 도킹 + 버튼 45도 회전 X 전환 (codex 위임)
  - QuickInserter의 children prop을 ReactElement 또는 (open) => ReactElement로 확장해 팝오버 열림 상태를 트리거에 노출했다(기존 호출부 하위호환). 도킹 + 버튼은 별도 X 아이콘으로 스왑하는 대신 같은 Plus 아이콘을 열림 시 45도 회전시켜 X처럼 보이게 해, 전환과 회전 트랜지션을 한 번에 풀었다. 전용 accent 톤은 제거해 다른 도크 버튼과 같은 톤을 상속했다(이전 지시를 사용자가 번복). 구현은 codex 위임, 브라우저 실측으로 검증했다.

- 네이티브 window.confirm을 ConfirmDialog로: 비동기 배관부터
  - 먼저 라우터 NavBlocker 타입을 () => boolean | Promise<boolean>로 확장하고 navigate()를 async로 바꿔 각 blocker를 순서대로 await하게 했다. await는 동기 boolean도 통과시켜 기존 blocker는 무변경으로 동작한다. 이 비동기 토대 위에, SaveNoteDialog와 같은 패턴(@maxflow/ui/dialog, 전역 토큰)으로 범용 ConfirmDialog 컴포넌트를 만들고, EditRoute의 두 window.confirm(미저장 이탈, 코드 승격)을 Promise 기반 confirm 헬퍼로 교체했다. grep으로 window.confirm 0건을 확인했고, beforeunload는 플랫폼 제약이라 범위 밖으로 뒀다.

- 인스펙터 네이티브 select를 커스텀 Select로 교체
  - native-fields의 select 데코레이터가 네이티브 <select> 대신 @maxflow/ui Select(base-ui 팝오버)를 렌더하도록 바꿨다. 한 배선점(config.puckOverrides.fieldTypes)만 고쳐 스키마 select 51개 필드에 일괄 적용했고, 다중선택 writeAll·Mixed(en-dash) 표시·리셋을 보존했다. 이어서 역할 필드 RoleControl의 리터럴 select도 같은 커스텀 Select로 교체하며 임시 옵션 토큰을 걷어냈다.

- 퀵인서터 팝오버 정리: 폭 → 마지막 탭 기억 → 오픈 애니메이션 제거
  - 사용자 실시간 피드백 기반으로, 검색+탭과 리스트 사이 구분선을 넣었다 다시 빼고, 내부 gap을 16px로, 리스트 항목의 "+ 추가하기" pill을 제거(행 클릭만으로 충분), 최근 사용 항목에 개별 삭제 버튼을 stopPropagation으로 분리해 붙였다. 이후 마지막으로 연 탭(레이아웃/컴포넌트/템플릿)을 localStorage에 기억해 재오픈 시 복원하게 했고, 오픈 시 scale/opacity 애니메이션을 제거해 즉시 표시로 바꿨다(instantClose 패턴 재사용, 다른 Popover 소비처는 무영향).

- 새 페이지 최초 마운트 시 캔버스 세로 고착 버그
  - 새 페이지 QHD 최초 진입 시 캔버스가 짧고 넓게 렌더됐다. syncArtHeight가 RootRender의 --ph-page-h 세팅 전에 CSS hard-fallback(1080px)을 --ph-art-h에 pin하면, body가 height:100%로 그 값을 순환 추종해 영원히 고착됐다. 4K↔QHD 토글만 이를 removeProperty 후 재측정해 정상화하던 상황이었다. --ph-page-h 미확보 시 pin하지 않는 가드를 모든 호출부에 넣어 근본 원인을 차단했고, 마운트도 "고착 값 제거→재측정"은 거치되 줌 재-fit만 마운트 때 스킵해 저장 배율을 존중했다.

- 컨텍스트 메뉴 '요소 변경' 기능
  - 우클릭 메뉴 첫 항목의 프로그램적 포커스 시 뜨던 파란 UA 포커스 링을 제거해 accent 배경으로 통일하는 것부터 시작했다. 그 위에 '요소 변경' 항목을 추가해, 선택 노드 자신의 자리에서 QuickInserter를 열었다(잠금·다중선택 비활성). 픽하면 target()에서 원본을 remove한 뒤 같은 index에 insert해 형제 순서와 부모 위치를 유지한 채 그 자리에서 교체되게 했다. 끝으로 컨텍스트 메뉴의 시각 강조를 '요소 변경' 항목으로 옮겼다.

- 캔버스 상단 중앙 페이지 이름·크기 태그
  - 아트보드 상단 중앙에 "이름 · WxH" 정보 태그를 CanvasDock과 같은 오버레이 계층에 얹었다. 크기는 pageSize/pageHeight로 실시간 반영하고, title은 EditRoute에서 태그까지 prop으로 전달했다. pointer-events:none으로 클릭에 무간섭이다.

- 인스펙터 편집 편의: placeholder 기본값 + 2열 배치
  - text/textarea 필드에 스키마 placeholder가 없을 때 라벨 기반 기본 안내를 부여했고(스키마 값 우선), 숫자 입력 placeholder를 "예: 16"으로 구체화했다. 또 인스펙터 카테고리 필드 컨테이너를 컨테이너 쿼리로 260px 이상 폭에서 2열 그리드로 전환하되, textarea·swatches·spacing-box처럼 넓은 편집면이 필요한 컨트롤은 grid-column 1/-1로 예외 처리했다.

- 칸반 보드 프리셋 툴바 Placeholder fill
  - 칸반 보드 프리셋의 보드 툴바 Placeholder에 _widthMode fill을 추가했다.

- 액션바를 라벨 배지 위 중앙으로, 그리고 iframe에서 안 먹던 셀렉터 수정
  - Puck 내장 ActionBar의 인라인 위치(우측·top:-44px)를 부분일치 셀렉터로 오버라이드해, 라벨 배지 위까지 확보한 -68px로 올리고 가로 중앙 정렬, 캔버스 CSS 줌 역수로 배율을 보정했다. 그런데 iframe-on 모드(기본값)에서 이 오버라이드가 전혀 안 먹었다. 액션바 DOM은 iframe.contentDocument 안에 있는데 .ph-editor·.ph-compose-canvas는 top document에만 있어 별도 document라 CSS 상속이 건너오지 않았던 것이다. .ph-editor 조상 요구를 제거해 iframe 안에서도 항상 매치되게 하고, --ph-actionbar-zoom 미정의 시 폴백 1을 추가했다(iframe-on은 iframe 요소 자체가 scale로 통째 스케일되므로 내부 요소는 추가 보정 불필요).

- 실행취소 토스트를 캔버스 좌표계 하단 중앙으로 재배치
  - ToastHost를 고정 뷰포트에서 캔버스 래퍼로 옮겨 CanvasDock과 같은 좌표계를 공유하게 했다. 좌·우 패널 폭이 달라도 중심선이 맞는다. fixed top-center에서 absolute bottom-center(80px)로 바꾸고 알약형 반경·글래스 배경·elevation 토큰을 적용했으며, 토스트 액션 버튼에 aria-label을 붙이고 저장 배너 이모지를 걷어냈다.

- iframe 선택 오버레이 잘림 방지
  - iframe 안 선택 오버레이가 잘리던 것을 막았다.

- 전역 키보드 단축키가 base-ui Select 팝업 Enter/화살표를 가로채던 회귀 수정
  - 커스텀 Select 교체의 review 반려 대응이었다. PuckKeyboard의 window keydown 리스너가 Select 팝업 안 Enter까지 처리해 "선택 노드의 첫 자식 선택" 단축키를 발동시켰다. 콘솔 로그로 이벤트 타깃이 role="combobox"(Select 트리거 버튼)임을 확인했는데, base-ui는 팝업이 열려도 DOM 포커스가 트리거에 남고 aria-activedescendant로만 하이라이트해 기존 input/textarea 가드에 안 걸렸다. el.closest로 role="listbox"/"combobox"/"option"일 때 전역 리스너가 양보하도록 가드를 넣되, bubble 단계에 걸면 base-ui가 같은 keydown의 bubble에서 이미 팝업을 언마운트해 가드가 무력화되므로 리스너를 capture 단계로 옮겨 타이밍 경합까지 해소했다. 선택 하이재킹 재현은 스크린샷으로 확인했으나, 세션 자동화가 불안정해져 "값 자체가 안 바뀜" 증상 재검증은 못 끝내 review에 추가 실측을 권장했다.

- 치트시트 키캡 대비 강화
  - 단축키 치트시트의 키캡 대비를 높였다.

- page-gallery 마무리: 오버레이 안정화·appender 제거·선택 도크·헤더 메뉴
  - 갤러리 쪽 편집기 진입 오버레이를 안정화하고, 레이아웃 appender를 제거하며 auto resize를 복구했다. 선택 도크를 중앙 정렬하고 코너 리사이즈를 추가했으며, 헤더 메뉴 팝오버를 애니메이션 없이 즉시 열리게 했다.

## 정리

이날의 축은 "페이지 편집기에 아직 네이티브거나 기본 상태로 남아 있던 표면들을 앱 디자인시스템 수준으로 끌어올린다"였다. 새벽 세션이 크롬의 시각(토큰·아이콘·밀도)을 정리했다면, 오전 세션은 네이티브 위젯 자체를 교체했다. window.confirm 두 곳은 ConfirmDialog로, 네이티브 select 52곳(스키마 51 + 역할 1)은 커스텀 Select로 바뀌었다. 배운 건 이런 교체가 위젯을 그냥 갈아끼우는 게 아니라 배관을 먼저 깔아야 한다는 점이었다. confirm 교체는 라우터 NavBlocker를 비동기로 확장하는 토대가 먼저였고, select 교체는 한 배선점(fieldTypes)으로 51개 필드에 일괄 적용하는 구조가 먼저였다. 토대를 하위호환으로 깔아두니 교체 자체는 얇게 얹혔다.

가장 많은 시간을 먹은 뿌리는 "편집 캔버스가 iframe 안에 있다"는 구조적 사실이었다. 액션바 오버라이드가 안 먹은 건 셀렉터가 top document에만 있고 액션바 DOM은 iframe.contentDocument 안이라 CSS 상속이 건너오지 않았기 때문이고, 새 페이지 세로 고착은 --ph-art-h가 CSS fallback 값을 순환 추종한 것이며, 오버레이 잘림도 같은 계열이었다. 서로 달라 보이던 버그들이 결국 "이 요소가 어느 document·어느 좌표계에 있는가"라는 한 질문으로 수렴했다. 좌표계를 먼저 물으면 증상이 아니라 원인이 보인다는 걸, iframe 편집기에서 다시 확인했다.

세밀한 검증이 두 번 결정적이었다. 하나는 --ph-radius-pill이 폴백으로 떨어지던 걸 실측하다 발견한 CSS 주석 조기 종료 버그였다. 주석 안 `*/` 한 시퀀스가 바로 아래 토큰 선언을 삼킨, 눈으로는 절대 안 보이는 종류였다. 다른 하나는 전역 단축키가 base-ui Select 팝업의 Enter를 가로채던 회귀로, 콘솔 로그로 이벤트 타깃이 트리거 버튼(role="combobox")임을 잡아내고서야 "base-ui는 팝업이 열려도 포커스가 트리거에 남는다"는 특성을 이해했고, 그제야 리스너를 capture 단계로 옮기는 해법이 나왔다. 캔버스는 상태를 스크린샷으로 잡기 어려운 표면이라, 눈에 안 보이는 버그일수록 "무엇을 측정하면 이게 맞다고 할 수 있는가"를 먼저 정하는 습관이 하루를 지탱했다.
