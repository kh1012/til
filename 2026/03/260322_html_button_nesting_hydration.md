---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "button 안에 button 중첩 시 hydration 에러"
updatedAt: "2026-03-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "hydration error"
  - "html spec"
  - "button nesting"
  - "PopoverMenu"
  - "role button"
  - "nextjs"

relatedCategories:
  - "react"
  - "accessibility"
---

# HTML button 중첩 금지와 Next.js Hydration 에러

> `<button>` 안에 `<button>`을 넣으면 HTML spec 위반 → Next.js hydration 에러 발생

## 배경

`ListItemButton`(`<button>`) 안에 `PopoverMenu`의 트리거(`<button>`)를 배치했더니 콘솔에 hydration 에러가 발생했다:

```
In HTML, <button> cannot be a descendant of <button>.
This will cause a hydration error.
```

## 핵심 내용

### HTML spec 규칙

HTML5 spec에서 `<button>`의 content model은 "phrasing content, but no interactive content descendant" — 즉 `<button>`, `<a>`, `<input>` 등 인터랙티브 요소를 자식으로 둘 수 없다.

### 왜 hydration 에러인가

- **서버(SSR)**: HTML parser가 중첩 button을 허용하지 않아 DOM 구조를 자동 보정
- **클라이언트(CSR)**: React가 기대하는 DOM 구조와 서버가 보정한 DOM이 불일치
- 결과: hydration mismatch 에러

### 해결: `<div role="button">` 전환

```tsx
// Before — hydration 에러
<button type="button" onClick={toggle}>
  {trigger(isOpen)}
</button>

// After — 안전
<div
  role="button"
  tabIndex={0}
  onClick={toggle}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }}
>
  {trigger(isOpen)}
</div>
```

### 접근성 유지 포인트

| 속성 | 목적 |
|------|------|
| `role="button"` | 스크린 리더에 버튼으로 인식 |
| `tabIndex={0}` | 키보드 포커스 가능 |
| `onKeyDown` (Enter/Space) | 키보드로 활성화 가능 |
| `cursor-pointer` | 시각적 클릭 가능 표시 |

## 정리

- `<button>` 안에 `<button>` 금지는 HTML spec 규칙이며, Next.js SSR 환경에서 hydration 에러로 나타남
- PopoverMenu처럼 다른 인터랙티브 요소 안에 배치될 수 있는 컴포넌트는 트리거를 `<div role="button">`으로 구현해야 안전
- `role="button"` + `tabIndex={0}` + `onKeyDown`으로 접근성 동등하게 유지 가능
