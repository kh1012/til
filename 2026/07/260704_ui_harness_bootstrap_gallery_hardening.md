---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "@maxflow/ui draft를 발견·검토·승격하는 ui-harness를 Phase 0부터 부트스트랩하고(환경 감지·토큰 매니페스트·레지스트리·스킬 3종·갤러리·도그푸딩), 21st.dev 스타일 폴리시와 staging 격리·클론 13종을 얹은 뒤, UX 4라운드와 구조 검증(R2)으로 promote가 stable 코드를 덮어쓰는 지뢰까지 걷어낸 하루"
updatedAt: "2026-07-04"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "gallery"
  - "design-tokens"
  - "staging-isolation"
  - "code-splitting"
  - "review-desk"
  - "curation"
  - "monorepo"
  - "skill"
  - "vite-middleware"

relatedCategories:
  - "react"
  - "typescript"
  - "tooling"
---

# ui-harness 부트스트랩: Phase 0부터 갤러리·격리·구조 검증까지 하루에 관통시키기

> apps에 흩어진 UI를 끌어올려 만든 @maxflow/ui draft를, 발견하고 검토해 stable로 승격하는 도구(ui-harness)를 Phase 0 환경 감지부터 토큰·레지스트리·스킬·갤러리·도그푸딩까지 하루에 세우고, 비주얼 폴리시와 staging 격리·클론을 얹은 뒤 UX 4라운드와 구조 검증으로 "promote 기본값이 운영 컴포넌트를 덮어쓰는" 치명 지뢰까지 걷어낸 하루.

## 배경

며칠 전 apps 곳곳에 흩어져 있던 UI 패턴을 @maxflow/ui 공용 컴포지트로 끌어올렸다. 그다음 숙제는 명확했다. 이렇게 쌓인 draft들을 어떻게 발견하고, 한 건씩 검토해서 stable로 승격(promote)하느냐다. 오늘은 그 답이 될 도구 ui-harness를 백지에서 세우는 첫날이었다.

큰 줄기는 세 겹이었다. 먼저 오전은 Phase 0(환경 감지)부터 Phase 5(도그푸딩)까지 시스템의 뼈대를 순서대로 세우는 부트스트랩이었다. 토큰 매니페스트, 컴포넌트 레지스트리, 개발자가 AI로 컴포넌트를 만들고 큐레이션하게 돕는 스킬 3종(ui-harness/ui-curate/ui-apply), 그리고 컴포넌트를 한곳에서 보고 리뷰하는 갤러리(라이브러리/상세/리뷰 데스크)를 차례로 붙였다. 낮에는 갤러리를 데모 수준에서 실제로 쓸 만한 모양으로 끌어올리는 비주얼·인터랙션 폴리시와, 동시 작업이 충돌하지 않도록 staging draft를 디렉토리 단위로 격리하고 Composite 13종을 클론으로 시드하는 작업을 했다. 밤에는 4렌즈 디자인 비평(UX 라운드 1~4)과 페르소나·시나리오 실사용 검증, 그리고 구조 검증(R2)으로 스케일·데이터 정합·운영 안전성의 잠복 버그를 걷어냈다.

반복되던 제약은 두 가지였다. 하나는 갤러리·harness는 별도 자산이므로 여기서 쓰는 스타일이나 스크립트가 @maxflow/ui 본체나 다른 앱으로 새지 않게 경계를 지키는 것. 다른 하나는 이 도구가 여럿이 동시에 draft를 올리는 팀 환경에서 돌아가야 하므로, "혼자 데모로 돌 때는 안 보이지만 두 사람이 동시에 쓰면 터지는" 병합·승격 해저드를 미리 막는 것이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

**심야·오전: Phase 0~5 부트스트랩**

- Phase 0 환경 감지 + 가정 로그 + 진행 SoT 문서
  - 첫 커밋은 코드가 아니라 지형 파악이었다. pnpm/turbo 없이 TW v4 단일 구성, @maxflow/ui 기존 자산 같은 환경을 감지해 기록하고, @maxflow/ui를 확장한다·스킬은 force-add 대신 tracked로 간다 같은 결정 10개를 assumptions 로그로 남겼다. 이어가기용 단일 진실원(progress.md)에 전체 Phase 체크리스트와 최종 검증 항목을 미리 박아두고 시작했다. 하루가 길어질 것을 알았기 때문에 SoT부터 세운 것이다.

