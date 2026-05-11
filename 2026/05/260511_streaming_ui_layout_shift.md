---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "스트리밍 UI에서 LayoutShift 회피 — fade-only + scrollbar-gutter + atom 기반 elapsed"
updatedAt: "2026-05-11"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "LayoutShift"
  - "fade-in animation"
  - "scrollbar-gutter"
  - "ResizeObserver"
  - "Jotai atom"
  - "React.memo"
  - "streaming UI"

relatedCategories:
  - "css"
  - "performance"
  - "ux"
---

# 스트리밍 UI에서 LayoutShift 회피 — fade-only + scrollbar-gutter + atom 기반 elapsed

> LLM 스트리밍 응답을 시각화하는 "분석 사이클 카드"를 만들면서 부딪힌 4가지 함정과 그 해결 패턴 — translateY 누적, 스크롤바 진동, elapsed 끊김, 부모 갱신 리렌더 일렁임.

## 배경

GPT/Claude 같은 LLM 응답은 일반 텍스트가 아니라 reasoning → tool 호출 → 결과 → 본문 답변이 *시간차로 도착*한다. 이걸 단순히 카드들로 나열하면 새 자식이 등장할 때마다 화면이 튄다. 분석 사이클을 "임베디드 타임라인" 형태로 묶고 매끄럽게 etended thinking 과정을 보여주는 컴포넌트를 만들면서 LayoutShift 4가지 원인을 발견했다.

## 핵심 내용

### 1. translateY 누적이 만든 "밀리는 느낌"

흔히 쓰는 fade-in 키프레임:

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

문제는 *부모 wrapper + 자식 wrapper + 내부 컴포넌트*가 동시에 같은 애니메이션을 가지면 16px이 3중 누적된다. 한 영역에 자식이 등장할 때마다 위로 끌어올려지는 시각 효과가 LayoutShift처럼 보인다.

해결 — `translateY` 없는 순수 opacity 키프레임으로 분리:

```css
@keyframes fade-only {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.animate-fade-only {
  animation: fade-only var(--duration-normal) ease-out;
  will-change: opacity;
}
```

스트리밍처럼 *연속 mount*가 일어나는 영역에서는 `fade-only`만 쓰는 게 안전하다. 진짜 "한 번 등장하는 큰 카드"에만 `fade-in-up`을 남긴다.

### 2. 스크롤바 진동 — `scrollbar-gutter: stable`

자체 스크롤 컨테이너(`overflow-y-auto` + `max-h`)에 자식이 누적되다 어느 순간 max-h를 넘으면 스크롤바가 *갑자기* 등장한다. 콘텐츠 영역의 너비가 ~12px 줄어들면서 줄바꿈/말줄임이 재계산되고, 사용자에게는 "옆으로 한 번 밀리는" LayoutShift로 보인다.

```tsx
<div
  className="overflow-y-auto custom-scrollbar"
  style={{
    maxHeight: "var(--thinking-cycle-max-h)",
    scrollbarGutter: "stable",  // ← 항상 우측에 스크롤바 자리 확보
  }}
>
```

`scrollbar-gutter: stable`은 콘텐츠 height와 무관하게 *항상* 스크롤바 자리를 비워둔다. 진동이 사라진다. macOS overlay scrollbar 환경에서도 안전.

### 3. atom 기반 startedAt — unmount/remount에 견디는 elapsed

`performance.now()`를 `useRef`에 보관하는 mount 기반 elapsed는 컴포넌트가 unmount되면 0으로 리셋된다. 부모 컴포넌트의 조건부 렌더링(`hasSteps ? <A/> : <B/>`)이나 React key 변경으로 *컴포넌트가 잠시 사라졌다가 다시 나타나는* 케이스에서 elapsed가 계속 끊긴다.

해결 — `startedAt` 자체를 atom에 영구 저장:

```ts
// cycle-timing-atoms.ts
type CycleTiming = { startedAt: number; durationMs?: number };
type CycleTimingMap = Record<string, CycleTiming>;
export function cycleTimingFamily(messageId: string): PrimitiveAtom<CycleTimingMap> { ... }
```

