---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "Puck 기반 페이지 하네스 편집기를 하루 종일 Figma식으로 밀어붙인 날. 새벽에 커서 시스템(드래그 grabbing·hover default)을 통일하고, 오전엔 lint·단위테스트 구성과 저장소 위생을 세운 뒤, 오후엔 마퀴/Shift 다중선택과 Cmd+S, 스페이싱·크기 필드의 램프 슬라이더 재설계, QuickInserter 6연타 리스타일(검색창·탭·리치 행·최근사용), 우클릭 컨텍스트 메뉴 다크 리스타일과 팝오버 위치 교정, 인스펙터 아코디언 정책, 새 페이지 QHD 고정, 시작구조 preset 확장과 구조기반 미리보기·검색까지 편집기 전면을 관통했다. 큰 리팩터 뒤에는 e2e 자기모순·구UI 참조 selector를 되짚어 잡았다"
updatedAt: "2026-07-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "page-harness"
  - "puck"
  - "figma-style"
  - "quick-inserter"
  - "context-menu"
  - "multi-select"
  - "ramp-slider"
  - "adopted-stylesheets"
  - "e2e-selector"
  - "vitest-eslint"

relatedCategories:
  - "css"
  - "react"
  - "testing"
---

# 페이지 하네스 편집기 Figma식 전면 폴리시와 테스트 인프라

> Puck 기반 페이지 편집기를 하루 종일 Figma식으로 다듬은 날. 새벽 커서 통일에서 시작해 lint·단위테스트 인프라를 세우고, 다중선택·저장 단축키·스페이싱 필드 재설계·QuickInserter 6연타·컨텍스트 메뉴 다크화·인스펙터 아코디언·시작구조 preset까지 편집기 전면을 관통하며, 큰 리팩터 뒤엔 깨진 e2e를 되짚어 잡았다.

## 배경

컴포넌트 갤러리와 짝을 이루는 페이지 쪽, 즉 Puck 기반 페이지 하네스 편집기를 하루 통째로 Figma 감각에 맞춰 밀어붙인 날이었다. 흐름은 크게 세 덩어리로 읽힌다. 새벽엔 커서 시스템을 손봤고, 오전엔 lint와 단위테스트 구성, 그리고 그동안 미뤄둔 저장소 위생(불필요 파일 삭제, .DS_Store ignore)을 세웠다. 오후부터 저녁까지가 본편이다. 캔버스 다중선택과 저장 단축키 같은 상호작용부터, 속성 패널의 스페이싱·크기 필드 재설계, QuickInserter 리스타일 연타, 우클릭 컨텍스트 메뉴 다크화, 인스펙터 아코디언 정책, 새 페이지 캔버스 크기 고정, 시작구조 preset 확장까지 편집기의 거의 모든 표면을 건드렸다.

하루의 성격을 관통하는 두 가지가 있었다. 하나는 Figma를 레퍼런스로 삼은 시각·상호작용 통일이고, 다른 하나는 큰 UI 교체 뒤에 반드시 따라온 테스트 정합성 회복이다. 스페이싱 필드를 칩 팝오버에서 램프 슬라이더로 갈아엎자 같은 컴포넌트를 참조하던 e2e들이 구 UI selector를 그대로 붙들고 깨졌고, 그걸 되짚어 잡는 과정이 리팩터만큼의 무게를 가졌다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 갤러리 dev 서버에 registry HMR 워처 추가
  - ui-harness의 registryHmr 플러그인을 page-harness 갤러리 vite.config에 이식했다. entries·staging 디렉토리를 직접 watch해서 add/unlink가 나면 registry 모듈을 invalidate하고 full-reload한다. 덕분에 컴포넌트 갤러리에서 만든 새 엔트리가 페이지 갤러리 dev 서버를 재시작하지 않아도 QuickInserter에 바로 뜨고, 삭제하면 사라진다. 기존 pagesHmr/pagesApi는 유지.

