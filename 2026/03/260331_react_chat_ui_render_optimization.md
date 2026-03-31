---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "채팅 UI 리렌더 최적화 — Jotai selectAtom, Virtuoso, memo 체인 디버깅"
updatedAt: "2026-03-31"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react-virtuoso"
  - "jotai-selectAtom"
  - "memo"
  - "useCallback-stabilization"
  - "IntersectionObserver"
  - "next-js-ts71007"

relatedCategories:
  - "nextjs"
  - "jotai"
  - "performance"
---

# 채팅 UI 리렌더 최적화 — 원인 추적부터 해결까지

> ThreadItem 클릭 한 번에 30개 아이템이 전부 리렌더되는 문제를 디버깅하고, Jotai selectAtom + memo 체인 안정화 + Virtuoso 튜닝으로 해결한 과정

## 배경

채팅 사이드바에서 ThreadItem을 클릭하면 ThreadList 전체가 리렌더되는 현상 발견. 30개 아이템이 매번 새로 그려지면서 UI가 느려지는 문제.

## 핵심 내용

### 1. 리렌더 원인 체인 추적

디버깅 로그를 3단계로 추가하여 원인 체인을 역추적:

```
ThreadItem CLICK → router.push(/chat/${id})
  → ChatPanel 재마운트 → loadThreadList() 중복 호출
  → threadListLoadingAtom: false→true→false
  → setThreadList(items) ← API에서 새 배열 → 모든 thread 객체 참조 변경
  → ThreadListContent 리렌더 → .map()에서 새 thread 참조 전달
  → memo 비교 실패 (thread 참조 ≠) → 30개 전부 리렌더
```

**핵심:** `memo`가 있어도 상위에서 객체 참조가 바뀌면 무력화된다.

### 2. Jotai selectAtom으로 per-item 구독

`ThreadListContent`가 `currentThreadIdAtom`을 구독하면 → 전체 리렌더. 대신 각 `ThreadItem`이 자신의 active 상태만 구독:

```tsx
const isActiveAtom = useMemo(
  () => selectAtom(currentThreadIdAtom, (id) => id === thread.id),
  [thread.id],
);
const isActive = useAtomValue(isActiveAtom);
```

`selectAtom`은 selector 결과(boolean)가 바뀔 때만 re-render 트리거. 30개 중 2개(이전 active + 새 active)만 리렌더.

### 3. memo 체인 안정화

`memo`가 동작하려면 모든 prop이 참조 안정적이어야 함:

| prop | 안정화 방법 |
|------|-----------|
| `thread` 객체 | 상위에서 불필요한 `loadThreadList()` 제거 → 배열 참조 유지 |
| `onSelect` 콜백 | `useCallback` with stable deps |
| `onDelete` 콜백 | `useState` setter (자동 안정) |

### 4. hidden vs invisible — 컴포넌트 유지

`MessageInput`이 loading 중 언마운트/리마운트되는 문제:

- `hidden` (display: none) → 언마운트와 동일 효과, `scrollHeight` 계산 불가
- `invisible h-0 overflow-hidden` → DOM에 유지, `autoResize` 정상 동작

### 5. Virtuoso alignToBottom의 함정

`alignToBottom` prop은 채팅 하단 정렬용이지만, 내부적으로 `margin-top: auto`를 적용해서 메시지가 적을 때 위에 큰 빈 공간이 생김. `initialTopMostItemIndex`로 대체.

### 6. IntersectionObserver sentinel 패턴

scroll 이벤트 리스너 대신 `h-0` sentinel div + IntersectionObserver:

```tsx
const observer = new IntersectionObserver(
  ([entry]) => setListScrolled(!entry.isIntersecting),
  { threshold: 0 },
);
observer.observe(sentinel);
```

sentinel이 뷰포트에서 사라지면 border 표시. scroll 이벤트보다 성능 우수.

### 7. Next.js TS71007 — 콜백 prop Action 접미사

`dynamic()` import 컴포넌트의 함수 prop은 `Action` 접미사 필요:

```tsx
// Bad — TS71007
onAddFolder?: () => void;

// Good
onAddFolderAction?: () => void;
```

Next.js App Router가 Server Action인지 구분하기 위한 네이밍 컨벤션.

### 8. Loading overlay fade-out 패턴

조건부 렌더링 대신 overlay로 전환 효과:

```tsx
const [showOverlay, setShowOverlay] = useState(false);
if (isLoadingThread && !showOverlay) setShowOverlay(true);

// overlay: opacity transition → onTransitionEnd에서 제거
```

콘텐츠는 overlay 뒤에서 정상 렌더 → 언마운트/리마운트 방지.

## 정리

- **디버깅 순서**: console.log(RENDER/MOUNT/UNMOUNT) → 원인 체인 역추적 → 한 단계씩 해결
- **memo는 필요조건이지 충분조건이 아님** — 상위에서 참조가 바뀌면 무력화
- **selectAtom**은 리스트 아이템의 개별 구독에 최적
- **hidden보다 invisible** — DOM 유지가 필요한 컴포넌트에 적합
- **Virtuoso alignToBottom은 부작용 있음** — margin-top: auto 주의
- **overlay 패턴**으로 loading 전환 시 언마운트 방지 + 자연스러운 UX
