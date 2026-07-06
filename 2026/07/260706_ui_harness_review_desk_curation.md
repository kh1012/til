---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "ui-harness 갤러리와 리뷰 데스크로 컴포넌트 큐레이션 루프(갤러리 → 리뷰 결정 → apply)를 다듬고, 그 과정에서 나온 리뷰 피드백을 개별 컴포넌트에 반영한 하루"
updatedAt: "2026-07-06"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "review-desk"
  - "component-curation"
  - "design-token"
  - "framer-motion"
  - "storybook"
  - "promote-deprecate"

relatedCategories:
  - "react"
  - "css"
  - "typescript"
---

# ui-harness 갤러리·리뷰 데스크 큐레이션 루프 다듬기

> @maxflow/ui 컴포지트를 큐레이션하는 ui-harness 갤러리와 리뷰 데스크를 하루 종일 폴리싱하고, 리뷰 데스크에서 나온 승격/폐기 결정과 컴포넌트 피드백을 실제 코드로 반영(apply)하는 루프를 한 바퀴 돌린 기록.

## 배경

며칠 전 apps 곳곳에 흩어진 UI 패턴을 @maxflow/ui 공용 컴포지트로 끌어올린 뒤로, 이 draft들을 어떻게 검토하고 stable로 승격할지가 다음 숙제였다. 그 답으로 만들어 둔 것이 ui-harness 갤러리(컴포넌트 카드/상세/코드/히스토리를 한곳에서 보는 뷰)와 리뷰 데스크(draft를 한 건씩 넘기며 승격·머지·폐기를 결정하는 큐)였다.

오늘 하루의 큰 줄기는 이 큐레이션 도구 자체를 쓸 만하게 다듬는 것이었다. 갤러리의 비주얼을 리치하게 올리고(크롬 톤업·히어로·상세 페이지 재구성), 리뷰 데스크가 실제 검토 흐름을 놓치지 않게 고치고(진행바 세그먼트화·미결정 되돌이·요약 테이블), 리뷰에서 나온 피드백을 개별 컴포넌트에 그때그때 반영했다. 마지막엔 쌓인 결정을 실제 코드로 apply(승격 이동/폐기)하고, 그 apply 절차 자체를 스킬 문서로 정리했다. 갤러리는 공개 배포되므로 갤러리 전용 스타일이 @maxflow/ui나 다른 앱에 새지 않게 하는 것이 반복되는 제약이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

**심야: 갤러리 자체의 비주얼 폴리싱**

- 갤러리 크롬 톤업(갤러리 전용 틴트)
  - 순수 그레이스케일(oklch L, 0, 0)을 hue 270°로 아주 옅게 틴트해 Linear/Vercel 감성으로 올렸다. 라이트는 쿨-슬레이트 화이트 배경에 순백 카드로 카드가 떠오르게, 다크는 깊은 블루-그레이. 시맨틱색(primary/accent 등)은 유지해 프리뷰 컴포넌트는 실제 색 그대로 보이게 했다. 갤러리 styles.css만 빌드에 포함해 @maxflow/ui나 다른 앱엔 무영향. 버그 하나를 잡았는데, :root(dark)를 light 뒤에 두면 같은 specificity로 이겨 light가 안 먹던 순서 문제였고 theme.css처럼 dark 먼저, light 뒤로 정렬해 해결했다.

- 라이브러리 상단 히어로
  - 중앙정렬 히어로(muted 패널 + shadow, 흰 검색필드)를 라이브러리 상단에 세웠다.

- 상세 페이지 재구성 + 코드 하이라이팅 강화
  - 상세 페이지 액션(프롬프트 복사/Storybook/리뷰로 복귀)을 우상단 outline 톤으로 통일하고, 미리보기 풀폭이던 레이아웃을 사용예제(넓은 main) + 속성(세로 메타 사이드바) + 히스토리 풀폭의 동적 레이아웃으로 바꿨다. CodeBlock 신택스에 갤러리 전용 팔레트(keyword 보라/string 초록/tag 코랄/component 시안/number 주황, 라이트·다크 적응)를 넣었다. AI 티가 나는 em대시는 렌더 UI에서 전수 제거해 빈값은 "없음", 리뷰 토스트는 가운뎃점으로 바꿨다.

- 리뷰 데스크 레벨업(Phase C)
  - 폴리싱 언어를 일관 적용했다. 비교 카드(신규/원본 패널)에 shadow-sm 깊이, AI 추천 박스에 Sparkles 아이콘 콜아웃 + rounded-xl, 좌우 nav 버튼 press를 부드러운 이징으로 통일. 결정 버튼은 공용 Button 기반이라 press가 이미 일관돼 있었다.