- 캔버스 컴포넌트 hover 커서를 select 모드에서 default로
  - select 모드에서 Puck이 data-puck-component에 강제하는 grab 커서를 default로 바꿨다. 핵심은 주입 방식이었다. head에 append한 style 자식은 Puck(react-frame-component)이 iframe head를 재조정하며 마운트 도중 씻겨나가 회복되지 않았는데(ph-artboard-size와 같은 불안정), IframeBridge의 커서 주입을 adoptedStyleSheets로 옮겨 근본 해결했다. iframe이 꺼진 경우엔 nav-panel.css에 pan 모드가 아닐 때만 default를 주는 폴백을 뒀다. pan의 grab/grabbing과 드래그핸들·스플리터·버튼 커서는 회귀 없음을 실측했다.

- 편집기 커서 시스템 Figma식 통일
  - 컴포넌트 재정렬 드래그 중에는 host 캔버스와 iframe 아트보드 커서를 grabbing으로 전환하고 종료 시 원복하도록 했다(Puck isDragging 신호를 선언형 클래스로 받아 adoptedStyleSheets 한 시트에 합류). 도구 도크의 토글류(커서모드·뷰포트·화면맞춤·패널접기)는 default로 통일하고, 삽입 실행형인 quick-insert와 줌 -/+만 pointer를 유지했다. 손댄 커서 규칙 근처에 근거 주석을 남겼다.

- 저장소 정리(gitignore·ActionBar·sample 데이터)
  - .gitignore를 손보고 ActionBar에서 죽은 코드를 걷어냈으며 sample-composed 데이터를 갱신했다. 이어서 추적되던 .DS_Store 바이너리를 삭제하고, 뒤이어 .DS_Store를 ignore 목록에 추가해 다시 딸려오지 않게 막았다. macOS 메타파일이 반복 커밋되던 잡음을 이 시점에 정리했다.

- lint·단위테스트 구성 추가
  - gallery/src를 대상으로 eslint.config.mjs를 신설했다(typescript-eslint recommended + react-hooks + react-refresh + prettier 연동). 최초 통과에서 쏟아진 대량의 기존 위반은 규칙을 끄지 않고 warn으로 낮춰 통과시키고 후속 점진 정리 대상으로 남겼다. package.json에 lint·test 스크립트를 넣고 verify를 typecheck·lint·test·test:e2e 4단계로 확장했다. api.test.ts로 compareSemver/derivationsOf 순수 함수 단위테스트 9개를 붙였다. 이 과정에서 발견한 회귀 하나가 값졌다. @playwright/test devDep 추가 후 재설치하면 hoisted node_modules의 .bin/playwright가 apps/web의 동명 패키지로 잘못 연결돼 e2e 전체가 로드 시점에 크래시했는데, test:e2e가 cli.js를 상대경로로 직접 호출하도록 바꿔 근본 수정했다. baseline 격리 재현으로 회귀를 확인하고 수정 후 동일 결과로 검증.

- 편집 캔버스 마퀴 다중선택·Shift+클릭 추가선택
  - 실제 마우스 드래그로 마퀴가 안 되던 원인을 규명했다. 마퀴 로직 자체는 정상이었으나, pointerup 직후 브라우저가 다운·업 타겟의 공통 조상(빈 영역)에 native click을 합성하고, 이 click이 Puck의 "빈 영역 클릭 → 루트 해제"를 태워 방금 담은 다중선택을 즉시 지웠다. JS로 PointerEvent만 dispatch하는 테스트는 click이 합성되지 않아 통과하고 실제 드래그만 실패하던 함정이었다. 마퀴가 실제 발동했을 때 이어지는 그 한 번의 click을 doc capture 단계에서 삼켜 루트 해제를 막았다. Shift+좌클릭 토글 다중선택은, 노드 선택이 click(shiftKey 미검사)에서 일어나므로 doc capture로 먼저 가로채 stopPropagation 후 selection-store를 토글하게 했다(Set 먼저 갱신 후 primary 이동). 평범한 클릭엔 개입하지 않아 회귀 없음.

- Cmd/Ctrl+S로 저장 다이얼로그 열기
  - EditRoute에 전역 keydown 리스너를 달아 (meta|ctrl)+S에서 브라우저 기본 저장을 preventDefault로 막고 handleSave로 SaveNoteDialog를 연다. 입력 필드에 포커스가 있어도 동작하도록 대상 태그로 거르지 않았다.

