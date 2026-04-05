---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "BottomSheet 진입 애니메이션 — rAF 2단계 상태 전환 패턴"
updatedAt: "2026-04-05"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "bottom-sheet"
  - "requestAnimationFrame"
  - "css-transition"
  - "enter-animation"
  - "tailwind"
  - "jotai"

relatedCategories:
  - "css"
  - "animation"
  - "typescript"
---

# BottomSheet 진입 애니메이션 — rAF 2단계 상태 전환 패턴

> CSS transition만으로 바텀시트 "아래에서 올라오기 + 컨텐츠 페이드인" 2단계 애니메이션을 구현하는 패턴

## 배경

라이브러리 개편 작업에서 바텀시트를 직접 구현했다. 외부 라이브러리 없이 Tailwind + CSS transition으로 진입 애니메이션을 넣어야 했는데, React의 렌더링 타이밍 문제로 `open=true` → 즉시 최종 높이가 적용되어 transition이 동작하지 않는 문제가 발생했다.

## 핵심 내용

### 문제: CSS transition이 동작하지 않는 이유

```tsx
// 이렇게 하면 transition이 안 된다
if (!open) return null;

return <div className={cn("transition-all duration-300", "h-1/2")} />;
```

React가 `open=true`로 바뀌면 컴포넌트가 마운트되면서 바로 `h-1/2`이 적용된다. 이전 상태(`h-0`)가 없으므로 transition 대상이 없다.

### 해결: rAF로 1프레임 지연

```tsx
const [entered, setEntered] = useState(false);

useEffect(() => {
  if (open) {
    // 다음 프레임에서 entered=true → h-0 → h-1/2 transition 발동
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }
  setEntered(false);
}, [open]);

// 첫 프레임: h-0 (초기 상태)
// 다음 프레임: h-1/2 (transition 발동)
<div className={cn("transition-all duration-300", entered ? "h-1/2" : "h-0")} />
```

핵심은 **마운트 직후 1프레임은 초기 상태(h-0)로 렌더**하고, **다음 프레임에서 목표 상태로 전환**하는 것. 브라우저가 첫 프레임에서 `h-0`을 paint한 뒤 `h-1/2`로 바뀌므로 CSS transition이 정상 동작한다.

### 2단계 애니메이션: 시트 올라온 후 컨텐츠 페이드인

시트가 올라오는 동안(300ms) 컨텐츠는 `opacity-0`, 완료 후 `opacity-1`로 전환:

```tsx
const [contentVisible, setContentVisible] = useState(false);

useEffect(() => {
  if (open) {
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(() => setContentVisible(true), 300); // 시트 transition 시간만큼 딜레이
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }
  setEntered(false);
  setContentVisible(false);
}, [open]);
```

```
0ms   → 시트 h-0, 컨텐츠 opacity-0
~16ms → entered=true: h-0 → h-full (300ms transition)
300ms → contentVisible=true: opacity-0 → opacity-1 (200ms transition)
500ms → 완료
```

### 테스트에서의 주의점

`requestAnimationFrame`은 jsdom에서 비동기로 동작하므로, 동기 테스트에서는 `entered=false` 상태(h-0)만 보인다. `waitFor`로 rAF 완료를 기다려야 한다:

```tsx
it("진입 시 h-0에서 시작하여 snap 높이로 전환된다", async () => {
  render(<BottomSheet open snapPoint="half" .../>);
  const sheet = screen.getByTestId("bottom-sheet-container");
  expect(sheet.className).toContain("h-0"); // 초기 상태
  await waitFor(() => {
    expect(sheet.className).toContain("h-1/2"); // rAF 후 전환
  });
});
```

### backdrop도 동일 패턴

```tsx
<div className={cn(
  "transition-opacity duration-300",
  entered ? "bg-black/40" : "bg-black/0",
)} />
```

시트와 backdrop이 동시에 자연스럽게 전환된다.

## 정리

- CSS transition은 **이전 상태 → 다음 상태** 변화가 있어야 동작한다. 마운트와 동시에 최종 상태를 적용하면 transition이 무시된다.
- `requestAnimationFrame`으로 1프레임 지연하면 **마운트 → paint → 상태 변경** 순서가 보장되어 transition이 발동한다.
- 2단계 애니메이션(시트 올라옴 → 컨텐츠 페이드인)은 `setTimeout`으로 첫 transition duration만큼 딜레이하면 된다.
- framer-motion이나 react-spring 없이도 이 패턴으로 충분히 자연스러운 시트 애니메이션을 구현할 수 있다.
- 테스트에서는 `waitFor`로 rAF 완료를 기다려야 한다.
