---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "ui-harness 갤러리를 목록/정렬/딥링크·컴포넌트 히스토리 타임라인·리뷰 데스크 왕복까지 쓸 만하게 키우고, 스킬을 스텁+GUIDE 구조로 재편해 git pull로 지침이 자동 전파되게 만들고, 시나리오 실사용 테스트로 크래시·포트 규칙을 수렴시킨 하루"
updatedAt: "2026-07-05"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "gallery"
  - "review-desk"
  - "deep-link"
  - "component-history"
  - "skill-stub-guide"
  - "storybook"
  - "port-migration"
  - "intersection-observer"

relatedCategories:
  - "react"
  - "typescript"
  - "tooling"
---

# ui-harness 갤러리 키우기: 딥링크·히스토리 타임라인·스킬 스텁 구조

> @maxflow/ui 컴포지트를 발견하고 리뷰하는 ui-harness 갤러리를 목록/정렬/URL 딥링크·컴포넌트 히스토리 타임라인·리뷰 데스크 왕복까지 실사용 가능한 도구로 키우고, 세 개의 스킬을 스텁+GUIDE 구조로 재편해 재설치 없이 git pull로 지침이 퍼지게 만든 하루.

## 배경

며칠 전 apps 곳곳에 흩어져 있던 UI 패턴을 @maxflow/ui 공용 컴포지트로 끌어올린 뒤로, 이 draft들을 어떻게 발견하고 검토해 stable로 승격할지가 남은 숙제였다. 그 답으로 만들던 것이 ui-harness 갤러리(컴포넌트 카드/상세/코드를 한곳에서 보는 뷰)와 리뷰 데스크(draft를 한 건씩 넘기며 결정하는 큐), 그리고 개발자가 AI 도구로 컴포넌트를 만들고 큐레이션하게 돕는 스킬 세트(ui-harness/ui-curate/ui-apply)였다.

오늘 하루의 큰 줄기는 이 도구를 데모 수준에서 실제로 쓸 만한 수준으로 끌어올리는 것이었다. 하루의 시작은 시나리오 기반 실사용 테스트(R2·R3)에서 나온 크래시와 마찰을 수렴시키고 모노레포 포트 규칙 위배를 바로잡는 것이었고, 이후 갤러리에 목록/정렬/딥링크·프리뷰·프롬프트 복사·온보딩을 붙이고, 컴포넌트가 최초 프롬프트 이후 어떻게 진화했는지를 남기는 히스토리 타임라인을 세우고, 리뷰 데스크와 상세를 왕복 루프로 연결했다. 마지막엔 스킬을 얇은 스텁과 git-tracked 정본(GUIDE)으로 쪼개, 앞으로 지침을 고칠 때 개발자가 재설치할 필요 없이 git pull만으로 최신 절차를 받게 만들었다. 갤러리는 공개 배포되므로 갤러리 전용 스타일·자산이 @maxflow/ui나 다른 앱에 새지 않게 하는 것이 반복되는 제약이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

**심야: 시나리오 실사용 수렴 + 포트 마이그레이션 + auth 정리**

- 시나리오 R2 실사용 수정 10건 + 포트 2026 to 9221 마이그레이션
  - 모노레포 921x 대역 규칙을 위배하던 2026 포트를 9221로 옮겼다(design 9214·cad 9216·viewer 9217/9220·sds 9218·analysis 9219 다음의 자유 포트). vite.config, gallery.mjs, 스킬 2개, 문서 5개를 전수 교체하되 연도 표기(2026-07)와 todo 파일명(20260704)은 정규식으로 보존했다. 실사용 수정으로는, 잘못된 percent-escape 딥링크가 decodeURIComponent에서 throw해 앱이 백지로 크래시하던 것을 safeDecodeSlug의 try/catch 폴백으로 우아한 not-found 렌더로 바꾼 것이 가장 컸다. 그 밖에 리뷰 async busy 레이스(고속 더블탭이 idx를 2 건너뛰던 것)를 busyRef 동기 재진입 가드로, undo가 pending에 없던 임의 항목까지 큐에 주입하던 것을 wasPending 가드로 막고, 모바일 터치 타깃(28/32px)을 주 CTA·리뷰 액션에서 size=lg로 키우고, 테마 localStorage 영속·완료 문구 분기 같은 잔 마감을 함께 처리했다.
  - 폐기 후보 비교 패널이 '유사 컴포넌트'라 부르는데 AI 추천 박스는 '원본'이라 부르던 용어 모순을, recommendedAction별로 '원본 (stable)' 라벨을 갈라 통일했다.

