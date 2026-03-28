---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "Tailwind v4 group-hover/group-active 패턴으로 부모-자식 상태 전환"
updatedAt: "2026-03-28"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "tailwind"
  - "group-hover"
  - "group-active"
  - "css variables"
  - "design tokens"

relatedCategories:
  - "tailwind"
  - "react"
  - "design-system"
---

# Tailwind v4 group-hover/group-active 패턴

> 부모 요소의 hover/active 상태에 따라 자식 요소 스타일을 전환하는 Tailwind 패턴 정리

## 배경

사이드바 버튼 컴포넌트에서 hover 시 아이콘과 라벨 텍스트 색상을 동시에 변경해야 했다. 자식 `<span>`에 `hover:text-foreground`를 직접 걸면, 텍스트 위에 정확히 커서가 올라가야만 작동해서 체감상 동작하지 않는 것처럼 보였다.

## 핵심 내용

### 1. hover:가 안 먹는 이유

```tsx
// 문제: <p>에 직접 hover를 걸면 텍스트 영역에서만 반응
<p className="text-muted-foreground/80 hover:text-foreground">
  {title}
</p>
```

부모 `ListItemButton` 전체 영역이 클릭 대상인데, 자식 `<p>`의 hover 영역은 텍스트만 커버한다. 사용자는 버튼 전체에 마우스를 올렸을 때 색상이 바뀌길 기대한다.

### 2. group + group-hover 패턴

```tsx
// 부모에 group 클래스 추가
<button className="group hover:bg-ground-hover">
  {/* 자식에서 group-hover로 반응 */}
  <span className="text-muted-foreground group-hover:text-foreground">
    {icon}
  </span>
  <span className="text-muted-foreground/80 group-hover:text-foreground">
    {label}
  </span>
</button>
```

- 부모에 `group` 추가
- 자식에서 `group-hover:` prefix 사용
- 부모 영역 어디든 hover하면 모든 자식이 동시 전환

### 3. group-active로 클릭 피드백

```tsx
<span className={cn(
  "text-muted-foreground/80",
  "group-hover:text-foreground",
  "group-active:text-muted-foreground/80",  // 클릭 시 살짝 어두워짐
)}>
```

hover(-5deg) -> active(+5deg)처럼 큰 변화가 있을 때, `duration-fast`(150ms)로는 확확 바뀌는 느낌이 든다. `duration-normal`(300ms) + `ease-claude`(cubic-bezier 스프링)를 조합하면 자연스러워진다.

```tsx
// 아이콘 tilt + scale 애니메이션
"transition-transform duration-(--duration-normal) ease-(--ease-claude)"
"group-hover:-rotate-5 group-hover:scale-110"
"group-active:rotate-5 group-active:scale-100"
```

### 4. Tailwind v4 CSS 변수 참조 문법

```
// 잘못된 형식
py-space-2xs     // Tailwind가 인식 못함

// 올바른 형식
py-2xs           // --spacing-2xs가 @theme에 등록된 경우
py-(--space-2xs) // CSS 변수 직접 참조
```

### 5. 디자인 토큰 전환 (하드코딩 -> CSS 변수)

```css
/* Before: 라이트/다크 각각 하드코딩 */
.toast { background: oklch(0.99 0.002 250 / 0.72) !important; }
:where(.dark) .toast { background: oklch(0.20 0.01 250 / 0.65) !important; }

/* After: CSS 변수 한 줄로 양 테마 대응 */
.toast {
  background: var(--surface-floating) !important;
  border: 1px solid var(--surface-floating-border) !important;
  color: var(--surface-floating-foreground) !important;
  box-shadow: var(--shadow-surface-floating) !important;
}
```

다크모드 오버라이드 블록 자체가 불필요해진다.

## 정리

- 자식 요소의 `hover:`가 안 먹으면 부모에 `group` + 자식에 `group-hover:` 패턴을 먼저 의심
- hover -> active 전환이 부자연스러우면 duration을 늘리고 ease를 스프링 커브로 변경
- Tailwind v4에서 커스텀 spacing은 `--spacing-*`로 @theme에 등록해야 `py-2xs` 형태로 사용 가능
- 하드코딩 색상값은 CSS 변수로 전환하면 다크모드 코드가 절반으로 줄어듦