- 상세 히스토리 위치 이동 + 배경 조정
  - 히스토리를 좌측 컬럼(사용 예제 바로 아래)으로 옮기고 속성은 우측 사이드바에 유지했다. 상세 미리보기(DemoFrame) 배경은 내부에 이미 톤이 많아 그라데이션을 걷고 차분한 배경으로, 히어로 검색 필드 shadow는 lg로 올렸다.

**낮: 리뷰 피드백을 개별 컴포넌트에 반영하는 사이클**

- 카드/라이브러리 소소한 정리("디자인 개선")
  - ComponentCard className을 cn()으로 감싸고 LibraryRoute의 import 순서와 라인 포맷을 정리한 잔손질.

- 상세 캔버스 배경을 브랜드 hue 틴트로
  - /c/* 상세 페이지 배경을 flat 중립 대신 hue 270°로 은은히 물든 그라데이션(라이트=소프트 인디고 워시, 다크=딥 인디고)으로 바꿨다. App 루트에서 /c/* 매치일 때만 detail-canvas를 적용하고 라이브러리·리뷰는 bg-st-background를 유지해, 미리보기·카드가 틴트 캔버스 위에서 또렷이 떠오르게 했다.

- input 기본 배경 투명 문제(1차)
  - "기본 배경이 투명해 보인다"는 리뷰에, select/textarea 등 다수가 공유하는 bg-st-control-bg(반투명) 대신 불투명 서피스 토큰 bg-st-background로 input에만 국소 교체했다. 공유 토큰 값을 건드리지 않는 선택.

- chat-input 리뷰 반영
  - 인풋 컨테이너 배경을 흰색(bg-st-background + border-st-input)으로, 전송 버튼의 원형 배경을 제거하고 화살표 아이콘만 노출, 아이콘 색을 라이트/다크로 테마 대응, hover 시 1.2배 확대(reduce-motion이면 비활성).

- toggle-selector 드롭다운을 Selector와 동일 목록 UI로
  - ToggleSelector에 Selector와 동일 규약의 contentClassName prop을 추가(기본 w-56로 기존 소비처 하위호환)하고, 갤러리 프리뷰의 bare div 텍스트를 SelectorList로 교체해 다른 Selector 프리뷰와 같은 목록 UI(활성행 체크)로 맞췄다.

- 전역 커스텀 스크롤바 이식
  - apps/web globals.css의 스크롤바를 st-* 토큰에 매핑해 갤러리로 이식했다. :where(*)(zero specificity) + 언스코프드 ::-webkit-scrollbar 한 곳 선언으로 모든 스크롤 영역에 일괄 적용되게 했다.

- 리뷰 데스크 focus 쿼리스트링 동기화 + 완료 오판정 수정
  - 클릭·화살표·결정으로 idx가 바뀔 때마다 URL ?focus를 replaceState로 동기화(기존엔 진입 시 1회만)했다. 그리고 마지막 카드에서 결정해도 화살표로 지나친 미결정 항목이 남아 있으면 완료로 끝내지 않고 첫 미결정 항목으로 되돌이(idx+1..끝 → 0..idx 순회)하도록 고쳤다. 전부 결정됐을 때만 완료 화면, 되돌이 시 "아직 N건 미결정, 이어서 검토" 토스트.

- chat-input 테두리를 blur glow로
  - 하드 엣지 border-st-input 대신 같은 토큰을 blur box-shadow로 적용해 경계가 자연스럽게 퍼지게 했다.

- 리뷰 진행바 세그먼트화 + 요약보기 테이블
  - 진행바를 항목별 세그먼트로 쪼갰다. 결정한 항목은 진회색, 화살표로 지나쳤거나 아직 안 본 항목은 파랑으로 칠해, '승격 누른 것'과 '방향키로 넘어간 것'을 한눈에 구분하게 했다. 세그먼트 hover는 툴팁(컴포넌트명·결정), 클릭은 이동, 현재는 ring. 헤더에 '요약보기' 토글을 달아 리뷰 상태 테이블(승격·머지·폐기·건너뜀 칩 / 미결정)을 띄우고, 결정 상태는 historyRef에서 파생해 바와 테이블이 공유하게 했다. skip('건너뜀') 액션도 추가.

- input 배경 대비 재수정(2차, 구조적 원인 규명)
  - 1차로 bg-st-background로 바꿨는데도 "여전히 안 채워진 것 같다"는 피드백이 왔다. Storybook 순정 환경에서 실측하니, st-background는 정의상 "페이지 배경" 토큰이라 다크에서도 body와 완전 동일한 oklch(0.145)로 렌더돼, 어떤 캔버스 위에 올려도 항상 배경과 같은 색이 되는 구조였다. bg-white 하드코딩은 라이트값이 이미 순백이라 픽셀상 이득이 없고 토큰만 쓰는 hard rule을 깨서 기각, bg-st-card로 교체했다. 라이트는 순백 유지, 다크는 oklch(0.205)로 배경(0.145)과 명확히 구분되는 카드톤을 확보하고 다크 강제 스크린샷으로 대비를 검증했다.

- BounceSwitch draft 추가
  - 켤 때는 스프링, 끌 때는 easeOutBounce로 서로 다른 물리감을 주는 세로 토글 스위치. 기존 Composite/Animations 풀에 겹치는 역할이 없어 신규 draft(@maxflow/ui/staging/bounce-switch)로 만들었다.

- 진행바 outline 제거, 3단 색상
  - 현재 항목을 ring 아웃라인으로 표시하던 방식을 걷어내고 focus(현재 idx)만 파랑으로 남겨 색 자체가 포인터 역할을 하게 단순화했다. non-focus 미결정 세그먼트는 옅은 회색으로 낮춰 완료(진한 회색)와 시각적으로 구분되게 했다.

- trend-chart-card 축 반영 누락분 커밋
  - demo 데이터를 월별 접속자 수에서 연도별 사용자 수로 바꾼 변경과 그 history append가 이전 세션 턴에서 커밋되지 않고 누락돼 있던 걸 뒤늦게 커밋했다.

- BounceSwitch 볼 타원 버그 수정
  - motion.span(볼)이 flex row 안에서 shrink-0 없이 렌더돼 트랙 패딩만큼 폭이 눌려(80에서 60px) 정원 대신 타원으로 보이던 문제. shrink-0을 추가해 size-20(80x80) 그대로 렌더되게 했다.

- 히스토리 타임라인에 코드블록·링크 렌더링
  - 히스토리 항목에 코드/링크를 어떻게 담을지 두 안(구조화 필드 vs 마크다운-라이트 파싱)을 놓고 후자를 골랐다. 스키마가 불변이고 원문을 그대로 보존해, 렌더 버그가 나도 데이터를 안 건드리고 사후에 파싱만 고치면 되기 때문이다. 기존 printf 기반 history append가 멀티라인/따옴표 포함 코드에 셸 치환 위험이 있어 heredoc + node JSON.stringify로 교체했다.

- history 누락을 강제 대신 수동 점검 프롬프트로
  - pre-commit 훅이나 CI 게이트는 로컬 커밋마다 개입하는 데다 Codex 같은 비-Claude 에이전트까지 강제할 수 없어 채택하지 않았다. 대신 GUIDE.md §7에 "정합성 점검 프롬프트"를 문서화해, 세션이 길어져 history append(§6)를 놓친 게 의심될 때 누구든 그대로 붙여넣어 되짚어 채우게 했다. team-guide.md·AGENTS.md에서 짧게 링크.

- BounceSwitch 트랙 높이 + 레퍼런스 히스토리 기록
  - 트랙 높이를 h-56(224px)으로 조정하고 이동거리(TRAVEL_Y=124)를 재계산, 트랙 폭은 w-auto로 flex item 콘텐츠 폭(볼+패딩)대로 결정되게 했다. 원본 참고 자료(motion.dev 딥링크 + 코드 스니펫)를 코드펜스/링크를 렌더하는 RichText로 히스토리에 남겼다.

- 히스토리 코드블록 폭·높이 조정
  - w-full을 줘도 코드가 좁게 보이던 원인이, li의 content 컬럼에 flex-1이 없어 텍스트 content 폭만큼만 shrink-to-fit 되던 것이었다. flex-1을 추가해 실제 컬럼 폭까지 확장하고, 높이는 360px 고정 + overflow-y-auto로 긴 코드는 내부 스크롤 처리.

- input 포커스 회색 링 제거
  - st-ring 토큰이 채도 0인 회색이라 focus-visible 시 border/ring이 회색 헤일로로 보였다. 리뷰 요청대로 해당 focus-visible 클래스를 제거했다.

- chat-input 포커스 halo 추가
  - chat-input에 포커스 시 halo를 얹었다.

- 리뷰 데스크 결정 8건 반영(상태만)
  - selector/selector-button/toggle-selector/docking/trend-chart-card/ai-rule-console/chat-input/input의 promote 결정을 반영하고 review-queue를 비웠다.

- AdapterLayout 도킹 위치 기본값 bottom으로
  - AdapterLayout의 도킹 위치 기본값을 bottom으로 바꿨다.

**오후: 결정을 실제 코드로 apply + ui-apply 프로세스 문서화**

- 리뷰 데스크 승격/폐기 12건 실제 반영(ui-apply)
  - decisions.json의 pending 결정을 실제 코드로 2차 반영했다. 실이동 승격 3종(src/staging → src/<name>, 배럴 등록, 상대 import 보정)은 ai-rule-console·bounce-switch·trend-chart-card(bounce-switch 스토리 title은 Staging → Shared/UI/Animations). status-only 승격 6종(이미 src/에 존재해 meta.status만 stable)은 selector·selector-button·docking·toggle-selector·chat-input·input. orphan deprecate 3종은 대상 엔트리가 없어 no-op archived. decisions는 pending에서 archived(appliedAt)로, .curate-state 갱신, @maxflow/ui typecheck 통과.

- 라이브러리 필터 라벨 변경
  - '이번 주 승격' 필터 라벨을 'promoted'로 바꿨다.

- 갤러리 glob 확장으로 승격 데모 프리뷰 복구
  - demoModules glob이 src/staging/*/*.demo.tsx만 스캔해, promote로 src/<name>로 옮겨진 데모(ai-rule-console·bounce-switch·trend-chart-card)가 demos에서 빠져 프리뷰가 사라지던 회귀를 수정했다. src/**/*.demo.tsx로 확장해 staging(draft)과 승격된 stable 데모를 모두 수집, 카드/상세/리뷰 3뷰 공통 복구.