- 시나리오 R3 수렴 수정(skip 되감기·클론 비교·로고 워드마크)
  - 회귀·첫인상·리뷰어 세 관점으로 다시 돌린 R3는 대부분 low로 수렴했다. 핵심은 skip과 Backspace의 어긋남이었다. 건너뛰기(skip)한 항목을 되감아도 '결정 취소' 토스트와 decided 감소가 실행돼 완료 카운트가 off-by-one으로 틀어졌다. 항목별 action 이력 스택(historyRef)을 만들어 pop한 action이 'skip'이 아닐 때만 undo/토스트/decided를 실행하고, skip은 idx만 되감으며 '건너뛰기 취소' 중립 토스트를 띄우도록 갈랐다.
  - 좌상단 로고의 태그라인('FRONTEND DEVELOPER FRAMEWORK')이 32px에서 뭉개져 얼룩처럼 보이고 옆의 '갤러리' 정렬이 처지던 문제(사용자가 직접 지목)를, 원본에서 워드마크만 크롭·trim해 해결했다. 클론 13건의 비교뷰에 빈 플레이스홀더가 2개 뜨던 마찰은 우측을 '원본 X의 재export 클론' 단일 안내로 축약했다.

- env 키 auth 폐기, UI 숨김만 유지 (revert)
  - 앞서 env-key 게이트 방식으로 리뷰 접근을 잠갔는데, 사용자 의도는 '아니면 UI에 숨겨두자'였지 기존 방식을 대체하지 않고 얹어 둔 것이었다. reviewAuth.ts·.env.example·LockedScreen·서버 401 게이트·x-review-key 헤더를 전부 걷어내고, 이미 있던 '네비 숨김 + 딥링크 접근 + localStorage 기억'만 남겼다. 콜드 진입 시 네비 숨김, /review 딥링크로는 잠금 없이 데스크 표시, 방문 후 노출되고 리로드해도 유지되는 흐름을 검증했다.

**낮 전반: 설치·재사용 정책 정리 + 갤러리 목록/정렬/딥링크 + 프롬프트·프리뷰**

- 로고 옆 '갤러리' 텍스트 제거 (헤더 잔손질)
  - 헤더 로고 옆 '갤러리' 텍스트를 걷어 워드마크만 남기고 img 마크업을 정리했다.

- 스킬 설치를 OS 무관 pnpm ui:skills로 + Windows 병기
  - 설치 안내가 Mac 전용 cp -R/mkdir -p만 있어 Windows 개발자가 막히던 것을, OS 무관 설치 스크립트(install-skills.mjs, node fs.cpSync)와 pnpm ui:skills로 바꿨다. 문서 4곳(team-guide·docs/CLAUDE·skills/README·ui-harness/README)을 권장(pnpm) + macOS/Linux + Windows(PowerShell) 3종 병기로 갱신했다.

- 갤러리 파비콘 추가(라이트/다크 H 마크)
  - HARNESS의 H 원형 마크를 파비콘으로 넣었다. 첨부 PNG의 체커보드 배경을 sharp로 알파 처리하고 원형 crop해 64x64로 구웠고, index.html에 기본은 라이트(전 브라우저), 다크는 prefers-color-scheme media로 스위치되게(미지원은 라이트 폴백) 걸었다.

- 재사용 풀을 Composite/Animations로 한정
  - primitive는 버려질 레거시라는 방향에 따라, 스킬의 재사용·참고 대상에서 primitive를 제외했다. ui-harness 스킬은 재사용 후보를 category Composite/Animations만으로 한정하고 그 풀에 없으면 곧장 신규 생성(primitive 대체 제안 금지), 신규 컨셉은 Storybook Shared/UI/Showcase를 참조하도록 고쳤다. ui-curate의 유사도·중복 판정도 같은 풀로만 하도록 맞췄다.

