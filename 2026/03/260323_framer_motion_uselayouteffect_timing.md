---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Framer Motion 애니메이션과 useLayoutEffect 타이밍 충돌"
updatedAt: "2026-03-23"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "framer-motion"
  - "useLayoutEffect"
  - "getBoundingClientRect"
  - "offsetWidth"
  - "CSS transform"
  - "requestAnimationFrame"

relatedCategories:
  - "css"
  - "javascript"
  - "nextjs"
---

# Framer Motion 애니메이션 안에서 useLayoutEffect 측정이 실패하는 이유

> Framer Motion의 JS 기반 애니메이션은 React 렌더 사이클과 다른 타이밍에 실행되어, useLayoutEffect 시점에 DOM 측정 값이 부정확해진다.

## 배경

SlidingTabs 컴포넌트의 인디케이터(활성 탭 하이라이트 바)가 InteractionPanel 내에서 사용될 때, 실제 텍스트 너비의 **절반 정도**로 렌더링되는 버그를 발견했다. 동일한 SlidingTabs를 사용하는 TabNavigation에서는 정상 동작했다.

차이점은 **부모 컨테이너의 애니메이션 여부**:
- TabNavigation: 고정 너비 헤더 안 (애니메이션 없음)
- InteractionPanel: Framer Motion `motion.aside`(width: 0→auto) + `motion.div`(scale: 0.6→1.0)

## 핵심 내용

### 1. React 렌더 사이클 vs Framer Motion 타이밍

```
React commit → useLayoutEffect 실행 → paint → rAF(Framer Motion 시작)
                    ↑                              ↑
              여기서 측정 (아직 width=0)      여기서야 width 변화 시작
```

- `useLayoutEffect`는 **paint 전**에 동기적으로 실행된다.
- Framer Motion은 **JS 기반 requestAnimationFrame**으로 스타일을 업데이트한다.
- 따라서 useLayoutEffect 실행 시점에 Framer Motion 애니메이션은 아직 **시작되지 않았다**.
- `motion.aside`의 width는 여전히 0, `motion.div`의 scale은 여전히 0.6인 상태에서 측정이 일어난다.

### 2. getBoundingClientRect()와 CSS transform의 이중 적용

```
motion.div (scale: 0.6)
  └─ SlidingTabs container
       ├─ button (layout width: 100px)
       └─ indicator (position: absolute)
```

`getBoundingClientRect()`는 **CSS transform을 반영한 시각적 크기**를 반환한다:

```typescript
// scale: 0.6 상태에서
button.getBoundingClientRect().width  // → 60px (100 × 0.6)

// indicator에 width: 60px 설정
// indicator도 같은 scale 0.6 안에 있으므로
// 시각적 크기 = 60 × 0.6 = 36px  ← 이중 축소!
// button 시각적 크기 = 60px
// → indicator가 button의 약 60% (절반처럼 보임)
```

**해결**: `offsetWidth` / `offsetLeft` 사용 — transform을 무시한 레이아웃 값을 반환한다.

```typescript
// 변경 전 (transform 이중 적용)
const buttonRect = activeButton.getBoundingClientRect();
indicator.style.width = `${buttonRect.width}px`;

// 변경 후 (transform 무시)
indicator.style.width = `${activeButton.offsetWidth}px`;
indicator.style.left = `${activeButton.offsetLeft}px`;
```

indicator와 button이 같은 transform 컨텍스트 안에 있으므로, **레이아웃 기준 동일한 값**을 설정하면 시각적으로도 정확히 일치한다.

### 3. 초기 마운트 시 transition 비활성화

부정확한 초기 측정에 CSS `transition-all`이 적용되면, 잘못된 값에서 올바른 값으로 **슬라이드하는 어색한 애니메이션**이 발생한다.

```typescript
const [transitionEnabled, setTransitionEnabled] = useState(false);

useLayoutEffect(() => {
  syncIndicator(); // 초기 측정 (부정확할 수 있지만 transition 없으므로 눈에 안 띔)
  const raf = requestAnimationFrame(() => {
    setTransitionEnabled(true);  // 다음 프레임부터 transition 활성화
    syncIndicator();             // 정확한 재측정
  });
  return () => cancelAnimationFrame(raf);
}, [syncIndicator, items]);

// indicator에 조건부 transition
style={{ transition: transitionEnabled ? undefined : "none" }}
```

### 4. ResizeObserver rAF 배칭

Framer Motion 애니메이션 중 ResizeObserver 콜백이 **매 프레임** 호출되면 forced reflow가 반복된다.

```typescript
// SpreadSheetView에서 이미 사용 중인 패턴
const rafRef = useRef<number | null>(null);

const ro = new ResizeObserver(() => {
  if (rafRef.current !== null) return; // 이미 대기 중이면 스킵
  rafRef.current = requestAnimationFrame(() => {
    rafRef.current = null;
    syncIndicator(); // 프레임당 1회만 측정
  });
});
```

## 정리

| 측정 API | transform 반영 | 용도 |
|---|---|---|
| `getBoundingClientRect()` | O (시각적 크기) | 화면 좌표 필요 시 |
| `offsetWidth` / `offsetLeft` | X (레이아웃 크기) | 같은 transform 컨텍스트 내 상대 위치 |

**핵심 교훈**:
- Framer Motion 애니메이션 안에서 `getBoundingClientRect()`로 형제/자식 요소를 측정하면 **transform이 이중 적용**된다.
- `useLayoutEffect`는 Framer Motion보다 먼저 실행되므로, 애니메이션 중인 부모의 크기를 정확히 읽을 수 없다.
- 해결 패턴: `offsetWidth` 사용 + 초기 transition 비활성화 + ResizeObserver rAF 배칭.
