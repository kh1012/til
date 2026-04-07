---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "CSS Custom Properties로 56개 디자인 시스템 실시간 비교 도구 구축"
updatedAt: "2026-04-07"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "css-custom-properties"
  - "design-tokens"
  - "theme-comparison"
  - "oklch"
  - "inline-style-theming"
  - "side-by-side-preview"

relatedCategories:
  - "design-system"
  - "react"
  - "nextjs"
---

# CSS Custom Properties로 56개 디자인 시스템 실시간 비교 도구 구축

> 인라인 스타일 `var(--pv-*)` 패턴으로 런타임 테마 전환 없이 side-by-side 디자인 비교를 구현한 경험 정리

## 배경

MAX 프론트엔드의 디자인 방향을 결정하기 위해 Linear, Figma, Vercel 등 실제 서비스의 디자인 시스템을 동일 UI에 입혀서 비교하는 도구가 필요했다. Storybook이나 Chromatic 같은 기존 도구는 **이종 디자인 시스템 간 동일 UI의 side-by-side 실시간 비교**를 지원하지 않아 직접 구축했다.

## 핵심 내용

### 1. CSS Variable Scoping으로 좌/우 독립 테마

```tsx
// 부모 div의 style에 --pv-* 변수를 주입하면 자식 전체에 테마 적용
<div style={{ "--pv-bg": "#08090a", "--pv-accent": "#5e6ad2", ... }}>
  <MockSidebar />  // pv("bg") → var(--pv-bg) → #08090a
  <ChatArea />
</div>
```

핵심은 `pv()` 헬퍼 함수:

```ts
function pv(prop: string) { return `var(--pv-${prop})`; }
```

모든 mock 컴포넌트가 `pv("accent")`, `pv("r-btn")` 등으로 스타일링하면, 부모의 인라인 style만 바꾸면 전체 테마가 전환된다. 런타임 테마 라이브러리(next-themes, styled-components ThemeProvider 등) 없이 순수 CSS 변수로 동작.

### 2. 색상만이 아닌 "밀도" 토큰의 중요성

초기에는 색상/radius/font만 바꿨는데 "다 비슷해 보인다"는 피드백. 실제로 디자인 시스템의 핵심 차이는 **사이징/밀도/비율**에 있었다:

| 토큰 | MAX | Linear | Figma | Vercel |
|------|-----|--------|-------|--------|
| sidebar-item-h | 28px | **24px** | **28px** | 32px |
| msg-gap | 24px | **16px** | **20px** | **40px** |
| btn-h | 32px | **28px** | **28px** | 32px |
| fs-display | 38px | 32px | **36px** | 36px |
| content-radius | 24px | **0px** | **0px** | **0px** |

70+ 토큰을 **색상/타이포/사이징/구조적** 4개 레이어로 분리하니 비로소 "이 서비스가 MAX를 만들었다면" 수준의 차이가 체감됐다.

### 3. CSS Attribute Selector로 구조적 분기

`box-shadow로 border 대체` (Vercel), `dashed focus outline` (Figma) 같은 구조적 차이는 CSS 변수만으로 표현 불가. `[style*="..."]` attribute selector로 해결:

```css
/* Vercel: shadow-as-border */
[style*="border-method: shadow"] .pv-card-border {
  border: none !important;
  box-shadow: rgba(0,0,0,0.08) 0 0 0 1px;
}

/* Figma: solid B&W user message */
[style*="usermsg-style: solid"] .pv-usermsg {
  background: var(--pv-user-msg);
}
```

부모의 `--pv-border-method: shadow`가 설정되면 자식의 `.pv-card-border` 클래스에 shadow-ring이 자동 적용.

### 4. 오버레이 컴포넌트는 테마 변수 범위 밖

Token Inspector, Scorecard, Token Diff 같은 오버레이 패널을 `pv()` 기반으로 만들었더니 **배경이 투명**해지는 버그 발생. 원인: 오버레이가 `--pv-*` 변수가 정의된 `style` 속성 범위 밖에 렌더링됨.

해결: 오버레이는 테마 독립적이어야 하므로 고정 neutral 색상 사용:

```ts
const C = { bg: "#ffffff", fg: "#171717", muted: "#888", border: "#e5e5e5", accent: "#3b82f6" };
// pv("bg") 대신 C.bg 사용
```

### 5. 12-Slot 애니메이션 시스템

서비스별 스트리밍 애니메이션을 CSS attribute selector로 스위칭:

```css
.pv-anim-slot > * { display: none; }
[style*="anim: max"]    .pv-anim-slot > .pv-anim-max    { display: flex; }
[style*="anim: figma"]  .pv-anim-slot > .pv-anim-figma  { display: flex; }
```

모든 애니메이션을 DOM에 렌더하고, CSS만으로 매칭되는 것만 표시. JavaScript 조건 분기 없이 동작.

### 6. Agent Team 병렬 구현 패턴

10개 기능을 4개 모듈로 분리, 파일 충돌 분석 후:

```
Phase 1 (Parallel Swarm) — 신규 파일만
  Worker A: interactions.tsx + token-inspector.tsx
  Worker B: scorecard.tsx + token-diff.tsx
  Worker C: domain.tsx + chat.tsx (+DensityChat)

Phase 2 (CTO Sequential) — 공유 파일
  CTO: page.tsx 통합 + styles.tsx + themes.ts
```

핵심 규칙: **신규 파일은 병렬, 공유 파일은 순차**. Worker별 파일 경계를 명확히 지정하면 충돌 없이 3배 속도.

## 정리

- CSS Custom Properties는 런타임 테마 라이브러리 없이도 강력한 테마 비교 도구를 만들 수 있다
- 디자인 시스템 비교의 핵심은 색상이 아니라 **밀도(density)** — 사이징, 간격, 비율이 체감 차이를 만든다
- 오버레이/모달처럼 DOM 트리 상 테마 scope 밖에 렌더되는 컴포넌트는 반드시 테마 독립적으로 설계해야 한다
- `[style*="..."]` CSS attribute selector는 CSS 변수로 표현 불가능한 구조적 분기에 유용하지만, specificity 관리에 주의 필요
- Agent Team 병렬화는 파일 소유권만 명확하면 체감 3배 속도 향상