- 라이브러리 목록 뷰 + 최신순 정렬 + NEW 뱃지
  - 그리드/목록 뷰 토글(localStorage 유지)을 넣고, 목록은 이름·상태·intent·category·요청자·복사를 담은 조밀한 행으로 만들었다. 이름순/최신순(createdAt desc) 정렬 토글을 붙이고 최신순은 URL ?sort=recent로도 열리게 해 스킬 딥링크에 쓸 수 있게 했다. 24시간 내 생성분에는 NEW 뱃지를 달아 방금 만든 draft를 바로 식별하게 했다.

- 스킬 응답에 갤러리 딥링크 필수화
  - ui-harness 응답 끝에 항상 딥링크를 남기도록 필수화했다. 재사용이면 추천 컴포넌트 상세(/c/추천name), 신규면 만든 것 상세(/c/name) + 최근 생성 모아보기(/?sort=recent, 방금 것이 맨 위)를 붙이게 했다.

- 정렬 토글 높이 정렬 + NEW를 new로
  - 정렬 토글 버튼 높이를 필터 칩(33.5)·뷰 토글(34)과 34px로 맞추되 임의 px가 아닌 스케일값(h-7)만 썼고, NEW 뱃지를 소문자 new로 바꿨다.

- 프롬프트 복사를 21st.dev식 상세 통합 지시로
  - 러프한 불릿이던 프롬프트 복사를, 전제(코드베이스)·컴포넌트(역할/상태/분류/import/props/구성/토큰)·사용 예제·하드 룰·통합 단계·갤러리 확인 링크로 구조화했다. 코드 복사가 아니라 @maxflow/ui import 모델에 맞춘 지시로 썼고 클립보드 실측으로 확인했다.

- Composite/Animation 원본 13개 갤러리 프리뷰
  - '프리뷰 없음'이던 Composite/Animation 원본 13종을 실제 렌더로 채웠다. 각 컴포넌트 소스·스토리에서 대표 props를 뽑아 previews.tsx에 등록했고, 상태형은 래퍼로, 오버레이(node-delete-dialog)는 트리거 버튼으로 감쌌다. @maxflow/ui 배럴 import(vite alias 소스 해석)를 쓰고, 클론(-draft)은 clonedFrom 원본 프리뷰를 재사용하게 해서 리뷰 비교뷰의 양쪽이 모두 렌더되게 했다.

- Composite 원본 13개 entry에 실제 props·usage 채움
  - 프롬프트 복사가 '원본 컴포넌트 API'나 빈 태그 대신 실제 API·사용 예제를 내도록, entry meta에 usage 필드를 추가하고 buildUsageExample이 그걸 쓰게 했다. 13개 원본에 props 요약과 대표 usage 스니펫(네임스페이스·controlled 상태·DockingRailItem 형태 포함)을 반영했다.

**오후: 히스토리 타임라인 + 리뷰 데스크 왕복 + 딥링크·성능**

- AI 규칙 콘솔 draft 추가 + Selector 팝오버 여백 대칭화
  - AI 토글로 '규칙 Selector+실행(SelectorButton)'과 'AI 프롬프트 입력(ChatInput)'을 전환하는 툴바(ai-rule-console) draft를, 기존 Selector/SelectorButton/ChatInput/PopoverList/Switch만 조합해 만들었다. 처음엔 framer-motion AnimatePresence로 크로스페이드했으나 Vite8/Rolldown 갤러리 환경에서 exit가 멈추는 기존 이슈를 그대로 재현해 단순 조건부 렌더로 교체했다. 곁들여 Selector 기본 팝오버의 top padding(pt-1)이 RadioGroup padBottom(pb-4)과 비대칭이라 하단 여백만 도드라지던 것을, Content 기본값(pt-4)으로 복귀시켜 ToggleSelector 팝오버와 같은 리듬으로 통일했다.