- Phase 2 토큰 매니페스트 + 레지스트리 + staging + 인덱스 스크립트
  - 시스템의 뼈대를 한 번에 세웠다. src/tokens에 radius/type-scale/z/색 토큰 이름을 담은 매니페스트를 두어 스킬 하드룰(허용 토큰만 쓰기)의 검증 기준으로 삼고, src/staging에 기존 primitives와 st-* 토큰만 조합한 MetricCard draft를 첫 시드로 넣었다. harness/registry에는 기존 86개 인벤토리에 metric-card seed를 더한 entries 87개, index.json, review-queue·decisions·token-proposals·.curate-state 원장을 만들고, 결정적으로 재생성되는 ui-index 스크립트와 bootstrap-entries 스크립트를 붙였다.

- Phase 3 스킬 3종 tracked 정본
  - ui-harness(발견·생성)·ui-curate(큐레이션)·ui-apply(승격 반영) 세 스킬의 canonical SKILL.md를 packages/ui-harness/skills에 tracked로 두고, .claude/skills에는 로컬 작동 복사본을 두는 방식으로 확정했다. force-add로 컨벤션을 깨는 대신 정본+로컬복사 구조를 택했는데, 이 결정이 다음 날 스킬을 스텁+GUIDE로 재편하는 밑바탕이 된다.

- Phase 4 갤러리 (React+Vite :2026)
  - 별도 백엔드 없이 Vite dev 미들웨어만으로 API를 얹은 갤러리를 세웠다. GET /api/health·review-queue, POST /api/decisions(append+큐 제거)를 미들웨어로 처리하고, @maxflow/ui를 소스 alias로 물려 HMR이 패키지 경계를 넘게 했다. 라우팅은 라이브러리(검색·필터·카드)·상세(props·코드/프롬프트 복사)·리뷰 데스크(좌우 비교·AI 추천·4액션) 셋. 도그푸딩 원칙으로 st-* 토큰과 primitives만 써서 갤러리 자체를 첫 사용자로 삼았다.
  - 하루 내내 각 Phase 전이(Phase 2 완료, 전 Phase 완료, 격리·클론·폴리시 이후)마다 진행 SoT(progress.md)를 갱신해 다음 세션이 이어가기 지점을 잃지 않게 유지했다.

- Phase 5 도그푸딩 + 공유 문서 6종
  - stat-tile draft를 만들어 curate에서 리뷰 큐로, 다시 POST decisions까지 한 바퀴 돌려 API 라운드트립이 실제로 도는지 실측하고, 데모 프라이밍 상태로 되돌렸다. day1 분석·토큰 채택 가이드·도그푸딩·팀 가이드·아키텍처·갤러리 실행까지 6종 문서를 붙여, 처음 오는 사람이 3분 안에 개념을 잡게 했다.

- 팀 가이드 문서 + lockfile 동기화
  - README를 하네스 허브로 삼아 설치·명령·스킬·구조를 정리하고, 스킬이 없는 에이전트(Codex/Cursor)를 위해 루트 AGENTS.md에 워크플로를 인라인으로 풀어 썼다. maxflow의 CLAUDE.md가 gitignore라서, 트리거 규칙은 tracked 스니펫으로 대신 공유했다. CI의 frozen install에 대비해 갤러리 devDeps lockfile도 맞췄다.

**낮: 비주얼 폴리시 · staging 격리 · 클론 13종**

- 갤러리 21st.dev 스타일 폴리시 (라이브 프리뷰·다크모드·코드 하이라이트)
  - 갤러리를 레퍼런스급 모양으로 끌어올렸다. 22개 핵심 컴포넌트는 카드에서 실제로 렌더하고 나머지는 아이콘+이름 플레이스홀더로 두되, 렌더가 throw해도 SafePreview 에러바운더리로 안전하게 강등되게 했다. 다크모드 토글·sticky 헤더·코드 신택스 하이라이트를 붙이면서도 하이라이트 색은 st-chart-* 토큰만 써서 도그푸딩을 유지했다.