- 스페이싱/크기 필드를 램프 스냅 슬라이더+커스텀 숫자입력으로 재설계
  - 속성 패널의 여백·간격·높이 필드를 3x3 칩 팝오버와 회색 셰브론에서 램프 스냅 슬라이더와 우측 커스텀 숫자입력으로 통째로 교체했다. 슬라이더는 램프 인덱스 도메인(0..len-1)으로 균등 간격 스냅하고, 우측 숫자입력엔 램프에 없는 임의 px도 타이핑할 수 있게 열어 "자유입력 금지" 원칙을 의도적으로 뒤집었다. 숫자입력 좌측엔 필드 의미 아이콘(여백=Ruler, 간격=MoveHorizontal, 높이=MoveVertical)을 붙이고, onFocus 전체선택, 높이 빈 입력은 자동으로 처리했다. 회색 셰브론과 ChipGrid는 제거하고 계약 테스트도 새 슬라이더 계약으로 갱신했다.

- e2e 자기모순·구UI 참조 selector 수정
  - 위 재설계의 뒷정리다. scrub.tsx 주석이 "해당 셰브론 클래스는 더는 없다"를 설명하며 그 클래스명 문자열을 그대로 적어, 같은 흐름의 정적 테스트가 그 문자열의 부재를 단언하는 것과 충돌해 자기모순으로 실패했다. 주석에서 리터럴을 제거했다. 또 스페이싱의 '모두/개별' 모드 세그먼트가 정당하게 role=radiogroup을 쓰는데 파일 전체 블랭킷 검사로는 옛 ChipGrid와 구분이 안 돼 그 단언을 걷어냈다. 재설계가 AC-D-06 섹션 e2e만 새 UI에 맞췄던 탓에 같은 컴포넌트를 쓰는 다른 섹션들이 구 UI selector(팝오버·칩·radiogroup)를 붙든 채 깨져 있어, 전부 새 UI selector로 갱신했다. 프로덕션 코드는 주석 2줄 외 무변경, track-d 전체 재실행으로 무관한 사전결함 외 전부 통과를 확인했다.

- z-modal-backdrop·z-modal-popover 유틸을 tokens.css에 추가
  - 갤러리 등 @maxflow/ui theme.css 소비처는 packages/ui의 tokens.css를 로드하는데, 이 파일이 z-modal-backdrop/z-modal-popover 유틸을 정의하지 않아 dialog Backdrop 클래스가 unmatched로 z-index:auto로 떨어졌고, 그 결과 도킹바·툴바보다 뒤에 그려졌다. 값은 apps/web globals.css의 SSOT(45/55)와 일치시켜 tokens.css에 채웠다.

- 격자 배치 필드 비활성 시 dimmed 세그먼트 렌더
  - 열스팬·열시작·행스팬 같은 격자 배치 필드가 비활성일 때 그냥 사라지지 않고 흐린 세그먼트로 남아 있도록 size.tsx와 segment.css를 손봤다. 조건이 안 맞을 때도 자리를 dimmed로 보여줘 레이아웃이 덜컹이지 않게 했다.

- QuickInserter: 축소/확장 토글 제거·항상 확장 폭 고정 단일열
  - 여기서부터 QuickInserter 리스타일 연타가 시작된다. 먼저 expanded 상태와 확장 버튼, Maximize/Minimize 아이콘, SectionSchema를 걷어내고 팝오버를 항상 640px 폭으로 고정했다. 4열 그리드 카드를 폐기하고 단일열 리스트로 바꾼 뒤 리스트 높이를 리치 행에 맞춰 420px로 올렸다.

- QuickInserter: 검색창을 탭 위로 재배치·좌측 시작점 정렬
  - 이미지 기준(상단 검색, 그 아래 탭)에 맞춰 검색 input을 tablist 위로 옮겼다. 탭 트랙 padding을 0으로 투명화하고 탭 버튼 padding을 0 8px로 잡아 검색 인셋(8px)과 좌측을 맞춰, 6px 어긋나던 정렬을 해소했다.

