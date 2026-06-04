---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "shadcn(Base UI) 쇼케이스 카탈로그를 사이드이펙트 0으로 격리 구축하기"
updatedAt: "2026-06-04"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "shadcn"
  - "storybook"
  - "base-ui"
  - "design-tokens"
  - "agent-team"
  - "tailwindcss"

relatedCategories:
  - "storybook"
  - "css"
  - "tailwindcss"
---

# shadcn 쇼케이스 카탈로그를 격리 샌드박스로 짓기

> 기존 앱을 한 줄도 건드리지 않는다는 제약 아래, shadcn(Base UI) 샘플 카탈로그를 배럴 미export, 독립 토큰, Storybook 전용 3중 격리로 짓고, 공식 쇼케이스를 에이전트 팀으로 1:1 충실 재현했다.

## 배경

어제 assistant 위젯에 shadcn preset 색만 떼어 독립 토큰(sc-\*)으로 입혀본 흐름의 연장이다. 이번에는 "shadcn 컴포넌트 전체가 우리 환경에서 실제로 어떻게 보이는지" 카탈로그를 만들어 보고 싶었다. 다만 maxflow는 운영 코드라 새 컴포넌트가 기존 번들, 토큰, 빌드에 한 톨이라도 영향을 주면 안 됐다. 그래서 "기능을 추가하되 사이드이펙트는 0"이라는, 격리가 전제인 작업이 됐다. 여기에 우리 컴포넌트 베이스가 Radix가 아니라 Base UI라는 점이 곳곳에서 결정을 갈랐다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- shadcn(Base UI) 샘플 카탈로그 격리 구축
  - 격리를 세 겹으로 걸었다. 배럴에서 export하지 않고, 토큰은 별도 sk-\* 네임스페이스(showroom.css)로 분리하고, Storybook 전용으로만 노출했다. 기존 sc-\*/globals는 한 줄도 손대지 않아 사이드이펙트가 0이 됐다.
  - 가장 중요한 발견은 `shadcn create --base base`의 base가 곧 Base UI라는 점이었다. 우리 기존 v2 컴포넌트와 같은 primitive를 쓰므로, Radix를 중복으로 들이거나 base-ui를 bump할 필요가 없었다. 결과적으로 신규 의존성은 cva와 tw-animate-css 둘뿐이었다.
  - 방식은 샌드박스에서 shadcn create 후 add로 받은 산출물을 codemod로 이식하는 것이었다. 표준 토큰을 sk-\*로, import를 cn과 상대경로로 바꿔 옮겼다. 우선 deps-free 46개와 갤러리 스토리 4개만 담고, drawer/command/input-otp 같은 heavy-dep는 보류했다.
  - 작업 중 preview.tsx가 이미 삭제된 command-palette를 import해 Storybook 빌드가 깨져 있던 것을 발견해 함께 고쳤다.

- chart/calendar/combobox + 토큰·쇼케이스 스토리 추가
  - 공식 create 페이지 자체가 조합 쇼케이스라는 걸 알아채고, 거기서 아직 안 받은 3종(chart/calendar/combobox)만 채우면 전부 커버된다는 판단을 했다.
  - combobox는 cmdk가 아니라 Base UI의 Combobox를 써서 cmdk와 base-ui bump를 또 회피했다. 대신 recharts, react-day-picker, date-fns가 dep로 들어왔다.
  - 라이브러리 버전 차이에서 온 버그 둘을 잡았다. chart의 다크 테마 셀렉터가 `.dark`로 박혀 있어 우리 `[data-theme=dark]`로 바꿨고, calendar는 react-day-picker 10의 키 변경(`table:`→`month_grid:`)을 따라갔다.

- 쇼케이스 폼·대시보드·컨트롤 스토리 추가
  - 신규 의존성이나 컴포넌트 변경 없이 기존 49종 조합만으로 create 페이지 카드를 재현하는 배치 작업이었다. forms-settings(배송/버그리포트/프로필/알림/초대/예약), dashboard(인보이스·거래 테이블/저축 진행률/기여자·팀 아바타/단축키), controls(슬라이더/보유자산/환경변수/에이전트/탭+툴팁/404)를 묶었다.