- 상세 페이지 컴포넌트 히스토리 타임라인
  - 개발자가 최초 프롬프트 이후 계속 수정한 서사를 상세 페이지에 남기게 했다. created 이벤트는 entry(createdAt/requestedBy/intent)에서 자동 파생하고, modify 이벤트만 append-only 사이드카(entries/name.history.jsonl)에 쌓게 설계했다(엔트리 glob과 확장자가 달라 안 겹침). 상세에 생성=파랑 dot, 수정=회색 dot과 프롬프트 인용·변경 요약을 붙이고, 스킬에는 기존 draft 수정 시 사이드카에 한 줄 append하는 지침을 추가했다.

- 타임라인 시각 정확화
  - 타임스탬프를 문자열 slice로 자르던 것이 UTC 저장분과 KST가 9시간 어긋나게 보이던 버그라, Date parse 후 로컬 포맷으로 바꿨다. 자정(T00:00:00)은 시각이 유실된 placeholder라 날짜만 표시하게 했고, currentDate가 날짜만 주는 탓에 그냥 쓰면 00:00이 되던 문제 때문에 스킬에 createdAt은 date -u로 실제 시각을 기록하라는 지침을 넣었다.

- 리뷰 데스크 가로폭을 헤더와 동일하게
  - 리뷰 데스크 폭을 max-w-4xl에서 6xl로 넓혀 헤더와 맞췄다.

- 상세와 리뷰 데스크 네비게이션 연결
  - draft 상세에서 리뷰가 활성일 때 '리뷰 데스크에서 검토' 링크를 노출(stable엔 없음)하고, 그 링크가 /review?focus=name으로 해당 항목을 포커스하게 했다. 리뷰 중 상세로 나가 수정하고 다시 그 항목으로 돌아오는 왕복 루프를 완성했다.

- packages README 전면 갱신(누락 패키지 + 포트맵)
  - ui(디자인 시스템 SSOT·Storybook 6007), ui-harness(9221), analysis-review(9219), viewer 계열, sds 계열, sheet 등 누락 패키지를 추가하고, 포트 테이블을 9211~9221로 확장했다. 9216이 cad/web과 viewer/3d에 이중 할당된 것을 플래그하고 9213 빈 슬롯을 권장으로 달았으며, Storybook 6000번대를 별도 명시하고 도메인별 섹션으로 재편했다.

- 리뷰 주도 수정 타임라인 태깅 + 배지
  - HistoryEvent에 via?:"review"를 추가하고 타임라인에 '리뷰' 배지를 달았다. 식별은 말투가 아니라 review-queue.json 소속으로 자동 판정하게 해서, 큐에 있는 draft를 고치면 via:"review"로 기록되게 했다. 스킬에도 큐 멤버십 확인 후 태깅하는 append 절차를 문서화했다.

- 리뷰 데스크 '수정 프롬프트 복사' 버튼
  - 리뷰어가 데스크에서 draft를 보다 고치고 싶을 때, 대상 파일·import·규칙 + 리뷰 히스토리 기록(via:review) 지침이 박힌 프롬프트를 원클릭 복사할 수 있게 했다. buildReviewModifyPrompt를 만들어 AI 추천 박스 아래·결정 액션 위에 배치했다.

- 라이브러리 필터를 URL 쿼리스트링으로 딥링크화
  - 전체/stable/draft 필터를 ?filter=값으로 URL에 반영(replaceState)하고 기본값(all)은 파라미터를 제거하게 했다. ?filter=draft 딥링크로 바로 진입할 수 있고, sort(?sort=recent)와 같은 패턴을 맞췄다.

- 라이브러리 카드 lazy 프리뷰(IntersectionObserver)
  - 카드 shell과 높이는 항상 렌더해 레이아웃 시프트를 없애되, 비싼 라이브 프리뷰는 뷰포트 근처(rootMargin 200px)에서만 마운트하게 해 대량 엔트리에서도 렌더 부하를 바운드했다. useInView 훅이 첫 교차에서 inView를 고정(mount-once)하고 IO 미지원 시 폴백하게 했다. 짧은 뷰포트에서 38개 중 30개가 지연되고 스크롤 시 마운트되는 것을 확인했다.

