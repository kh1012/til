---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "shadcn 격리 카탈로그를 v2 정식 primitives로 승격하기"
updatedAt: "2026-06-05"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-system"
  - "storybook"
  - "base-ui"
  - "eslint"
  - "component-library"

relatedCategories:
  - "storybook"
  - "css"
---

# 격리 카탈로그를 v2 정식 primitives로 승격하기

> 어제 사이드이펙트 0으로 격리해 지은 shadcn 카탈로그를 v2/primitives로 정식 승격하고, 51개 전 컴포넌트를 개별 스토리로 카탈로그화하면서 트리(IA)와 레이아웃을 통일했다.

## 배경

어제 shadcn(Base UI) 카탈로그를 배럴 미export, 독립 토큰, Storybook 전용이라는 3중 격리로 지었다. 그건 "본체에 흔적 0"을 전제로 한 샌드박스였다. 오늘은 그렇게 검증한 카탈로그를 실제로 쓸 수 있는 정식 디자인시스템으로 끌어올리는 작업이었다. 격리를 푸는 순간 기존 어댑터와 토큰, 빌드 검사와 다시 만나므로, 경계를 어떻게 다시 긋느냐가 관건이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- shadcn-template 카탈로그를 v2/primitives로 승격
  - `_shadcn-template`을 `v2/primitives`로 git mv하면서 내부 상대 import는 그대로 유지했다. primitives 배럴 44개를 만들어 v2 배럴에 연결하되, 이름이 겹치는 5종(badge/button/popover/spinner/tooltip)은 배럴에서 제외해 기존 어댑터가 우선하게 했다. 정식화하면서도 이미 있던 v2 컴포넌트를 덮어쓰지 않으려는 경계다.
  - ESLint를 3-tier로 다시 짰다. 어제 전면 ignore했던 것을 풀고, primitives에는 relaxed override(스타일 룰은 끄되 타입검사와 빌드는 유지)를 줬다. 격리를 풀면 곧 검사 대상이 되니, 어디까지 엄격히 볼지 층을 나눈 것이다.
  - Storybook 타이틀도 `Shadcn Template/*`에서 `v2/*`(Components, Foundations, Showcase)로 옮겨 정식 위치로 표기했다.
- v2 전 컴포넌트 개별 스토리 + IA 통일
  - Components 51종(primitives 44 + 어댑터 7)에 autodocs 개별 스토리를 붙이고 data-skin으로 감쌌다. 빠져 있던 어댑터 스토리(Markdown, Spinner)도 채웠다.
  - 트리를 `Shared/UI/v2/{Components, Catalog, Foundations, Showcase}`로 통일했다. 승격 중에 어긋난 `v2/*` prefix를 교정하고, 그룹 4종은 Catalog 개요로 묶었다.
- Storybook 스토리 가로 붕괴 수정
  - 신규 51개 스토리에서 Field처럼 가로로 늘어나야 하는 콘텐츠가 쫍아드는 문제가 있었다. 원인은 centered 레이아웃이 캔버스를 shrink-to-fit으로 잡아 `w-full`이 0으로 붕괴하는 것이었다. layout을 padded로 바꿔 `w-full max-w-md`가 정상 폭을 받게 했다. 어제 갤러리에서 만난 shrink-to-fit 붕괴와 같은 계열의 문제다.

## 정리

어제가 "흔적 0으로 격리해 짓기"였다면 오늘은 "그 격리를 정식으로 푸는" 날이었다. 격리를 풀 때 본질은 경계를 다시 긋는 일이었다. 배럴에는 연결하되 이름이 겹치는 5종은 어댑터에 양보하고, ESLint는 전면 ignore에서 3-tier 완화로 바꾸고, 토큰과 스토리 타이틀을 v2 정식 위치로 옮겼다. 격리는 한 번에 풀리지 않고 층층이 풀어야 한다는 걸 다시 느꼈다.

레이아웃 함정도 반복됐다. 어제 갤러리에서 잡았던 centered shrink-to-fit 붕괴가 오늘 신규 스토리에서 또 나왔다. 같은 함정이 컨텍스트만 바꿔 되돌아온다는 점에서, 이런 류는 개별 버그가 아니라 패턴으로 기억해 둬야 손이 빨라진다.