- staging draft 디렉토리 격리 + Composite/Animation 13종 클론
  - 오늘의 구조적 결정 하나. 기존에 공유 배럴(src/staging/index.ts) 하나에 draft를 모으던 방식을, src/staging/<name>/{tsx,demo,index} 격리 구조로 바꿨다. 동시에 두 사람이 draft를 올려도 서로 다른 디렉토리라 충돌하지 않게 하려는 것이다. 그리고 Composite 12종과 Animation 1종을 <name>-draft 격리 디렉토리에 re-export 클론으로 시드해 리뷰 데스크에 검토 대상 14건을 채웠다. 이 클론들이 밤의 구조 검증에서 가장 큰 지뢰가 된다. 격리 구조로 바꾼 뒤에는 스킬(SKILL.md)과 AGENTS.md에 남아 있던 flat 배럴 시절의 잔여 staging 경로 참조를 격리형으로 전수 정리하고, Codex는 스킬을 못 읽으므로 AGENTS.md를 1차 진입점으로 린화했다.

- 갤러리 완성형 폴리시 (인터랙션·모션·키보드)
  - 여기서 중요한 함정을 하나 넘었다. framer-motion을 쓰려 했는데 Vite8/Rolldown 환경에서 React useContext가 null로 떨어져 크래시했다. 모션을 전부 CSS 기반으로 갈아, 카드 stagger fade-up과 라우트·리뷰 전환 페이드를 CSS로 처리하고 prefers-reduced-motion을 존중했다. ⌘K 검색 포커스, 필터칩 개수 배지, 리뷰 데스크 키보드 단축키(M/P/D/S)와 진행바까지 붙여 손으로 쓸 만하게 만들었다.

**저녁: UX 라운드 1~4 + 페르소나·시나리오 실사용 검증**

- 갤러리 UX 라운드 1~4 (강조색 절제·위계·조판·되감기·파괴적 액션 격리)
  - 4렌즈 디자인 비평으로 갤러리를 네 바퀴 다듬었다. 라운드1의 핵심은 강조색 절제였다. status 배지를 중립화하고(stable은 muted, draft만 소프트 앰버 틴트) 활성 필터칩을 solid에서 틴트로 낮춰, primary 색을 브랜드/CTA 전용으로 되돌렸다. 라운드2는 카드 밀도와 상세 위계, 그리고 리뷰의 비가역 트리아지에 Backspace 되감기+결정 토스트를 넣었다. 라운드3은 한국어 조판(break-keep로 음절 깨짐 방지)과 그리드 baseline 정렬, 라운드4는 파괴적 액션(폐기 D)을 divider로 격리해 인접 오폭발을 막고 검색 카운트를 결과 기준으로 정합화하는 데 집중했다. 틴트 위에서 대비가 부족하던 활성 필터칩 잉크도 foreground로 올려 AA를 맞췄다.
  - 중간에 레지스트리 시작점도 정리했다. stable을 86개에서 라이브 프리뷰가 도는 6개 샘플만 남기고, draft 15개(metric-card·stat-tile·클론 13)는 전량 유지했다. 리뷰 데스크에는 다음 대기 큐 힌트를 넣어 하단 공백과 진행 맥락을 채웠다.

- 페르소나 실사용 검증 발견 버그 수정 (데이터 정합·리뷰·검색)
  - 실제 사용자처럼 굴려보니 치명적 정합 버그가 나왔다. 리뷰에서 같은 컴포넌트를 재결정하면 POST /api/decisions가 append라 promote와 deprecate가 공존하는 모순이 생겼다. 이걸 같은 name을 dedup하는 replace로 바꾸고, action:undo 엔드포인트를 만들어 Backspace를 '진짜 되감기'(pending 제거+큐 복원)로 배선했다. 검색에서는 '표'라는 자연 검색어가 table을 못 찾던 버그를 keywords 보강으로, stat-tile 프리뷰가 엉뚱한 MetricCard를 하드코딩하던 것을 실제 StatTile로 고쳤다. 필터가 활성 0건에서 잠기던 락트랩에는 전체 폴백을 넣었다.
  - 다만 이 커밋에서 서버측 핸들러(vite.config.ts의 dedup·undo 로직)가 src/ 밖이라 함께 안 올라가, 클라가 부르는 서버 멱등 처리가 비어 있었다. 곧바로 누락된 서버 핸들러만 따로 커밋해 정합을 맞췄다.

