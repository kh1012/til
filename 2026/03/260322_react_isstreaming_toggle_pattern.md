---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "isStreaming 상태 전환 감지로 채팅 자동 저장 구현"
updatedAt: "2026-03-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "useEffect"
  - "useRef"
  - "prevRef pattern"
  - "vercel ai sdk"
  - "useChat"
  - "isStreaming"

relatedCategories:
  - "nextjs"
  - "typescript"
---

# useRef + useEffect로 isStreaming 상태 전환 감지하기

> Boolean 상태의 true→false 전환 시점만 포착하여 사이드 이펙트를 실행하는 패턴

## 배경

Vercel AI SDK의 `useChat` 훅에서 `saveCurrentMessages()`와 `generateTitle()`이 구현되어 있었지만 **호출하는 곳이 없었다**. `useChat`에 `onFinish` 콜백이 없는 상황에서, 스트리밍 완료 시점을 정확히 감지하여 메시지를 localStorage에 자동 저장해야 했다.

## 핵심 내용

### prevRef 토글 감지 패턴

```tsx
const prevIsStreamingRef = useRef(false);

useEffect(() => {
  const wasStreaming = prevIsStreamingRef.current;
  prevIsStreamingRef.current = isStreaming;

  // true → false 전환만 포착
  if (wasStreaming && !isStreaming && messages.length > 0) {
    threadManager.saveCurrentMessages(threadId, messages);
  }
}, [isStreaming, messages, threadManager]);
```

### 왜 이 패턴이 필요한가

| 대안 | 문제점 |
|------|--------|
| `useChat({ onFinish })` | 현재 버전에서 미지원 또는 구조상 threadManager 주입 어려움 |
| `useEffect([messages])` | 스트리밍 중에도 매 청크마다 트리거 → 과도한 저장 |
| debounce | 저장 시점 불명확, 완료 전 부분 저장 위험 |
| **prevRef 토글** | 정확한 완료 시점, 1회만 실행, 초기 마운트 안전 |

### 초기 마운트 안전성

`prevIsStreamingRef` 초기값이 `false`이고 `isStreaming`도 초기에 `false` → `false && !false`는 `false` → 초기 마운트 시 실행되지 않음.

### 제목 생성 중복 방지

```tsx
const titleGeneratedForThreadRef = useRef<Set<string>>(new Set());

// 첫 응답 완료 후 1회만
if (!titleGeneratedForThreadRef.current.has(threadId)) {
  titleGeneratedForThreadRef.current.add(threadId);
  threadManager.generateTitle(threadId, userText, assistantText);
}
```

`Set`으로 threadId를 추적하여 같은 스레드에서 generateTitle 재호출 방지. 스레드 전환 시 `resetSideEffects`에서 `Set.clear()` 호출.

## 정리

- **prevRef 패턴**은 Boolean 상태의 에지(edge) 감지에 범용적으로 사용 가능
- `useEffect` 의존성에 `isStreaming`과 `messages`를 넣되, ref로 "이전 값"을 기억하여 전환 방향을 판별
- 초기 마운트 시 잘못된 트리거가 발생하지 않도록 초기값 설계가 중요
- `saveCurrentMessages` 내부에서 `loadThreadList()`를 호출하므로 사이드바가 자동 갱신됨
