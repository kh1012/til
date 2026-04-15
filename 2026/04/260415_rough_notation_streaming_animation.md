---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "rough-notation으로 스트리밍 로딩 애니메이션 구현"
updatedAt: "2026-04-15"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "rough-notation"
  - "svg-animation"
  - "next-font-local"
  - "streaming-indicator"
  - "css-shimmer"

relatedCategories:
  - "css"
  - "nextjs"
  - "animation"
---

# rough-notation으로 스트리밍 로딩 애니메이션 구현하기

> Lottie 기반 로딩 애니메이션을 rough-notation highlight + Caveat 필기체 + thinking-shimmer로 교체한 과정에서 배운 것들.

## 배경

AI 채팅 앱에서 스트리밍 응답 중 표시되는 로딩 인디케이터를 개선하려고 했다. 기존에는 Lottie JSON 기반 웨이브 애니메이션이었는데, 브랜드 아이덴티티가 느껴지는 방식으로 바꾸고 싶었다. SVG stroke 서명 애니메이션 -> rough-notation highlight 순으로 시도했다.

## 핵심 내용

### 1. rough-notation의 highlight 타입 특성

rough-notation `annotate()`의 옵션 중 `highlight` 타입은 다른 타입(`underline`, `box`, `circle`)과 동작이 다르다.

- `strokeWidth`: highlight에는 **무효**. stroke 계열 타입에만 적용됨
- `padding`: highlight에는 **무효**. 대신 annotate 대상 요소 자체에 CSS `padding`을 주면 bounding rect가 커져서 highlight 영역이 확장됨
- `iterations`: 유효. 높일수록 거칠고 진한 느낌
- `color`: 유효. highlight 타입 내부적으로 반투명 처리를 하므로, 색상에 추가 alpha를 넣으면 거의 안 보이게 됨

```tsx
// Bad - highlight에 strokeWidth, padding 무효
annotate(el, { type: "highlight", strokeWidth: 3, padding: 10 });

// Good - 요소 자체에 CSS padding
<span className="px-2 py-1" ref={textRef}>text</span>
annotate(el, { type: "highlight", iterations: 2 });
```

### 2. rough-notation SVG 위치 문제와 해결

rough-notation은 annotation SVG를 **대상 요소의 `parentElement`에 absolute로 append**한다. 이게 핵심이다.

```
<span class="relative">          ← SVG가 여기에 append됨
  <span ref={textRef}>text</span> ← annotate 대상
</span>
```

따라서 annotate 대상을 `relative` 컨테이너 자체가 아닌, 그 **안쪽 자식**으로 지정해야 SVG가 relative 컨테이너 내부에 들어가서 레이아웃 변화를 따라간다.

```tsx
// Bad - SVG가 relative 바깥에 append
<span className="relative" ref={wrapRef}>
  <span>text</span>
</span>
annotate(wrapRef.current, { ... }); // SVG → wrapRef.parentElement (바깥)

// Good - SVG가 relative 안에 append
<span className="relative">
  <span ref={textRef}>text</span>
</span>
annotate(textRef.current, { ... }); // SVG → textRef.parentElement (relative)
```

스트리밍 중 컨텐츠 높이가 변하는 환경(Virtuoso Footer)에서는 이 구조가 필수다. SVG가 relative 안에 있으면 부모가 이동할 때 함께 이동한다.

### 3. 테마별 highlight 색상 대응

CSS 변수로 라이트/다크 모드별 색상을 분리하고, JS에서 `getComputedStyle`로 읽는다.

```css
/* globals.css - 라이트 */
--streaming-highlight: rgb(255, 241, 118);

/* globals.css - 다크 */
--streaming-highlight: rgb(120, 100, 30);
```

```tsx
const color =
  getComputedStyle(el).getPropertyValue("--streaming-highlight").trim() ||
  "rgb(255, 241, 118)";
```

oklch 색상에 alpha를 직접 조작하려면 문자열 파싱이 필요하지만, CSS 변수 + `getComputedStyle`이 가장 깔끔하다.

### 4. next/font/local 경로 규칙

`next/font/local`은 webpack/turbopack 빌드 타임에 경로를 해석하므로 `@/` alias를 쓸 수 없다. 파일 위치 기준 상대경로만 지원.

```tsx
// src/shared/ui/primitives/StreamingAnimation2.tsx → public/fonts/
const caveat = localFont({
  src: "../../../../public/fonts/Caveat-Variable.ttf",
});
```

### 5. 애니메이션 조합 패턴

하나의 요소에 여러 애니메이션을 레이어링할 때:

| 레이어 | 방식 | 역할 |
|--------|------|------|
| 텍스트 shimmer | CSS class (`thinking-shimmer`) | 텍스트에 gradient sweep |
| highlight | JS (rough-notation) | 배경에 hand-drawn 효과 |
| 폰트 | next/font/local (Caveat) | 필기체 느낌 |

R18 Animation Contract 관점에서, CSS shimmer는 globals.css `@keyframes`로, rough-notation은 JS 라이브러리 영역이므로 혼용이 아닌 역할 분리로 볼 수 있다.

## 정리

- rough-notation은 가볍고(~4KB) 임팩트 있는 annotation 라이브러리지만, 동적 레이아웃 환경에서는 SVG append 위치를 이해해야 한다
- `highlight` 타입은 fill 기반이라 `strokeWidth`/`padding` 옵션이 먹히지 않는다는 점이 직관적이지 않았다
- CSS shimmer + JS annotation + 로컬 폰트를 조합하면 추가 번들 부담 없이 인상적인 UI를 만들 수 있다