- Storybook 테마 토글 추가 + 설정 타입검사 포함
  - Storybook가 시스템 테마만 따라가서 명시적으로 전환할 수가 없었다. globalTypes 툴바(light/dark)와 next-themes setTheme를 잇는 ThemeSync를 넣었다. data-theme 전환이라 sk-\*와 maxflow 토큰에 동시에 먹었다.
  - tsconfig include에 .storybook을 추가했다. 그동안 preview/config가 타입검사 범위 밖이라, preview.tsx의 버그가 tsc를 그냥 통과해 왔던 구멍을 막은 것이다. 실제로 preview 주석에 적힌 `sk-*/maxflow`의 `*/`가 블록 주석을 조기 종료시키던 버그를 이 과정에서 잡아 라인 주석으로 교체했다.

- base-nova 커스텀 variant 레이어 추가
  - 증상은 slider 트랙과 레인지에 색이 없고 tabs/toggle-group/separator 레이아웃이 붕괴된 것이었다.
  - 원인을 파보니 컴포넌트가 `data-horizontal:`, `data-active:` 같은 bare 커스텀 variant를 쓰는데, Base UI는 실제로 `data-orientation`/`data-state` 속성을 내보낸다. 둘을 잇는 매핑이 shadcn 쪽 tailwind.css에만 있고 우리 쪽엔 적용되지 않아 통째로 무시되고 있었다.
  - tailwind.css의 @custom-variant 9종(토큰 무관)과 Base UI 추가 상태(highlighted/placeholder/pressed/empty/popup-open 등), accordion keyframes, no-scrollbar를 showroom-base.css로 추출했다. 다만 표준 토큰 기반 cn-\* 유틸은 maxflow globals와 충돌할 위험이 있어 일부러 뺐다.

- 쇼케이스 충실 재현 파일럿 4종 (agent team)
  - 여기서부터 방식을 바꿨다. 공식 base-nova의 쇼케이스 HTML을 의역이나 요소 누락 없이 그대로 재현하기 위해, 에이전트 팀(workflow) 4기를 병렬로 돌렸다. Kitchen Island, Holdings, Codespaces, Vercel Agent를 파일럿으로 잡았다.
  - 에이전트 정확도를 확보하려고 변환 가이드(API 패턴, 토큰 규칙, 충실 원칙)와 exports 대조를 함께 줬다. 공식 HTML을 컴포넌트 part 조합으로 풀고 텍스트까지 정확히 맞췄다.

- 쇼케이스 전체 충실 재현 10그룹 (agent team)
  - 파일럿이 통했으니 같은 방식으로 page1/page2 카드 약 55개를 한 번에 확장했다. 에이전트 팀 10기 병렬. finance/forms/smarthome/empty/nav/misc(p1)와 charts/forms/data/misc(p2)로 나눴다.
  - 스펙을 별도 파일로 보존해 두고 거기서 변환하게 했고, exports 대조로 정확도를 확인했다. 토큰 누수 0, 식별자 안전을 검증 항목에 넣었다.

- 근사 배치본 제거 + 잔여 유니크 카드 충실화
  - 앞서 조합으로 근사하게만 맞춰 둔 배치 4개(data-viz/forms-settings/dashboard/controls)는 충실본으로 대체됐으니 제거했다. 대신 그 배치에만 있던 유니크 카드 3종(최근거래/예정결제 캘린더/주식성과 콤보박스)을 충실 버전으로 추가했다.
  - 양수 금액 색은 sk-success 토큰이 정의돼 있지 않아 공식과 동일하게 text-emerald-500을 그대로 썼다.

- sk→st 토큰·디렉터리 네이밍 통일
  - 토큰 prefix를 정리하면서 통합 범위를 고민했다. sk(showroom)와 sc(assistant)는 프리셋도 어휘도 다르다(surface/paper vs card/primary). 그래서 통합은 showroom에만 적용하고 assistant의 sc는 건드리지 않기로 했다. 어제 sc로 입힌 톤을 깨면 리그레션 위험이 너무 컸다.
  - sk-\*를 st-\*로 878건 바꾸고, _showroom을 _shadcn-template으로 git mv했다. showroom.css 계열 파일명, data-skin 속성, Storybook 타이틀까지 일괄 통일했다.
  - 이 과정에서 두 가지 CSS 버그를 잡았다. 갤러리가 중앙정렬 shrink-to-fit이라 max-w/w-full이 무효였던 문제는 고정폭 w-[42rem] max-w-full로 풀었다. bare border가 Tailwind v4 기본값인 currentColor(검정)로 찍히던 문제는 [data-skin] 스코프 base에 border-color를 토큰으로 지정해 막았다.

