---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "CSS 커스텀 프로퍼티를 JS px 값으로 읽는 React 훅"
updatedAt: "2026-03-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "css-custom-properties"
  - "react-hook"
  - "getComputedStyle"
  - "design-tokens"
  - "framer-motion"

relatedCategories:
  - "css"
  - "typescript"
  - "design-system"
---

# CSS 변수를 JS px 값으로 변환하는 useCssVarPx 훅

> CSS 디자인 토큰(`--layout-padding-x` 등)을 framer-motion 같은 JS 애니메이션 라이브러리에서 px 숫자로 사용해야 할 때, CSS 변수를 런타임에 읽어 px로 변환하는 훅을 만들었다.

## 배경

레이아웃 공통 여백을 CSS 변수(`--layout-padding-x: var(--space-s)`)로 토큰화했는데, InteractionPanel에서 framer-motion의 `animate` prop에 패딩 값을 px 숫자로 넘겨야 하는 상황이 생겼다.

기존에는 `const SPACING_M = 30`으로 하드코딩되어 있어서, CSS 토큰 값을 변경해도 JS 애니메이션 패딩은 따라가지 않는 문제가 있었다.

```tsx
// Before: 하드코딩 — CSS 토큰과 동기화 안 됨
const SPACING_M = 30;

<motion.aside animate={{ paddingRight: SPACING_M }} />
```

## 핵심 내용

### 문제: CSS 변수 값은 문자열이다

`getComputedStyle`으로 CSS 변수를 읽으면 `"clamp(1rem, 0.91rem + 0.45vw, 1.25rem)"` 같은 **문자열**이 반환된다. `parseFloat()`로는 `clamp()` 안의 값을 계산할 수 없다.

### 해결: 임시 DOM 요소로 브라우저에게 계산 위임

```ts
export function useCssVarPx(varName: string, fallback = 0): number {
  const [value, setValue] = useState(fallback);

  useEffect(() => {
    function measure() {
      const raw = getComputedStyle(document.documentElement).getPropertyValue(varName);
      if (!raw) return;
      // 임시 요소의 width에 CSS 값을 그대로 설정 → 브라우저가 px로 계산
      const el = document.createElement("div");
      el.style.position = "absolute";
      el.style.width = raw.trim();
      document.body.appendChild(el);
      setValue(el.getBoundingClientRect().width);
      document.body.removeChild(el);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [varName]);

  return value;
}
```

핵심 트릭은 **임시 `<div>`의 `width`에 CSS 값을 그대로 넣고, `getBoundingClientRect().width`로 브라우저가 계산한 px 값을 읽는 것**이다. `clamp()`, `rem`, `vw` 등 어떤 단위든 브라우저가 알아서 px로 변환해준다.

### 사용 예시

```tsx
export function InteractionPanel() {
  const layoutPadding = useCssVarPx("--layout-padding-x", 16);

  return (
    <motion.aside
      animate={{
        paddingRight: layoutPadding, // CSS 토큰과 자동 동기화
      }}
    />
  );
}
```

### resize 대응

`clamp()`나 `vw` 단위를 사용하는 fluid 토큰은 뷰포트 크기에 따라 값이 달라지므로, `resize` 이벤트에서 재측정한다.

### 주의사항

- **SSR 환경**: `useState(fallback)`으로 초기값을 제공하고, `useEffect`에서만 DOM 접근하므로 SSR 안전
- **성능**: `resize` 마다 DOM 요소 생성/삭제가 발생하지만, 단일 요소의 `getBoundingClientRect`는 매우 가볍다. 필요하면 `throttle` 추가 가능
- **대안**: `parseFloat()` + `rem * fontSize` 조합도 가능하지만, `clamp()`가 포함되면 불가능. 임시 요소 방식이 가장 범용적

## 정리

CSS 디자인 토큰을 "single source of truth"로 유지하면서 JS 애니메이션 라이브러리와 동기화하는 패턴을 만들었다. `getComputedStyle` → `parseFloat`가 안 통하는 `clamp()` 같은 fluid 값도 임시 DOM 요소를 통해 브라우저에게 계산을 위임하면 깔끔하게 해결된다.
