---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Thread 생성 시 clientMode 무시하고 localStorage로 빠지는 버그"
updatedAt: "2026-04-07"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "composite-repository"
  - "source-tagging"
  - "eager-creation"
  - "clientMode"
  - "localStorage"

relatedCategories:
  - "architecture"
  - "state-management"
---

# Thread 생성 시 clientMode 무시하고 localStorage fallback으로 빠지는 버그

> Composite Repository 패턴에서 eager creation의 source 태깅이 모드 분기를 반영하지 않으면, UI와 저장소 양쪽에서 잘못된 상태가 전파된다.

## 배경

`/chat/new`에서 프롬프트를 보내면 사이드바에 Thread가 생성되는데, Core 백엔드가 정상 가동 중임에도 CloudOff(로컬 전용) 아이콘이 표시되고 localStorage에만 저장되는 현상이 발생했다. 새로고침하면 서버에서 정상 로드되지만, 최초 생성 시점의 동작이 잘못되어 있었다.

## 핵심 내용

### 문제의 흐름

```
메시지 전송
  → submitWithEagerThread()
    → ensureThreadInList()
      → source: "localStorage" (항상 하드코딩)
    → 사이드바에 CloudOff 아이콘 표시
  → API 요청 (Core tier로 정상 전송)
  → 스트리밍 완료
    → saveMessages()
      → upsertThreadSummary()
        → source: "localStorage" (기존 source 덮어씀)
```

### 3가지 원인

**1. `ensureThreadInList()`의 source 하드코딩**

```typescript
// Before
source: "localStorage" as const,

// After — clientMode에 따라 분기
source: clientMode ? "localStorage" : "backend",
```

`ensureThreadInList`은 "eager creation" — 메시지 전송 전에 사이드바에 thread를 미리 보여주는 역할이다. 이 시점에 source를 결정하므로, 현재 모드를 반영해야 한다.

**2. `upsertThreadSummary()`의 source 강제 덮어쓰기**

```typescript
// Before — 기존 thread의 source를 무조건 "localStorage"로 변경
threads[existingIndex] = {
  ...threads[existingIndex],
  source: "localStorage",  // 문제
};

// After — 기존 source 유지 (spread로 보존)
threads[existingIndex] = {
  ...threads[existingIndex],
  updatedAt: now,
  messageCount: messages.length,
  firstMessage: firstMessage ?? threads[existingIndex].firstMessage,
  // source 제거 — 기존 값 유지
};
```

이 함수는 `saveMessages()` → `LocalThreadRepository` 경로에서 호출된다. localStorage는 캐시 역할이므로, 메시지 저장 시 source를 변경할 이유가 없다.

**3. `CompositeThreadRepository`에 `persistSummary` 미구현**

```typescript
// 추가
persistSummary(summary: ThreadSummary): void {
  this.local.persistSummary(summary);
}
```

`repo.persistSummary?.(summary)` 호출이 optional chaining으로 무시되고 있었다. Composite에서 local로 위임하면 eager creation 시 올바른 source로 localStorage에도 persist된다.

### Composite Repository 패턴의 교훈

```
CompositeThreadRepository
  ├─ BackendThreadRepository  (서버 통신)
  ├─ LocalThreadRepository    (localStorage 캐시)
  └─ clientMode flag          (분기 기준)
```

- **읽기**: clientMode면 local, 아니면 backend (실패 시 local fallback)
- **쓰기**: 항상 local에 캐시 (backend는 Agent가 직접 저장)
- **source 태깅**: 쓰기 시점이 아니라 **생성 시점**에 결정되어야 함

## 정리

- Eager creation 패턴(UX를 위해 서버 응답 전에 미리 UI 반영)에서는 **생성 시점의 context(모드, 환경)를 정확히 태깅**해야 한다
- 캐시 레이어(`saveMessages` → localStorage)가 원본 메타데이터(source)를 덮어쓰면 안 된다 — 캐시는 데이터를 저장하되 출처 정보는 보존해야 함
- Optional method(`persistSummary?`)는 Composite에서 위임을 빠뜨리기 쉬우므로, interface에 optional로 선언했더라도 Composite 구현 시 명시적으로 포함할 것