- ui-apply 절차 문서화(브랜치·데모 이동·PR)
  - §0 브랜치를 chore/에서 feature/<user>/ui-harness/ui-apply-<yyyymmdd>로(상위 세그먼트 충돌 시 사용자와 조율). §2-3에서 promote 시 .demo.tsx/.stories.tsx도 src/<name>/로 함께 옮기고 스토리 title을 갱신하도록 명시(안 옮기면 갤러리 프리뷰 소실, 이번 회귀의 교훈). §5는 main 타겟 PR + 본문 요약 항목 + Bitbucket(gh 불가) 절차.

- PR 생성은 스킬 밖으로 재조정
  - §5 마무리를 다시 손봤다. ui-apply는 별도 브랜치에 커밋까지만 하고, PR 생성·push·리뷰어 지정은 사용자가 수동으로 한다. 스킬은 대신 PR 본문을 pr-body.md로 정리해 전달하는 데까지만 책임진다.

## 정리

오늘은 "컴포넌트를 만드는 날"이 아니라 "컴포넌트를 큐레이션하는 도구를 다듬는 날"이었다. 갤러리에서 draft를 보고, 리뷰 데스크에서 승격/폐기를 결정하고, 그 결정을 apply로 코드에 반영하는 하나의 루프. 그 루프를 실제로 한 바퀴 돌려 보니 어디가 새는지가 드러났고, 커밋 대부분은 그 새는 곳을 메우는 작업이었다.

