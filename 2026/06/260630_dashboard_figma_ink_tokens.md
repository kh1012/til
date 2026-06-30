---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "프로젝트 대시보드를 Figma(RPM-DAY)에 정밀 매칭하고, 강조 검정을 ink 토큰/variant로 체계화"
updatedAt: "2026-06-30"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "figma-precision"
  - "design-token"
  - "tailwind-theme"
  - "react-query-invalidation"
  - "twmerge-override"
  - "hover-affordance"

relatedCategories:
  - "css"
  - "react"
---

# 대시보드 Figma 정밀 매칭과 ink 토큰 도입

> 프로젝트 대시보드를 Figma 디자인(RPM-DAY)에 픽셀 단위로 맞추면서, 곳곳에서 반복되던 강조 검정(#0f172a)을 ink 토큰과 variant로 체계화한 오후의 기록.

## 배경

오전의 헤더 작업에 이어 오후에는 프로젝트 대시보드 페이지를 Figma 디자인(RPM-DAY node 10-3633)에 맞췄다. 빈 상태 히어로부터 히어로 카드, 미니 프로젝트 카드, 필터 바까지 한 화면을 통째로 정밀 매칭했다.

그 과정에서 강조용 near-black(#0f172a, slate-900)이 페이지 여기저기서 하드코딩으로 반복되는 게 보였다. 그래서 이걸 디자인 시스템 토큰(accent-ink)과 컴포넌트 variant(Button/Avatar ink)로 끌어올렸고, 이 과정에서 apps/web이 어떤 CSS 스킨을 실제로 import하는지에 얽힌 토큰 미적용 버그도 잡았다. 디자인 매칭이 우연히 디자인 시스템 정리로 번진 하루였다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 빈 상태 히어로 UI + arbitrary value lint 전역 해제
  - dashboard-empty-state에 히어로 이미지 + 설명 텍스트 레이아웃을 구현하고 빈 상태 i18n 키를 추가, app-shell에 연결했다. Figma UI를 맞추기 위해 no-tailwind-arbitrary-value를 전역 off로 임시 해제했다(헤더는 디렉토리 override였는데, 대시보드 작업 범위가 넓어 우선 전역으로 풀었다).

- 프로젝트 대시보드 Figma 정밀 매칭 (RPM-DAY 10-3633)
  - 히어로 카드를 프로젝트명 42px Bold, 칩 white/13 통일, 단계 레일 3px 바와 9px 라벨, 활동 지표를 큰 숫자(25px)+접미 2열 레이아웃으로 재작성. 우측 패널은 솔리드 배경(#47456e)·border(#696881)·radius 15에 흰 버튼/인디고 텍스트로. 미니 프로젝트 카드는 흰 카드(rounded-10, 무보더+섀도)에 상태 컬러칩과 스펙칩 행을 추가하고 kebab을 우상단 absolute로. 필터 바 제목을 "다른 프로젝트", 하단 카운트를 "총 N개 · 1-6 표시"로. i18n(ko/en)과 관련 테스트도 새 구조로 갱신했다.

- 프로젝트 생성 후 즉시 갱신 + 검색범위 셀렉터 배선
  - 생성 onSuccess가 projects.all만 무효화하고 별도 네임스페이스인 dashboard 키를 빠뜨려서, staleTime(30s)만큼 옛 목록이 남던 문제. dashboard.all() 무효화를 추가했다. 또 TextFieldWithFilter의 필터 셀렉터가 filterValue/onFilterChange 미배선이라 placeholder만 뜨고 반응이 없던 문제도 함께 잡았다. searchField 상태를 신설하고(ProjectListFilters+기본값+URL field 파라미터) 범위별 검색 매칭을 적용, searchOptions를 실제 데이터가 있는 필드(전체/프로젝트명/구조형식/층수)로 정리했다(면적·지역은 ProjectSummary에 필드가 없어 제외).

- 최근 카드 hover를 Figma 단일 상태에 맞춰 정리
  - Figma는 hero 카드에 정지 상태 하나만 정의하는데, 정지 그림자는 토큰과 정확히 일치하지만 hover에서 더 큰 그림자 교체 + scale(1.018)로 그림자가 이중 확대되고 4px lift까지 겹쳐 정지 디자인과 어긋났다. "수치는 같은데 눈으로 다르다"의 원인이 이 hover 연출이었다. hover/focus를 클릭 어포던스용 2px lift만 남기고 그림자·scale 변화를 제거, 무효화되어 있던 dead 클래스(hover:bg-surface-raised, hover:border-accent/40)와 미사용 hover-shadow 토큰도 정리했다.

- 인사 폰트 Figma 매칭·지표 목업·세로 중앙·hover 케밥
  - DashboardGreetings의 eyebrow(12px/tracking 1.44)와 타이틀(22px/tracking -0.55)을 Figma에 맞추고 이름 액센트를 브랜드 인디고(#4f46e5)로. 최근 카드의 활동 지표+divider를 데모 목업으로 항상 노출(데이터 없으면 샘플값)하고 좌측 컬럼을 mt-auto로 맨 아래 배치. 대시보드 콘텐츠는 content-center+my-8로 세로 중앙 정렬(짧으면 가운데, 넘치면 자연 top 정렬). 미니카드 케밥은 평소 숨기고 hover/focus 시에만 등장하게 했다.

- Pagination 현재 페이지 버튼 배경 주입 prop
  - 선택된 페이지 버튼에 덧입힐 클래스를 외부에서 주입할 수 있게 activePageClassName prop을 열었다. 미지정 시 기본 primary 룩을 유지해 기존 동작은 불변.

- 미니카드 케밥을 상태칩과 hover swap
  - 케밥 예약 여백(pr-7) 때문에 빈 영역이 보이던 걸 제거. 상태칩을 우상단 끝에 두고 hover/focus 시 페이드아웃, 같은 자리에 케밥(absolute)이 등장하도록 swap했다.

- accent-ink 토큰 추가
  - 강조용 near-black(slate-900, #0f172a)을 토큰화. @theme 매핑 + :root raw 정의로 bg-accent-ink / text-accent-ink를 쓸 수 있게 했고 다크는 :root 값을 상속. Pagination 선택 페이지 배경 같은 강조 검정에 사용할 목적이었다.

- 프로젝트 필터 Select 색상을 Figma slate 토큰에 맞춤
  - 공용 Select(packages/ui)는 shadcn-template 스킨(st-*)의 중립 회색을 써서 Figma의 slate 톤과 어긋났다. 사용처에서 maxflow slate 토큰으로 배선했다. 라벨은 text-muted-foreground로(#94a3b8), 값은 text-accent-ink로(#0f172a, twMerge가 trigger의 text-st-foreground를 override하는 걸 검증), h2 "다른 프로젝트"도 arbitrary hex를 text-accent-ink로 토큰화. 신규 토큰 없이 기존 토큰을 재사용했다.

- 하드코딩 #0f172a → accent-ink 마이그레이션
  - 빈 상태(코드네임 뱃지/헤딩/MIDAS MAX), 미니칩, 인사 타이틀, 미니카드명에 흩어진 text-[#0f172a]/bg-[#0f172a]를 text-accent-ink/bg-accent-ink로 치환했다.

- Button ink variant 추가
  - st 스킨에 st-ink 토큰(#0f172a, 다크/라이트 고정)을 신설하고 Button에 ink variant를 추가. 강조 검정 버튼을 variant로 쓸 수 있게 했다(Pagination 선택 페이지 등).

- Avatar ink variant 추가
  - AvatarRoot의 색/배경/ring을 variantClass로 분리하고 ink variant를 추가. Button ink와 동일한 st-ink 토큰을 쓰고 기본은 default(중립).

- ink variant 적용 + 하단 divider 정리
  - UserAvatar에 variant="ink", Pagination 선택 페이지 배경에 activePageClassName="bg-accent-ink"를 적용. Divider를 DashboardProjects에서 DashboardProjectsBottom(하단 카운트 위)으로 옮겼다.

- snb '작성 필요'(todo) 상태 아이콘을 user-round-pen으로 변경
  - 상태→아이콘 SSOT(STATUS_ICON)의 todo 글리프를 Circle에서 UserRoundPen으로 교체. 범례 스토리와 사용처 전반에 일괄 반영되고 설명 문구도 "원"에서 "펜"으로 정정했다.

- st-ink 토큰을 apps/web 스킨에 추가 + Avatar ink를 st-ink로 통일
  - 오늘 가장 까다로운 버그. apps/web은 packages/ui/st.css가 아니라 shadcn-template.css(앱 복제본)를 @import한다(st.css는 @source 스캔만 하고 @theme은 미처리). st-ink를 st.css에만 넣었더니 bg-st-ink 유틸이 apps/web에서 아예 생성되지 않아 적용이 안 됐다. shadcn-template.css의 @theme+다크/라이트 2블록에 st-ink를 추가해 해결하고, Avatar ink도 accent-ink에서 st-ink로 되돌려 Button과 통일. tailwind 컴파일에서 .bg-st-ink 규칙 생성을 확인했다.

- snb '작성 필요'(todo) 아이콘 tone을 subtle → muted로 변경
  - 진행 중(ai_running)과 같은 muted 톤으로 통일. 미사용 상태가 된 subtle(30% 불투명도)은 type과 toneClass에서 제거했다.

## 정리

오후의 큰 줄기는 "대시보드를 Figma 그대로 맞추다 보니 강조 검정이 반복되는 게 보였고, 그걸 토큰/variant로 끌어올렸다"였다. 화면 매칭(빈 상태 → 히어로 → 미니카드 → 필터)을 먼저 끝내고, 거기서 발견한 #0f172a 하드코딩을 accent-ink로 토큰화 → 마이그레이션 → Button/Avatar variant화 → 사용처 적용 순으로 정리했다.

가장 값진 교훈은 토큰 미적용 버그였다. st-ink를 분명히 st.css에 추가했는데 apps/web에서 bg-st-ink가 안 먹었다. 원인은 apps/web이 st.css를 @import하는 게 아니라 shadcn-template.css라는 앱 복제본을 @import하고 있었다는 것. st.css는 @source로 스캔만 될 뿐 @theme이 처리되지 않으니, 토큰을 거기에만 넣으면 유틸 클래스 자체가 생성되지 않는다. "토큰을 추가했는데 왜 안 먹지"의 답은 거의 항상 "그 토큰이 정의된 파일이 실제로 빌드 파이프라인의 @theme 경로에 들어가 있는가"였다. 결국 한 토큰을 두 스킨 파일에 모두 넣어야 했고, 동시에 Avatar의 색 출처를 accent-ink에서 st-ink로 되돌려 Button과 단일 토큰으로 통일했다. 비슷한 이름의 토큰(accent-ink vs st-ink)을 두 갈래로 두면 이렇게 적용 경로가 갈려 혼란이 생긴다는 것도 같이 새겼다.

두 번째는 "수치는 같은데 눈으로 다르다"였던 최근 카드 hover다. 정지 그림자는 Figma 값과 정확히 일치하는데도 hover에서 더 큰 그림자 + scale + lift가 겹쳐 정지 디자인이 깨져 보였다. Figma가 정지 상태 하나만 정의했다면 hover 연출도 그 의도(클릭 어포던스 최소한만)에 맞춰야지, 토큰 수치가 맞다고 디자인이 맞는 건 아니라는 걸 확인했다. 그 밖에 react-query에서 생성 mutation이 네임스페이스가 다른 캐시 키(projects.all vs dashboard.all)를 모두 무효화해야 즉시 갱신된다는 점, twMerge에서 사용처 className이 trigger의 기본 텍스트색을 override하는 순서를 검증하고 쓴 점도 기록해둔다.
