---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "CSS mask-composite로 회전 보더 스피너 구현"
updatedAt: "2026-04-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "mask-composite"
  - "conic-gradient"
  - "border animation"
  - "css spinner"
  - "webkit-mask-composite"

relatedCategories:
  - "animation"
  - "tailwindcss"
  - "design-system"
---

# CSS mask-composite로 회전 보더 스피너 구현

> conic-gradient + mask-composite: exclude로 border 영역만 보이는 회전 스피너를 만드는 기법

## 배경

Chip 컴포넌트에 "현재 인터랙션 패널과 연결됨"을 시각적으로 표현하기 위해, 보더가 가속도를 가지고 한 바퀴씩 회전하는 데코레이터가 필요했다. 처음에는 `::before`를 `inset: -2px`로 바깥에 배치하고 `overflow: hidden`으로 잘라냈으나, children까지 잘리거나 percentage 기반 inset이 예측 불가능한 문제가 있었다.

## 핵심 내용

### 실패한 접근: overflow + inset 음수값

```css
.spinner-border::before {
  position: absolute;
  inset: calc(-50%);  /* percentage → 요소 크기에 따라 예측 불가 */
  background: conic-gradient(...);
}
.spinner-border {
  overflow: hidden;  /* children도 같이 잘림 */
}
```

문제점:
- `inset: calc(-50%)`는 요소 크기에 따라 값이 달라짐
- `overflow: hidden`을 wrapper에 걸면 children의 tooltip, dropdown 등도 잘림
- `::after`로 배경을 덮어씌우는 방식은 배경색이 투명한 경우 동작하지 않음

### 성공한 접근: mask-composite

```css
.spinner-border {
  position: relative;
  padding: var(--sb-width);        /* border 두께만큼 공간 확보 */
  border-radius: var(--sb-radius);
}

.spinner-border::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: var(--sb-radius);
  padding: var(--sb-width);        /* content-box와 border-box 차이 = border 영역 */
  background: conic-gradient(
    from 0deg,
    transparent 0%,
    transparent 40%,
    var(--sb-color) 70%,
    transparent 100%
  );
  /* 핵심: content-box 마스크와 border-box 마스크를 XOR → padding 영역만 보임 */
  mask: linear-gradient(#fff 0 0) content-box,
        linear-gradient(#fff 0 0);
  mask-composite: exclude;
  -webkit-mask: linear-gradient(#fff 0 0) content-box,
               linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  animation: spinner-border-rotate 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
}
```

### mask-composite 원리

1. `mask: linear-gradient(#fff 0 0) content-box` — content 영역을 마스크 (padding 제외)
2. `mask: linear-gradient(#fff 0 0)` — 전체 border-box를 마스크 (기본값)
3. `mask-composite: exclude` — 두 마스크의 차집합 = **padding 영역만 보임**
4. padding = border 두께이므로, conic-gradient가 border 고리 형태로만 렌더링됨

### 가속도 있는 회전

```css
@keyframes spinner-border-rotate {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

animation: spinner-border-rotate 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
```

`cubic-bezier(0.4, 0, 0.2, 1)` — Material Design의 standard easing. 시작 시 느리게, 중간에 빠르게, 끝에서 다시 느려지는 자연스러운 가속도.

### React 컴포넌트화

```tsx
export function SpinnerBorder({ children, color, borderWidth, className }: SpinnerBorderProps) {
  const style: CSSProperties = {};
  if (color) style["--sb-color" as string] = color;
  if (borderWidth) style["--sb-width" as string] = `${borderWidth}px`;

  return (
    <div className={cn("spinner-border", className)} style={style}>
      {children}
    </div>
  );
}

// 사용
<Chip spinBorder={panelOpen} />
<Button spinBorder spinBorderColor="var(--success)" />
```

CSS 변수(`--sb-color`, `--sb-width`)를 통해 런타임에 색상/두께를 제어. 기본값은 CSS에서 정의하고, props가 있을 때만 inline style로 오버라이드.

## 정리

- `mask-composite: exclude`는 "두 영역의 차집합"을 구하는 CSS 마스킹 기법
- padding을 border 두께로 활용하면 별도의 clip-path나 overflow 없이 border 영역만 노출 가능
- `overflow: hidden` 접근은 children에 부작용이 있으므로 mask 기반이 더 안전
- `-webkit-mask-composite: xor`은 Safari/Chrome용 필수 폴백 (표준은 `exclude`)
- CSS 변수 + React props 조합으로 디자인 시스템에서 재사용 가능한 데코레이터 패턴 완성