- 우클릭 컨텍스트 메뉴 Figma식 다크 리스타일
  - 메인 패널과 서브메뉴 배경을 테마와 무관하게 항상 다크(--ctx-menu-* 토큰, oklch)로 고정하고 텍스트를 밝게 올렸다. 항목 hover 배경은 accent 토큰으로, transition은 background-color 90ms 단일로 정리했다. 오픈 시 framer-motion scale/fade는 이 인스턴스만 transform/opacity !important와 instantClose로 제거했다. 서브트리거 화살표는 flex:1로 우측 끝에 정렬하고, '자식 요소 추가' 항목은 평상시부터 accent 배경으로 강조했다. chrome-lint 준수를 위해 서브메뉴 radius를 6에서 4px로, box-shadow를 overlay 스코프로 좁혔다.

- QuickInserter: 검색창 Figma 스타일(연회색 배경·돋보기·지우기 X)
  - input을 래퍼로 감싸 연회색(--st-muted) pill 배경과 좌측 Search 아이콘을 붙였다. q가 있을 때만 우측 X 버튼을 노출하고, 누르면 q를 비우며 input에 재포커스한다. input 자체는 투명·무테두리로 두고 포커스 링은 래퍼의 :focus-within으로 처리했다.

- QuickInserter: 탭 트랙 투명·활성탭만 연회색 pill
  - 기본 탭은 배경 없이 옅은 텍스트로 두고, 활성 탭만 연회색 pill과 진한 텍스트로 구분했다. hex 리터럴 없이 st 토큰만 써서 chrome:lint를 통과시켰다.

- QuickInserter: 리스트 행에 설명+추가하기 pill 리치 행
  - InserterEntry에 desc를 추가하고(레지스트리 meta.summary 소스, 템플릿은 hint) 행을 좌 썸네일·제목+설명 1줄·우 '+ 추가하기' pill의 리치 행으로 재구성했다. 추가 pill은 nested button이 불가해 span 장식(aria-hidden)으로 두고 삽입은 행 전체 클릭으로 유지했다. summary가 없는 레이아웃 프리미티브는 설명 줄을 생략한다.

- QuickInserter: 최근 사용을 탭별 상단 섹션으로 분리
  - 별도 recents 탭을 없애 3탭 고정으로 두고, 전역 recents를 탭 종류(layout/components/templates)로 필터링했다. 각 탭 리스트 최상단에 '최근 사용' 섹션을 기본 3개로 얹고 초과 시 '모두 보기'로 전체를 펼친다. 검색어가 있을 땐 최근 섹션을 숨겨 결과에 집중하고, 탭·검색 전환 시 펼침을 리셋한다.

- 새 페이지 생성 시 캔버스 크기를 QHD로 명시 고정
  - pick에서 preset.data의 root.props.pageSize가 비어 있으면 withDefaultPageSize로 DEFAULT_PAGE_SIZE(qhd)를 데이터에 명시한다. 런타임 폴백이 아니라 생성 시점에 값을 기록하는 방식이고 기존 지정값은 존중한다. 순수 로직은 page-size-core로 분리해 목록 라우트가 편집기(puck) 청크 없이 재사용하게 했다.

- 아코디언 섹션 헤더·본문 상하 여백 확대
  - editor-chrome.css에서 아코디언 섹션 헤더와 본문의 상하 여백을 넓혀 섹션 사이 리듬을 줬다.

- 인스펙터 섹션 기본 접힘 정책(일반만 펼침) + 토글 표시상태 기준 수정
  - 인스펙터 섹션의 기본 상태를 '일반 섹션만 펼침'으로 잡고, 토글의 표시상태 판정 기준을 실제 표시 상태에 맞게 고쳤다. editor-stores와 FieldsOverride를 함께 손봤다.

- 카테고리 미분류 최상단 필드를 일반 아코디언 섹션으로 묶기
  - 카테고리가 없어 패널 최상단에 흩어져 있던 필드들을 '일반' 아코디언 섹션 하나로 묶어, 위 접힘 정책과 결이 맞게 정리했다.