가장 값진 교훈은 토큰의 의미론이었다. input 배경이 안 채워져 보이던 문제를 두 번에 걸쳐 고쳤는데, 결국 원인은 CSS 값이 아니라 st-background가 "페이지 배경"이라는 정의 자체였다. 어떤 캔버스에 올려도 배경과 같은 색이 될 수밖에 없는 구조였고, 색을 바꾸는 게 아니라 "카드 서피스"라는 다른 역할의 토큰(st-card)으로 바꿔야 대비가 생겼다. 눈에 보이는 픽셀을 손대기 전에 토큰이 원래 무슨 자리를 뜻하는지부터 봐야 한다는 걸 다시 배웠다.

두 번째는 이동과 참조의 정합성이다. draft를 src/staging에서 src/로 승격하며 코드는 옮겼는데 데모 파일과 그걸 긁는 glob이 따라오지 못해 갤러리 프리뷰가 통째로 사라지는 회귀가 났다. 이걸 glob 확장으로 급히 막고, 나아가 apply 절차 문서에 "승격 시 .demo/.stories도 함께 옮기고 스토리 title도 갱신"을 못박아 같은 실수가 안 나게 했다. 자동화가 한 군데를 옮길 때 그걸 참조하는 모든 곳이 같이 움직여야 한다는, 리팩터링의 기본이 도구 레이어에서도 똑같이 적용됐다.

세 번째는 강제보다 되짚기다. 히스토리 누락을 pre-commit 훅으로 막으려다, 비-Claude 에이전트까지 강제할 수 없다는 현실 때문에 접고 "언제든 붙여넣어 되짚는 점검 프롬프트"로 방향을 틀었다. 히스토리 렌더도 구조화 스키마 대신 원문 보존형 파싱을 택해, 렌더가 깨져도 데이터는 안전하게 뒀다. 강한 게이트로 사고를 원천 봉쇄하기보다, 사후에 싸게 복구할 수 있는 구조를 고른 셈이다. 마지막에 PR 생성을 스킬 밖으로 밀어내 사람이 최종 결정하게 한 것도 같은 결의 판단이었다. 도구는 커밋과 정리까지, 배포로 나가는 마지막 문은 사람이 연다.
