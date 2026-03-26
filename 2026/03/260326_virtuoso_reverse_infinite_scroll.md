---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "react-virtuoso 역방향 무한 스크롤 + IntersectionObserver 기반 일반 무한 스크롤 구현"
updatedAt: "2026-03-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react-virtuoso"
  - "infinite-scroll"
  - "firstItemIndex"
  - "startReached"
  - "IntersectionObserver"
  - "pagination"
  - "prepend"

relatedCategories:
  - "nextjs"
  - "typescript"
  - "performance"
---

# react-virtuoso 역방향 무한 스크롤 + IntersectionObserver 무한 스크롤

> Virtuoso의 `firstItemIndex` + `startReached`로 메시지 prepend 시 스크롤 위치를 유지하는 역방향 무한 스크롤과, IntersectionObserver sentinel 패턴의 일반 무한 스크롤을 함께 구현한 경험 정리.

## 배경

채팅 앱에서 스레드 목록(50개 고정)과 메시지 리스트(100개 고정)가 한번에 전체 데이터를 로드하는 구조였다. 대화가 쌓이면 이전 데이터에 접근할 수 없고, 초기 로딩도 느려지는 문제가 있었다. API는 이미 `skip`/`limit` 파라미터를 지원하고 있었으므로 프론트엔드만 무한 스크롤로 전환하면 되는 상황.

## 핵심 내용

### 1. 두 가지 무한 스크롤 패턴

| | 스레드 목록 (하향) | 메시지 리스트 (역방향) |
|---|---|---|
| **방향** | 아래로 스크롤 → 더 로드 | 위로 스크롤 → 과거 로드 |
| **감지 방식** | IntersectionObserver sentinel | Virtuoso `startReached` 콜백 |
| **데이터 추가** | append (`[...prev, ...new]`) | prepend (`[...old, ...current]`) |
| **스크롤 유지** | 자동 (DOM 아래에 추가) | `firstItemIndex` 감소로 보정 |

### 2. Virtuoso 역방향 무한 스크롤 핵심

```typescript
// 초기값을 충분히 큰 수로 설정
const FIRST_ITEM_INDEX = 100_000;

// prepend 시 firstItemIndex를 감소시키면 Virtuoso가 스크롤 위치를 자동 보정
setMessagesFirstItemIndex(prev => prev - olderMessages.length);

// Virtuoso props
<Virtuoso
  firstItemIndex={firstItemIndex}     // 현재 첫 아이템의 가상 인덱스
  startReached={handleStartReached}   // 최상단 도달 시 콜백
  totalCount={items.length}
/>
```

**핵심 원리**: Virtuoso는 `firstItemIndex`가 감소하면 "위에 아이템이 추가되었다"고 인식하고, 현재 보고 있던 아이템의 스크롤 위치를 유지한다. 초기값을 100,000으로 잡으면 2,000번 × 50개씩 로드해도 여유가 있다.

### 3. 렌더 중 ref 접근 금지 (React strict mode)

처음에는 prepend 감지를 ref로 렌더 중 직접 계산했는데 lint 에러 발생:

```typescript
// ❌ 렌더 중 ref 접근 — react-hooks/refs 에러
if (timelineItems.length > prevLenRef.current) {
  prependedCountRef.current += diff;
}
```

**해결**: `firstItemIndex`를 Jotai atom으로 관리하고, 데이터 로딩 시점(이벤트 핸들러/콜백)에서만 업데이트.

```typescript
// ✅ atom 기반 — loadOlderMessages 콜백 내에서 업데이트
setMessagesFirstItemIndex(prev => prev - olderUiMessages.length);

// 컴포넌트에서는 atom 값만 구독
const firstItemIndex = useAtomValue(messagesFirstItemIndexAtom);
```

### 4. IntersectionObserver sentinel 패턴

스레드 목록은 Virtuoso를 쓰지 않으므로 IntersectionObserver로 sentinel div를 감시:

```typescript
function useIntersectionSentinel(
  onIntersect: () => void,
  rootRef?: RefObject<HTMLElement | null>,
  rootMargin = "100px",
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) onIntersect(); },
      { root: rootRef?.current, rootMargin },
    );
    observer.observe(sentinelRef.current!);
    return () => observer.disconnect();
  }, [onIntersect, rootRef, rootMargin]);
  return sentinelRef;
}
```

`rootMargin: "100px"`로 바닥 100px 전에 미리 로딩을 시작해서 끊김 없는 UX.

### 5. Repository 페이지네이션 설계

`PaginatedResult<T>` 타입을 도입해서 모든 Repository 메서드가 `hasMore`를 반환:

```typescript
type PaginatedResult<T> = { items: T[]; hasMore: boolean };
// hasMore = items.length >= limit (서버가 total을 안 줄 때 휴리스틱)
```

Backend/Local/Composite 3중 레포지토리 구조에서 인터페이스만 변경하니 모든 구현이 일관되게 따라옴.

### 6. 150줄 제한과 훅 분리

`useThreadManager`가 265줄로 팽창 → `useThreadPagination` 훅으로 페이지네이션 전용 로직 분리. `ThreadListContent`도 161줄 초과 → `useIntersectionSentinel` 범용 훅으로 분리. 결과적으로 재사용 가능한 두 개의 훅이 탄생.

## 정리

- Virtuoso의 `firstItemIndex` + `startReached`는 채팅 역방향 무한 스크롤의 정석 패턴. 초기값을 충분히 크게 잡고, prepend 시 감소시키면 스크롤 위치가 자동으로 유지된다.
- React strict mode에서 렌더 중 ref 접근은 금지. 상태 관리가 필요하면 atom이나 state로 올리는 게 맞다.
- `PaginatedResult<T>` 같은 범용 타입을 인터페이스 레벨에서 도입하면 Backend/Local 구현이 깔끔하게 따라온다.
- 150줄 제한은 자연스러운 훅 분리의 트리거가 된다 — 결과적으로 `useIntersectionSentinel`처럼 범용 유틸이 만들어진다.