**늦은 오후: 큐레이션 큐 채우기 + 선택기 계열 정합 + 통합 런처**

- 레지스트리 정리 + completion-check 애니·popover-list 리치 프리뷰
  - draft 15개(13개 클론 + metric-card + stat-tile)를 지우고 ai-rule-console·trend-chart-card만 draft로 남겼으며, stable 6개(chat-input·docking·input·selector 계열)를 draft로 내렸다. importPathFor를 상태가 아닌 위치 기반으로 바꿔(src/staging면 subpath, 아니면 @maxflow/ui) 재분류된 draft도 배럴 import로 정확히 표기되게 했다. completion-check는 정적 체크에서 2.2초마다 key remount로 재생되는 실제 그리기 애니메이션으로, popover-list는 radio-only에서 Header+Radio+Switch+Slider의 리치 프리뷰로 올렸다.

- 리뷰 데스크 큐 채우기(선택기 계열 3종)
  - selector/selector-button/toggle-selector가 겹치는 role로 존재해 승격 전 통합 여부 판단이 필요하다고 보고 review-queue에 등록했다. 나머지 draft는 기존 stable과 중복이 없어 통과로 두었다.

- ui:harness 통합 런처(갤러리 + Storybook 동시)
  - pnpm ui:harness로 갤러리(9221, 발견·리뷰)와 Storybook(6007, 컴포넌트 워크벤치)을 한 번에 띄우게 했다. Storybook glob이 src/**라 하나의 인스턴스가 stable(Shared/UI/*)과 draft(Staging/*)를 모두 커버하고, 출력 프리픽스·한쪽 종료 시 정리·Ctrl+C 일괄 종료를 동시실행 dep 없이 node 오케스트레이터로 붙였다.

- 리뷰 데스크에 curate 통과분 5건 일회성 등록
  - 초반 단계라 curate 통과 항목도 전수 검토하기로 하고 5건을 등록했다. chat-input/docking/input은 코드가 이미 배럴 export된 상태(레지스트리 메타만 draft)라는 점, ai-rule-console/trend-chart-card는 실제 staging 진행 중 draft라는 점을 구분해 근거에 명시했다.

- 리뷰 데스크 좌우 항목 네비게이션
  - 우상단 '오늘 X건 중 X건째' 양옆에 화살표 버튼과 키보드 좌우 키를 붙여, 결정 없이 항목을 미리 보며 이동하게 했다. 히스토리·decided/skipped 카운트는 불변이고 양 끝에서 disabled 처리했다.

- ui-curate 초반 단계 플래그(전 draft 리뷰 큐잉)
  - EARLY_STAGE_QUEUE_ALL=true로, 볼륨이 작은 초반엔 3분류 판단은 하되 결과와 무관하게 모든 draft를 review-queue에 등록하게 했다(자동 merge-candidate 강등·통과 보류). 직접 리뷰하며 개선하려는 의도이고, 볼륨이 커지면 플래그를 끄고 3분류로 복귀한다는 안내를 달았다.

- selector-button 리치 프리뷰가 selector 최신 변경 반영
  - 리뷰 데스크 selector-button 검토를 반영했다. 컴포넌트 자체는 이미 Selector를 직접 렌더링해 코드 변경은 불필요했고, 갤러리 프리뷰의 좌측 콤보 목업만 정적 placeholder에서 SelectorList 기반 옵션/상태로 교체했다. 리뷰 소속 수정이라 history 사이드카에 via:"review"로 기록했다.

- 스킬이 Storybook 스토리 생산 + ui:harness 워크플로 문서화
  - 리치함의 SSOT를 Storybook 스토리(draft부터)로 두고 갤러리는 글랜스+발견·리뷰로 역할을 나눴다. ui-harness 스킬에 신규 draft마다 name.stories.tsx(title "Staging/Pascal")를 생성하는 절차를 넣고 demo는 얇은 글랜스로 격하했으며, AGENTS.md와 docs를 pnpm ui:harness(갤러리+Storybook 동시)·프로모션 시 스토리 리타이틀까지 반영해 갱신했다.

- selector 계열 composedOf 메타 누락 수정
  - 리뷰 데스크에서 selector-button을 보다 '구성에 selector가 없다'는 지적으로 발견했다. selector/selector-button/toggle-selector 3종 모두 실제 import와 무관하게 composedOf가 빈 배열로 등록돼 있었고(existing draft bootstrap 시 전수 누락), 실제 소스 기준으로 채웠다(selector-button은 selector·button, toggle-selector는 completion-check·popover-list 등). history에 via:"review"로 기록했다.

- ui-apply: src에 이미 있는 재분류 draft는 status-only 승격 가드
  - stable에서 draft로 상태만 내린 draft(files[0].path가 src/staging가 아니고 배럴에 이미 export)는, promote 시 코드 이동·배럴 등록·codemod를 건너뛰고 meta.status만 stable로 되돌리게 했다. 이 판정을 기존 가드보다 먼저 두지 않으면 배럴 중복 export 가드에 걸려 merge로 오라우팅되던 문제를 막았다.

- ai-rule-console 레지스트리 메타 정리(selector-button 반영)
  - 리뷰 데스크에서 '이 부분은 현 selector-button draft를 그대로 쓰면 되겠다'는 요청을 반영했다. 코드 변경은 동시 세션에서 이미 커밋됐고, composedOf에서 더 안 쓰는 popover-list를 제거하고 history에 via:"review"로 기록했다.

- trend-chart-card draft 추가
  - staging에 trend-chart-card 컴포넌트(index/demo/본체)를 새 draft로 추가하고 decisions.json에 반영했다.

**저녁: 첫 실행 편의 + Storybook 딥링크 + 온보딩**

- ui:harness 최초 실행 시 node_modules 없으면 자동 pnpm install
  - 통합 런처가 처음 뜰 때 node_modules가 없으면 자동으로 pnpm install을 돌리게 해 첫 실행 마찰을 없앴다.

- 상세 페이지 'Storybook에서 보기' 딥링크
  - storybookUrlFor로 entry의 title 규칙(staging은 Staging/Pascal, 그 외는 Shared/UI/category|Components/Pascal)을 sanitize해, 스토리명 없이도 Storybook이 첫 스토리로 자동 랜딩하는 링크(:6007)를 만들었다. 갤러리는 글랜스, 깊이는 Storybook으로 잇는 구도다.

- 갤러리 첫 방문 온보딩 모달(Claude Code · Codex)
  - 첫 방문 시 자동 표시(localStorage)되고 헤더 도움말 버튼으로 재열람하는 온보딩 모달을 넣었다. 쓰는 AI 도구를 골라 프롬프트를 복사해 붙여넣으면 바로 셋업되게 했고, Claude Code는 ui-harness 스킬만 설치하는 프롬프트, Codex는 AGENTS.md 자동 적용 프롬프트로 갈랐다. 로고는 각 웹 공식 SVG를 브랜드 색으로 인라인했다.

**밤: 온보딩 폴리싱 + 스킬 스텁+GUIDE 구조 + 최종 폴리싱**

- OnboardingModal 폴리싱
  - 툴 카드에 hover lift(그림자·translateY)와 transition을 넣고 배경을 st-muted로, 제목을 Getting Started로 다듬는 등 온보딩 모달의 표현을 정교화했다.

- 상세 Storybook 버튼 높이를 프롬프트 복사(h-9)에 맞춤
  - 상세의 Storybook 버튼 높이를 옆 프롬프트 복사 버튼(h-9)과 맞춰 정렬했다.

- 스킬을 스텁+GUIDE 구조로 (지침 갱신 git pull 자동 전파)
  - 개발자가 설치한 .claude/skills 사본이 정본 갱신 시 stale해지고 재설치를 강요할 수 없다는 문제를, 스텁+GUIDE 구조로 풀었다. 설치되는 SKILL.md는 트리거 등록용 얇은 스텁(발동 시 GUIDE.md를 매번 Read로 열어 따르라고 강제)으로 두고, 실제 절차·하드룰은 git-tracked GUIDE.md 정본으로 분리했다. install-skills는 스텁만 복사하고 GUIDE.md는 저장소에 두므로, 앞으로 GUIDE.md만 고쳐 push하면 개발자는 git pull로 재설치 없이 최신 지침을 받는다.

- curate·apply도 스텁+GUIDE 통일 + AGENTS.md를 GUIDE로 연결
  - 세 스킬(ui-harness/ui-curate/ui-apply)을 모두 같은 스텁+GUIDE 구조로 통일했다. Codex 쪽은 committed된 AGENTS.md가 각 GUIDE.md를 직접 가리키게 해서, 설치 없이 git pull만으로 지침이 전파되게 맞췄다.

- 갤러리 폴리싱(모션·깊이·인터랙션 일관성)
  - 레이아웃·그리드는 그대로 두고 표현만 한 단계 정교화했다. fade와 같은 곡선의 ease-smooth 토큰을 인터랙션 전반에 통일하고, 공용 Button과 같은 .press 유틸(부드러운 전이 + 마우스다운 시 1px 내려앉음)을 필터 칩·정렬/뷰 토글·nav·테마/도움말·상세 링크에 적용했다. 카드는 shadow-sm 안착에서 hover lift+shadow-xl, active에서 살짝 내려앉는 3단으로, 프리뷰 캔버스(DemoFrame)는 은은한 세로 그라데이션으로 깊이를 줬다. 토큰(st-*/text-step-*)은 디자인 시스템 SSOT라 유지하고 적용 레이어만 손봤다.