- 섹션 부제목 11px·600으로 본문과 구분
  - 섹션 부제목을 11px·600으로 눌러 본문과 위계를 구분했다. chrome:lint의 규칙8(폰트 웨이트)에 걸리는 의도된 예외라, 뒤이어 .chrome-section-head 전용 font-weight 예외를 allowlist에 추가해 600을 유지하면서 chrome:lint ERROR 0건을 맞췄다.

- 우클릭 자식 요소 추가 팝오버를 실제 클릭 위치에서 열기
  - 노드 rect 우측하단을 앵커로 삼던 방식(iframe 좌표변환·캔버스 clamp)을 걷어내고 우클릭 좌표(menu.x/y)를 앵커로 썼다. 이제 캔버스든 레이어 패널이든 우클릭한 실제 마우스 위치에서 QuickInserter가 열린다. 뷰포트 8px 인셋 clamp로 화면 밖 잘림은 막았다.

- 시작구조 preset 3종 추가(dashboard-shell·holy-grail·kanban-board)
  - 새 페이지 시작구조 선택지에 dashboard-shell(상단 nav + 좌 SNB + 우 콘텐츠 3분할), holy-grail(헤더 + 3열 + 푸터), kanban-board(툴바 + 3 상태 컬럼)를 추가했다.

- 시작구조 선택 개선: 구조기반 미리보기 + 검색
  - Schematic 미리보기에서 id 하드코딩 매칭(6개만)을 걷어내고, preset의 Puck content(Grid/Row/Stack/Frame·_colSpan·height)를 읽는 제네릭 와이어프레임으로 전환해 15개 preset이 각기 다른 미리보기를 갖게 했다. 다이얼로그 상단에 고정 검색 input을 붙여 name·description·keywords를 대소문자 무시로 매칭하고 0건이면 결과 없음을 보인다. 이를 위해 Preset 타입에 keywords를 노출하고 merge 이월도 처리했다.

- 결과 없음 빈상태 text-center 제거
  - 위 검색의 '결과 없음' 빈상태가 chrome:lint의 좌측정렬 규칙과 어긋나, text-center를 제거해 규칙에 맞췄다.

## 정리

하루를 관통한 큰 줄기는 두 갈래였다. 하나는 Figma를 레퍼런스로 삼아 편집기의 커서, 컨텍스트 메뉴, QuickInserter, 인스펙터, 시작구조 선택까지 시각과 상호작용을 한 감각으로 통일한 것이고, 다른 하나는 그 큰 교체들이 남긴 테스트와 lint의 부채를 그때그때 갚은 것이다.

가장 배운 점은 큰 UI 교체가 코드 한 파일에서 끝나지 않는다는 감각이었다. 스페이싱 필드를 칩 팝오버에서 램프 슬라이더로 갈아엎는 순간, 같은 컴포넌트를 참조하던 e2e들이 조용히 구 UI selector를 붙든 채 깨졌고, 심지어 "그 클래스는 이제 없다"고 적은 주석의 문자열마저 정적 테스트의 부재 단언과 자기모순을 일으켰다. UI를 바꾸면 그 UI를 가리키던 모든 참조(테스트 selector, 주석 속 리터럴, lint 규칙 예외)를 같은 호흡으로 되짚어야 한다는 걸 반복해서 확인했다.

주입 안정성도 오늘의 결이었다. 커서든 아트보드 크기든 head에 append한 style은 Puck의 iframe head 재조정에 씻겨나가 회복되지 않았고, adoptedStyleSheets로 옮겨야 근본이 잡혔다. 마퀴 다중선택이 브라우저가 합성하는 native click 한 번에 지워지던 문제나, playwright bin이 동명 패키지로 잘못 연결돼 e2e가 로드 시점에 크래시하던 회귀처럼, 겉으로 드러난 증상 아래의 진짜 원인(합성 이벤트, 심볼릭 링크 충돌, 스타일시트 재조정)을 규명해 근본에서 막은 것들이 오늘 만족스러웠던 지점이다. 저녁엔 lint 예외 하나까지 chrome:lint ERROR 0건에 맞춰 마감했다.
