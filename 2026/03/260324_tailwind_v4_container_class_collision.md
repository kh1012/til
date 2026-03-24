---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "Tailwind v4 .container 클래스와 서드파티 라이브러리 충돌"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "tailwind-v4"
  - "container"
  - "max-width"
  - "spreadjs"
  - "class-collision"

relatedCategories:
  - "tailwindcss"
  - "spreadjs"
---

# Tailwind v4 `.container` 클래스가 서드파티 라이브러리와 충돌하는 문제

> Tailwind v4의 `.container` 유틸리티가 SpreadJS의 `.container` 클래스에 `max-width: 1536px`을 적용하여 가로폭이 잘리는 버그

## 배경

SpreadJS 인터랙션 패널에서 시트가 부모 컨테이너(1809px)를 채우지 못하고 1536px에서 잘리는 현상이 발생했다. `hostStyle: { width: "100%", height: "100%" }`를 설정했고, 부모 `absolute inset-0` div도 정상 크기였다.

ResizeObserver 타이밍 문제, SpreadJS 캔버스 캐싱 문제 등을 의심하고 여러 번 수정했지만 해결되지 않았다.

## 핵심 내용

### 원인 추적

브라우저 콘솔에서 parent chain의 실제 크기를 출력:

```js
let el = document.querySelectorAll('canvas')[0];
for (let i = 0; i < 10; i++) {
  if (!el) break;
  const r = el.getBoundingClientRect();
  console.log(i, el.tagName, Math.round(r.width), el.style?.cssText?.slice(0, 80));
  el = el.parentElement;
}
```

결과에서 SpreadJS host div(`div.gc-no-user-select`)의 **computed max-width가 1536px**인 것을 발견:

```
inline: width: 1808px  (올바름)
computed: width: 1536px, maxWidth: 1536px  (잘림!)
```

### 1536px의 정체

Tailwind v4에서 `@import "tailwindcss"`를 선언하면 `.container` 클래스에 **반응형 `max-width` breakpoint가 자동 적용**된다:

| Breakpoint | max-width |
|------------|-----------|
| sm (640px) | 640px |
| md (768px) | 768px |
| lg (1024px) | 1024px |
| xl (1280px) | 1280px |
| **2xl (1536px)** | **1536px** |

SpreadJS React 래퍼가 내부적으로 생성하는 host div의 클래스가 `container gc-no-user-select`이다. 이 `container`가 Tailwind의 `.container` 유틸리티 선택자에 매칭되어 `max-width: 1536px`이 적용된 것.

### 해결

```css
/* globals.css */
.gc-no-user-select.container {
  max-width: none;
}
```

한 줄로 해결. SpreadJS의 `.container`에만 한정하여 Tailwind의 max-width를 무효화한다.

### 잘못된 접근들

이 문제를 발견하기까지 시도했던 오답들:

1. **ResizeObserver debounce 조정** — 애니메이션 타이밍 문제라 생각
2. **hostStyle을 px 값으로 동적 전달** — useState + ResizeObserver로 실시간 크기 계산
3. **workbookInitialized에서 refresh 호출** — 초기화 시점 문제라 판단
4. **후행 타이머 refresh** — 350ms 뒤에 한 번 더 refresh

모두 CSS max-width가 근본 원인이므로 효과 없었다.

## 정리

- **서드파티 라이브러리가 `.container` 같은 일반적인 클래스명을 사용하면 Tailwind v4와 충돌할 수 있다** — Tailwind v4는 `@import "tailwindcss"`만으로 `.container`에 스타일이 적용됨
- **inline style과 computed style의 차이를 먼저 확인하자** — inline width가 올바른데 computed가 다르면 외부 CSS 규칙이 override하고 있는 것
- **`getComputedStyle(el).maxWidth`를 확인하는 습관** — width만 보면 max-width 제한을 놓침
- 복잡한 JS 솔루션 전에 **DevTools Computed 탭에서 CSS cascade를 먼저 점검**하자