## 정리

하루를 관통한 축은 '발견 to 리뷰 to 적용'이라는 큐레이션 루프를, 그 루프를 도는 사람이 실제로 불편함 없이 쓸 수 있는 도구로 만드는 것이었다. 그래서 오늘의 작업 대부분은 화려한 신기능이라기보다, 딥링크로 특정 상태를 URL에 담고(sort·filter·focus), 컴포넌트가 어떻게 진화했는지를 히스토리 타임라인에 남기고, 리뷰 데스크와 상세를 왕복으로 잇는 식의 '연결과 상태 보존'에 가까웠다. 이런 것들이 쌓여야 도구가 데모를 넘어 하루 종일 켜놓고 쓰는 물건이 된다는 감각이 있었다.

가장 배운 점이 큰 것은 스킬 스텁+GUIDE 구조였다. 지침을 파일로 배포하는 순간 그 사본은 낡기 시작하고, 개발자에게 재설치를 계속 요구할 수는 없다. 설치본을 '정본을 가리키는 얇은 포인터'로 만들고 정본은 git으로 추적하면, 앞으로 지침을 고칠 때 나는 GUIDE 하나만 고쳐 push하고 개발자는 git pull만 하면 된다. 배포물과 정본의 결합을 끊는 이 패턴은 앞으로 다른 팀 배포 자산에도 그대로 쓸 만하다.

