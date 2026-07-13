---
draft: true
type: "content"
domain: "frontend"
category: "page-harness"
topic: "Puck 기반 page-harness 신규 앱을 하루 만에 P1 캔버스에서 P2 스킬·CLI, 동시성 하드닝, gallery 미감 이식, 팔레트 프리뷰·검색까지 관통"
updatedAt: "2026-07-10"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "page-harness"
  - "puck-editor"
  - "optimistic-concurrency"
  - "file-lock"
  - "design-system"
  - "intersection-observer"

relatedCategories:
  - "ui-harness"
  - "design-system"
  - "react"
---

# page-harness 신규 앱: Puck 캔버스에서 팔레트 검색까지 하루 관통

> ui-harness의 등록 컴포넌트를 손으로 조립해 페이지를 만드는 신규 앱을 P1 스캐폴드부터 동시성 하드닝과 편집기 폴리싱까지 하루에 세운 기록.

## 배경

ui-harness 갤러리에는 검증된 컴포넌트가 90종 넘게 쌓였지만, 이걸 실제 페이지로 엮는 도구는 없었다. 그래서 gallery에 등록된 컴포넌트를 팔레트로 끌어와 페이지를 손으로 조립하는 별도 앱 page-harness(포트 9222)를 새로 세웠다. 하루의 흐름은 P1 편집기 캔버스를 세우고, P2에서 스킬·CLI로 자동 고도화 경로를 붙이고, 다중 사용자 동시성 결함을 하드닝한 뒤, ui-harness gallery와 똑같이 읽히도록 미감을 이식하고, 마지막으로 편집기 UX 밀도와 팔레트 검색까지 폴리싱하는 것이었다. 편집 도구는 밑바닥부터 만들지 않고 Puck 0.20을 편집기로 채택해 캔버스·드래그·인스펙터를 얻고, 그 위에 레지스트리 팔레트와 저장 규약을 얹는 방향으로 갔다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- P1: Puck 캔버스 + 레지스트리 팔레트 + 동시성-안전 저장
  - packages/page-harness 신규 앱을 세우고, gallery 등록 컴포넌트(90종)로 페이지를 손으로 조립하는 Puck 0.20 편집기를 얹었다. entries/*.json을 읽어 팔레트를 자동 구성하고, 레이아웃 프리미티브 8종을 함께 제공했다.
  - 각 노드는 엔트리의 .demo.tsx(자립 렌더)를 그리고, 노드별 에러경계로 하나가 터져도 편집기 전체가 무너지지 않게 격리했다.
  - 저장은 pages/<slug>.json에 atomic tmp+rename으로 쓰고, baseVersion 불일치 시 409를 돌려주는 낙관적 동시성과 slug·path traversal 가드를 처음부터 넣었다. 라우트는 목록·편집(/edit/:slug)·뷰(/p/:slug) 3종이고 외부 변경은 HMR로 통지한다. P0 시절의 하드코딩 렌더러는 Puck으로 대체했다.

- P2: /page-harness 스킬(refine) + page CLI + 렌더 견고화
  - "손으로 조립 → AI로 고도화"라는 2-speed 프로토콜을 스킬(SKILL.md·GUIDE.md)로 정의했다. 스킬은 컴포넌트를 새로 만들지 않고(없으면 /ui-harness에 위임), get→set --base로 낙관적 동시성을 지키며 딥링크로 브라우저 검수까지 한다.
  - scripts/page.mjs에 list/get/catalog/create/set CLI를 붙였고, catalog는 demo를 가진(=앱이 실제로 렌더 가능한) 컴포넌트만 노출한다.
  - 렌더 견고화로 레이아웃 slot에 직접 스타일을 부여해 Grid/Row/Stack의 2열을 정상화하고, config에 없는 type은 sanitizeData가 Placeholder로 격하시켜 무음 빈칸을 막았다.

- 하드닝: 다중사용자 동시성·데이터손실·견고성 (적대적 검증 39건 반영)
  - 서버(vite-plugins.ts)와 CLI(page.mjs)가 같은 규약을 쓰도록, 기존 파일 저장에 baseVersion/--base를 필수로 만들어 무검사 덮어쓰기를 차단했다. read→check→write를 프로세스 간 파일락(${path}.lock, O_EXCL + stale steal)으로 감싸 TOCTOU lost update를 막았다.
  - 삭제·손상 파일에 base 저장 시 409(gone/corrupt)로 v1 무음 부활을 차단하고, create는 O_EXCL 원자 생성, atomicWrite에 fsync, 부팅 시 고아 tmp·lock 청소를 넣었다.
  - "미해결 컴포넌트:" Placeholder가 같은 id의 실제 노드를 덮지 못하게 서버가 preserveReal로 강제 복원하고, sanitizeData가 중복 id를 재발급하되 원 id를 보존해 복원 매칭을 유지하게 했다. 저장 실패는 편집기를 언마운트하지 않는 비파괴 배너로 처리하고, 변경 요청에 Origin 검사(로컬 9222만)를 걸었다.

- 폴리싱: gallery 동일 UX 이식 + 개발자 목업 플로우(프리셋·히스토리)
  - ui-harness gallery의 로고·파비콘·styles.css(디자인시스템 473줄) 전체를 이식해, sticky header-elevate·ThemeToggle·skip-link·스크롤 elevation·맨위로·a11y까지 같은 서비스처럼 보이게 했다. 편집기·뷰는 자체 상단바를 쓰는 chromeless로 유지했다.
  - 새 페이지를 만들 때 '시작 구조 선택' 프리셋 6종(빈·사이드바+본문·헤더+카드·대시보드·폼·리스트+상세)을 미니 와이어프레임으로 제시하는 PresetPicker를 넣었다. 프리셋은 프리미티브와 Placeholder만 써서 항상 정확히 렌더되고, 이후 /page-harness 스킬이 Placeholder 자리를 실제 컴포넌트로 채운다.
  - 편집 히스토리를 사이드카(pages/<slug>.history.jsonl, append-only O_APPEND)로 남겼다. create/edited/refined 이벤트를 {at,actor,action,note,version}로 기록하고 HistoryPanel 드로어로 보여준다. 서버·CLI가 같은 파일락으로 append도 동시성 안전하게 처리하고, 목록·HMR은 *.json만 다뤄 사이드카를 건드리지 않는다.

- 폴리싱 30R: gallery 시각 정합·다크모드·a11y (적대적 분석 57건 반영)
  - 로고 락업 어순을 제품명(PAGE-HARNESS)에 맞추고, Edit/View 상단바 버튼을 gallery의 secondary/primary 관용구로 통일했다. ViewRoute 헤더도 gallery Shell 크롬으로 승격했다.
  - 모달 스크림의 bg-st-foreground/40이 다크모드에서 흰 워시로 보이던 버그를 bg-black/40으로 고치고, 배너·에러의 raw red/amber/sky를 st-destructive·st-badge-info 토큰으로 바꿨다. 타이포도 text-step-* 스케일로 통일했다.
  - PresetPicker·HistoryDrawer에 포커스 트랩·트리거 복원·스크롤 잠금·role=dialog를 넣고, 배너에 role=alert/status를 붙였다.

- 적대적 검증 10R 반영: 포커스트랩·다크배경·포커스탈취·slug버그
  - 10라운드 적대적 검증에서 확정된 결함을 수정했다. HistoryDrawer의 onClose를 ref로 안정화해 Publish·외부변경 시 포커스 탈취를 막고, 포커스 트랩 셀렉터에서 disabled 버튼을 제외했다.
  - EditRoute 루트·Centered에 bg-st-background를 넣어 다크모드 로딩·에러 전체화면의 흰 배경 깨짐을 고쳤다. slug 접미사가 잘려 500이 나던 버그는 base를 먼저 잘라 disambiguator를 항상 보존하도록 서버·CLI를 동기화해 해결했다(64자 slug 2회 생성 → -2 접미사로 실증).

- 검색/생성 입력을 헤더 중앙으로, 히어로 제거
  - 페이지 생성 입력을 헤더 가운데로 옮기고, focus 시 transform(scaleX ~1.3)으로 가로만 확장해 로고·버튼과 겹치지 않게 했다. 헤더 우측에는 '새 페이지' 버튼만 남기고 생성 상태·PresetPicker는 Shell로 올렸다.
  - IndexRoute의 랜딩 히어로와 기존 생성바를 제거해, 진입하면 곧장 목록·툴바만 보이고 바로 시작할 수 있게 했다.

- 제목 입력 Enter가 프리셋 선택을 건너뛰고 blank로 즉시 생성되던 버그
  - PresetPicker가 열리며 첫 프리셋(blank) 버튼에 포커스를 주면, 트리거의 Enter가 남은 keypress로 그 버튼을 눌러 picker를 건너뛰고 blank 페이지를 만들어 버렸다. 키보드 사용자는 다른 프리셋에 닿을 수 없었다.
  - 열릴 때 첫 버튼 대신 다이얼로그 패널(tabIndex=-1, 비활성)에 포커스를 줘서, 트레일링 Enter가 활성화할 대상이 없도록 이벤트 타이밍과 무관하게 견고화했다. 헤더 입력 Enter에는 preventDefault를 추가해 기본 동작 leak을 막았다.

- 다크모드 편집기 캔버스에서 배경 없는 상단 요소가 안 보이던 결함
  - Puck 편집기 캔버스 루트가 자체 CSS로 항상 흰색이라, 다크 테마에서 Heading/Text처럼 자체 배경이 없는 상단 요소가 흰 글씨로 흰 캔버스에 얹혀 사실상 안 보였다(카드는 자체 배경이 있어 무사).
  - config root.render를 페이지 배경·전경 토큰으로 감싸고, styles.css에서 PuckCanvas-root 배경을 var(--st-background)로 매핑해 빈 영역까지 테마와 일치시켰다. 해시가 바뀌어도 견디는 부분일치 선택자를 썼다.

- 한글 제목의 무의미 슬러그 파편 방지
  - slugify가 비ASCII(한글)를 제거하고 빈 문자열일 때만 page-<ts>로 폴백해서, "대시보드 3분기"가 "3", "2026 성과"가 "2026"처럼 제목을 대표 못하는 파편 슬러그로 URL·카드에 노출됐다. 한글 우선 제품에서 흔한 케이스였다.
  - 폴백 조건을 "빈 문자열"에서 "글자[a-z] 없음"으로 확장했다. 숫자·기호만 남으면 page-<ts>로 폴백하되 의미 있는 영문 조각은 유지한다("dashboard 3분기"→"dashboard-3"). 서버·CLI에 같은 규칙을 둬 파생 결과를 일치시켰다.

- 편집기 로드 에러 화면을 앱 미감에 맞춰 폴리싱
  - 편집 중 페이지가 외부에서 삭제된 뒤 '최신 불러오기'를 누르거나 없는 페이지 편집 URL로 들어가면 뜨는 loadErr 화면이 평범한 밑줄 텍스트 링크라, 앱의 다른 not-found(스타일된 카드 버튼)와 어긋났다.
  - 세미볼드 헤딩 + 테두리 카드 버튼 + ArrowLeft 아이콘(편집기 헤더 back-link과 같은 마이크로 애니메이션)으로 통일했다.

- 목록에 검색창 추가: fe-harness FilterSidebar SearchBox 이식(250ms 디바운스)
  - fe-harness 대시보드의 검색창 디자인(Search 아이콘 좌측 + 입력 pl-8)과 디바운스 패턴을 목록 툴바에 이식했다. 입력은 로컬 state로 즉시 반영하고 상위 필터 반영만 250ms 디바운스해, 매 키 상위 state 갱신이 controlled input 흐름을 끊지 않게 했다.
  - 제목·slug 부분일치로 필터하고 개수 배지를 결과 수로 갱신했다. 페이지는 있으나 질의가 안 맞을 때의 '검색 결과 없음' 상태를 빈 상태와 구분해 신설했다.

- 스크롤바 테마·얇게 + Puck 팔레트를 프리뷰 카드 그리드로
  - 스크롤바를 st-* 토큰에 맞춘 얇은(보이는 두께 4px) 스타일로 바꿔 라이트·다크 토큰에 자동 대응하게 했다.
  - Puck 팔레트를 텍스트 행 대신 2열 프리뷰 카드 그리드로 만들어, 레이아웃에 넣기 전에 미리 보고 고를 수 있게 했다. 레지스트리 컴포넌트는 데모를 IntersectionObserver로 뷰포트 진입 시에만 lazy 프리뷰(82개 일괄 로드 방지 + Boundary 격리 + pointer-events-none)하고, 레이아웃 프리미티브는 글리프로 그렸다. 실제 드래그 배선(Puck _Drawer-draggable_ 래퍼)은 건드리지 않아 추가 동작을 유지했다.

- 로고 워드마크에 PAGE 글래스 pill 얹기 (fe-harness 미감)
  - HARNESS 워드마크 중앙 하단에 PAGE 배지를 primary 글래스 pill로 절반 걸쳐 얹어 'PAGE-HARNESS'를 한 덩어리로 읽히게 했다. 배지 폭은 고정(w-14)이라 라벨 길이와 무관하게 pill 크기가 일정하다.

- 편집기 UX 밀도·팔레트 썸네일 개편 (레퍼런스 리서치 기반 P0)
  - Gutenberg 블록타일·Framer 썸네일·Figma UI3 밀도·VS Code 크롬폰트를 리서치한 스펙으로 1차 개편했다. 팔레트 카드를 텍스트 행에서 '썸네일 + 제목(컴포넌트 이름)'으로 바꾸고, 레지스트리는 라이브 데모 썸네일(scale 0.4 + thumb-fade, 뷰포트 진입 시 lazy mount), 레이아웃 프리미티브는 아이콘 타일로 그렸다.
  - 우측 인스펙터 밀도를 Puck 기본 47px/14px에서 28px/13px로 줄여 'title input이 너무 크다'는 문제를 해소하고, 상단바 크롬 폰트를 본문보다 작게 잡았다.

- 팔레트 컴포넌트 검색 (P0 완료)
  - 레지스트리 meta에 키워드(한/영 동의어)·intent·summary를 얹고 이름 매칭 검색을 팔레트 상단에 추가했다(Gutenberg 블록 인서터 검색 패턴). 검색어는 모듈 외부 스토어(useSyncExternalStore)에 두고 PaletteSearch와 모든 PaletteCard가 구독한다.
  - 매칭 안 되는 카드는 null을 반환하고, styles.css의 :has()로 빈 Drawer 항목·빈 카테고리를 숨겨 그리드가 빈칸 없이 자동 리플로우되게 했다. 결과가 없으면 흰 빈칸 대신 명시적 빈 상태를 띄운다.

## 정리

하루의 흐름은 "편집기 뼈대 → 자동화 경로 → 동시성 방어 → 미감 통일 → 편집 경험 밀도"로 한 줄기였다. 인상적이었던 건 편집기 하나를 세우는 일이 순수 UI 작업이 아니라 저장 규약 설계에 가깝다는 점이다. Puck으로 캔버스·드래그·인스펙터를 얻은 대신, 그 위에서 baseVersion 낙관적 동시성, 프로세스 간 파일락, atomic write, Placeholder가 실제 노드를 덮지 못하게 하는 preserveReal 같은 다중 사용자 무결성 방어를 서버와 CLI가 같은 규약으로 공유하도록 맞추는 데 하드닝 커밋 두 개(39건·10R)가 통째로 들어갔다.

또 하나 배운 점은 팔레트가 커지면 그 자체가 별도 UX 문제가 된다는 것이다. 90종을 텍스트 행으로 나열하면 고를 수가 없어서, IntersectionObserver로 뷰포트 진입분만 라이브 프리뷰하는 카드 그리드, 그리고 :has() + 외부 스토어 구독으로 매칭 안 되는 카드를 CSS만으로 리플로우 숨김 처리하는 검색까지 붙였다. Gutenberg·Framer·Figma의 인서터 패턴을 그대로 참고한 게 결정에 크게 도움이 됐다. 마지막으로 신규 앱이라도 ui-harness gallery의 styles.css·헤더 크롬·프리셋 플로우를 통째로 이식해 "같은 서비스"로 읽히게 만드는 게, 기능을 하나 더 붙이는 것보다 완성도 체감에 훨씬 컸다.