**밤: 구조 검증(R2) 대응 · 재큐레이션 · 스케일**

- 시나리오 검증 R1 발견 7건 + SAFE 정정
  - SafePreview가 throw만 잡고 controlled 컴포넌트의 prop 없는 null 렌더(빈 화면)는 못 잡던 것을 childElementCount로 감지해 플레이스홀더로 강등하고, 검색 관련도를 정확일치100>부분10>intent1로 랭킹했다. decisions API에는 promote/merge/deprecate 외 임의 action을 400으로 막는 화이트리스트를 넣어 원장 오염을 차단했다. 조사 오류('승격로'→'승격으로')까지 받침 판별로 다듬었다. 이어 draft import 경로가 bare @maxflow/ui/staging로 나가 resolve가 안 되고 복붙 스니펫이 깨지던 것을, 격리 구조에 맞는 subpath(/staging/<name>)로 정정하고 스킬 지시문의 자기모순도 함께 손봤다.

- -draft 네이밍 컨벤션 명문화 + 키스톤 재큐레이션
  - 오늘 하루의 키스톤이 여기였다. 시드한 클론 13종의 원본(docking·chat-input 등)이 이미 src/<name>/ stable 코드였는데, 리뷰 데스크의 기본 결정값이 promote였다. 그대로 승격하면 src/<name>-draft를 중복 생성해 배럴 중복 export(TS2308)로 typecheck가 전멸하는 경로로 사람을 유도하고 있었다. 원본이 이미 stable이면 클론 스탠드인은 promote가 아니라 deprecate가 정답이다. 클론 13건을 deprecate로 재큐레이션하고, ui-curate에 "원본이 존재하는 클론은 promote 금지"를 못박았다. 여기서 -draft 접미사가 클론과 실존 stable 디렉토리를 가르는 유일한 식별자라는 것도 드러나, net-new는 base 이름·클론은 -draft·상태의 단일 소스는 meta.status로 네이밍 컨벤션을 명문화했다. 접미사를 함부로 없애면 promote가 운영 컴포넌트를 덮어쓴다.

- staging glob을 lazy 코드분할 (스케일 콜드스타트)
  - 구조 검증에서 ROI가 가장 컸던 성능 수정. demos·staged의 import.meta.glob이 eager라, draft가 딸린 무거운 의존(framer-motion·recharts 등)을 부팅 번들에 전량 포함하고 있었다. draft가 100개가 되면 @maxflow/ui 전체를 콜드스타트하는 셈이다. eager:false + React.lazy로 바꿔 카드/상세를 렌더할 때만 청크를 로드하게 하고, SafePreview는 Suspense가 풀린 뒤에 빈 렌더를 재는 콜백 ref 방식으로 다시 썼다.

- index.json을 gitignore 파생물로 (동시 업로드 병합 해저드 근절)
  - 두 사람이 동시에 draft를 올리는 상황을 시뮬레이션하니, entries/<name>.json은 격리라 무충돌인데 커밋되는 index.json이 문제였다. 두 저자가 각자 ui:index로 재생성한 뒤 병합하면 같은 줄로 합쳐지면서 count가 조용히 어긋났다(양쪽 21→22였지만 실제 23). 갤러리는 index.json을 읽지 않고 entries를 glob하므로, index.json을 파생물로 보고 gitignore+git rm --cached한 뒤 갤러리 기동 시 재생성하게 했다. 반면 review-queue·decisions는 상태 원장이라 커밋을 유지했다. 파생물과 상태물을 분리하는 원칙을 세운 셈이다.