시나리오 기반 실사용 테스트가 실제로 크래시를 잡아준 것도 기억에 남는다. 잘못된 percent-escape 딥링크가 decodeURIComponent에서 throw해 앱을 백지로 만들던 크래시나 skip/Backspace off-by-one 같은 것은, 기능을 만드는 시선으로는 잘 안 보이고 '사용자처럼 막 눌러보는' 시선에서야 드러난다. 딥링크로 상태를 URL에 노출하기로 한 결정이 곧 사용자가 이상한 URL로 진입할 수 있다는 뜻이기도 해서, safeDecodeSlug 같은 경계 방어를 함께 깔아야 한다는 걸 다시 확인했다.

마지막으로 반복해서 신경 쓴 제약은 '갤러리 전용 스타일·자산이 공용 디자인 시스템이나 다른 앱으로 새지 않게' 하는 경계였다. 갤러리는 공개 배포되고 @maxflow/ui는 여러 앱이 공유하므로, 폴리싱은 적용 레이어에서만 하고 토큰(st-*) 같은 SSOT는 건드리지 않는다는 선을 계속 지켰다. 도구를 예쁘게 만드는 일과 도구가 검증하려는 대상을 오염시키지 않는 일 사이의 균형이, 이런 하네스 성격의 프로젝트에서 계속 따라올 과제로 보인다.