- preview.tsx docgen 경고 제거
  - preview.tsx만 docgen 경고가 떴다. 원인은 createFilter(dot:true)는 transform을 통과시키는데, 내부 globSync(dot:false)가 .storybook을 못 잡아 rootFiles에서 누락되며 두 게이트 틈에 빠진 것이었다. tsconfig include엔 있어서 tsc는 0이었다.
  - .storybook은 컴포넌트가 아니니 docgen 대상에서 빼는 게 정답이라, reactDocgenTypescriptOptions.exclude에 `**/.storybook/**`를 추가했다. 기본 exclude(`**/*.stories.tsx`)를 덮어쓰므로 스토리 제외값도 함께 유지했다.

- 쇼케이스·컴포넌트 다수 수정 및 트리 재편
  - 빌드 순서의 산물로 남아 있던 P1/P2/Pilot 트리를 Components/Foundations/Showcase 9테마로 재편하고 Pilot export 4종을 개명했다.
  - 포털로 빠지는 컴포넌트의 테두리 문제가 반복됐다. dialog/sheet/alert-dialog가 [data-skin] 밖으로 나가 v4 currentColor(검정) 테두리가 찍혔는데, Popup에 data-skin을 전파해 st-border가 닿게 했다.
  - Base UI 특유의 크래시도 잡았다. DropdownMenuLabel을 Group 없이 쓰면 MenuGroupRootContext가 throw해서 DropdownMenuGroup으로 감쌌다. 아코디언은 --animate-accordion-\* 토큰이 없어 유틸이 생성되지 않던 것을 토큰 추가로 부드러운 height 전환으로 복구했다.
  - 그 밖에 Select 트리거 정렬, Calendar 풀폭, Tooltip 폭 제한, Sidebar 콘텐츠 높이(min-h-0) 같은 디테일과, LivingRoom의 ToggleGroup/Slider 상태 배선, Live Audio 파형(canvas+rAF), Scan to Connect 실제 QR까지 인터랙션을 살렸다.

## 정리

하루를 관통한 건 "기능은 더하되 기존 코드에는 0의 흔적을 남긴다"는 제약이었다. 그 제약이 거의 모든 결정을 만들었다. 배럴 미export, 독립 토큰, Storybook 전용이라는 3중 격리가 출발점이었고, 그 덕에 카탈로그를 통째로 짓고도 maxflow 본체는 그대로였다. 격리가 전제일 때 의존성 하나를 더 들이는 것도 사이드이펙트라, `--base base`가 Base UI라는 사실을 확인해 Radix 중복과 base-ui bump를 피한 게 결정적이었다.

작업의 성격이 중간에 두 번 바뀐 점이 기억에 남는다. 처음에는 공식 컴포넌트를 받아 조합으로 "근사하게" 채웠지만, 그건 결국 충실본으로 대체될 임시였다. 그래서 공식 HTML을 1:1로 재현하는 방식으로 옮기면서 에이전트 팀을 병렬로 투입했는데, 정확도는 자유도를 줄여야 올라간다는 걸 다시 확인했다. 스펙을 별도 파일로 고정하고 변환 가이드와 exports 대조를 함께 주니, 10기를 동시에 돌려도 의역과 누락 없이 55개 카드가 맞아떨어졌다. 사람이 일일이 짰다면 하루로는 어림없었을 분량이다.

함정은 베이스 차이와 격리 경계에서 반복적으로 나왔다. shadcn 컴포넌트가 쓰는 bare variant는 Base UI의 data-orientation/data-state와 매핑되지 않으면 통째로 무시돼 렌더가 무너졌고, 포털로 빠지는 dialog/popover 류는 [data-skin] 스코프 밖이라 토큰 cascade가 끊겨 테두리가 검게 찍혔다. 어제 portal 때문에 색이 새던 것과 정확히 같은 구조의 문제다. 포털 요소는 항상 스코프 경계를 의심해야 한다는 교훈이 또 한 번 적용됐다. 그리고 CSS 주석 안 `*/`가 블록 주석을 조기 종료시킨 버그도 어제에 이어 또 만났는데, 이번엔 .storybook을 타입검사 범위에 넣으면서 비로소 tsc가 잡아냈다. 검사 범위에 없으면 버그는 통과한다는, 당연하지만 자주 놓치는 사실을 설정 한 줄로 메운 셈이다.