- stable 원본 13개 엔트리화 + promote codemod 완성
  - 클론의 원본 13개(docking·adapter-layout 등, 실존 stable)를 first-class 엔트리로 부트스트랩하니 리뷰 데스크의 좌우 비교뷰가 부활하고(similarTo가 resolve), reuse-search가 기존 stable을 봐 중복 클론 생성을 막게 됐다. 클론 엔트리에는 .tsx에서 파싱한 실제 re-export 심볼(meta.exportName)을 부여해, '프롬프트 복사'가 미해결 DockingDraft가 아니라 실제 export인 Docking을 방출하게 고쳤다. 마지막으로 ui-apply의 promote codemod를 완성했다. 클론이면 promote를 사전 차단하고 배럴 중복 export를 미리 감지하며, 이동 파일의 상대 import를 한 단계 얕게 보정하고, 반영된 draft가 리뷰 데스크에 좀비로 남지 않게 review-queue를 dequeue하고, 물리 삭제는 소비처 0+유예 게이트 뒤에서만 하도록 게이트를 걸었다.

- 리뷰 데스크 얕은 접근 게이트 + HARNESS 로고 교체
  - 검증 결정이 오염되지 않게 리뷰 데스크에 얕은 접근 게이트를 얹었다. env GALLERY_REVIEW_KEY가 설정된 경우에만 작동하고(미설정은 개방·하위호환), 서버 미들웨어가 review-queue·decisions에 키를 요구하는 방식이다. (이 env-key 방식은 다음 날 "그냥 UI에 숨겨두자"는 의도와 어긋나 걷어내고 네비 숨김만 남기게 된다.) 마지막으로 좌상단 로고를 HARNESS 워드마크 PNG로 교체했는데, 첨부 PNG에 체커보드가 구워져 있어 헤더에 회색 박스가 생겼다. sharp로 휘도 임계 투명 처리를 해 텍스트만 남기고, 리뷰 데스크는 네비에서 기본 숨김·최초 진입 시 localStorage 기억으로 정리하며 하루를 닫았다.

## 정리

오늘은 도구 하나를 백지에서 세워 하루 만에 실전 직전까지 밀어붙인 날이었다. 되짚어 보면 세 개의 교훈이 하루를 관통했다.

첫째, 부트스트랩은 코드보다 진실원과 가정 로그가 먼저였다. Phase 0에서 progress.md를 SoT로 박고 assumptions 10개를 남긴 덕에, 33개 커밋이 이어지는 긴 하루에도 다음 Phase가 무엇인지, 왜 이 결정을 했는지를 잃지 않았다. 도구를 만드는 날일수록 이어가기 문서에 먼저 투자하는 게 맞았다.

둘째, 오늘의 가장 큰 위험은 기능 버그가 아니라 "혼자 데모로 돌 때는 안 보이는" 협업·스케일 해저드였다. staging을 디렉토리로 격리한 것, index.json을 파생물로 내려 상태 원장과 분리한 것, glob을 lazy로 쪼갠 것, 무엇보다 promote 기본값이 이미 stable인 원본을 덮어써 typecheck를 전멸시키던 지뢰를 재큐레이션과 네이밍 컨벤션 명문화로 막은 것이 그렇다. 시드 데이터(클론 13종)를 스탠드인이 아니라 진짜 승격 대상처럼 다뤘다면 팀 전체가 코드를 유실할 뻔했다. 데모 시나리오가 아니라 "두 사람이 동시에 쓰면"이라는 질문을 던진 것이 이 지뢰들을 캐냈다.

셋째, 폴리시는 감이 아니라 반복 가능한 렌즈로 했을 때 수렴했다. 4렌즈 비평으로 UX를 네 바퀴 돌리고, 페르소나·시나리오로 실사용을 굴리고, 구조 검증(R2)으로 스케일을 따로 검사한 흐름이, 강조색 절제부터 데이터 정합·콜드스타트까지 서로 다른 층위의 결함을 각자 다른 렌즈로 잡아냈다. 하나의 리뷰로 다 잡으려 하지 않고 관점을 갈라 던진 것이 남은 이틀(07-05 히스토리·스킬 스텁, 07-06 리뷰 데스크·큐레이션)로 이어질 튼튼한 바닥이 됐다.