```ts
// useCycleElapsed
const timing = useAtomValue(selected);
useEffect(() => {
  if (!timing) setMap(prev => ({ ...prev, [key]: { startedAt: Date.now() } }));
}, [timing]);
const elapsed = timing?.durationMs ?? (now - timing.startedAt);
```

컴포넌트는 사라져도 atom의 `startedAt`은 살아남는다. 다시 mount되면 `Date.now() - startedAt`으로 정확한 누적 시간을 그대로 계산할 수 있다. **컴포넌트 lifecycle과 elapsed 측정을 분리**하는 게 핵심.

추가로 freeze 시점을 `isFinal && allDone`이 1.5초 안정화된 뒤로 잡으면, 도구 호출 사이의 짧은 갭에 timer가 멈췄다 흘렀다 반복하는 깜빡임도 사라진다.

### 4. React.memo + 커스텀 props 비교 — 부모 갱신 일렁임 차단

Vercel AI SDK의 `message.parts`는 토큰마다 새 배열 참조를 만든다. 부모(`AssistantTextBlock`)가 매번 리렌더되면 자식 카드도 *내용이 같은데도* 자동 리렌더된다. 새 자식이 추가될 때 시각적 일렁임의 진짜 원인이 이 부분이다.

```tsx
export const ReasoningCycleSection = memo(
  ReasoningCycleSectionImpl,
  (prev, next) =>
    prev.messageId === next.messageId &&
    prev.groupKey === next.groupKey &&
    prev.isFinal === next.isFinal &&
    itemsEqual(prev.items, next.items),  // 내용 기반 비교
);
```

`itemsEqual`은 도구 목록의 `key + state + phase` 같은 *내용 fingerprint*만 본다. tool input/output 갱신은 자식 컴포넌트(`ToolCallGroup` 등)가 자체 memo로 처리하므로 부모 비교는 가볍게 둔다. **memo 비교 깊이는 "내가 시각적으로 무엇을 그리는가"만큼만**.

### 5. (보너스) auto-pin to bottom with RAF coalescing

스크롤 컨테이너가 바닥 근처에 있을 때만 새 콘텐츠 도착 시 자동으로 끝까지 스크롤하는 follow UX. `ResizeObserver`로 콘텐츠 wrapper의 height 변화를 감지하고, RAF로 묶어 1프레임 1회만 적용한다.

```ts
const atBottomRef = useRef(true);
useEffect(() => {
  scroll.addEventListener("scroll", () => {
    const remaining = scroll.scrollHeight - scroll.scrollTop - scroll.clientHeight;
    atBottomRef.current = remaining < 32;
  });
}, []);

useEffect(() => {
  const ro = new ResizeObserver(() => {
    if (!atBottomRef.current) return;
    requestAnimationFrame(() => { scroll.scrollTop = scroll.scrollHeight; });
  });
  ro.observe(inner);
}, []);
```

스크롤 컨테이너 자체는 max-height로 고정이라 ResizeObserver가 변화를 감지 못한다. *자식 wrapper*를 관찰해야 한다는 게 사소하지만 자주 빠뜨리는 포인트.

## 정리

- "fade-in"이라는 한 단어 안에 *translateY 동반*과 *순수 opacity* 두 가지가 섞여 있다. 스트리밍 영역엔 후자만.
- 자체 스크롤 컨테이너엔 `scrollbar-gutter: stable`이 거의 항상 정답.
- 시간 측정 같은 *지속 상태*는 컴포넌트가 아니라 atom에 보관해야 lifecycle 변동에 견딘다.
- `React.memo`의 효과는 *커스텀 비교 함수*가 좌우한다. 기본 shallow는 새 객체 참조 한 번에 무너진다.
- LayoutShift는 보통 한 가지 원인이 아니다. 여러 작은 변동의 합이라 *디버그 배경색을 영역별로 다르게* 입혀보면 어떤 층이 움직이는지 즉시 보인다.
