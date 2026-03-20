---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Vercel AI SDK useChat id 변경 시 메시지 리셋 문제"
updatedAt: "2026-03-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vercel-ai-sdk"
  - "useChat"
  - "ChatInit"
  - "session-management"
  - "react-hooks"

relatedCategories:
  - "typescript"
  - "nextjs"
  - "state-management"
---

# Vercel AI SDK useChat({ id }) 변경 시 메시지가 사라지는 문제

> `useChat`의 `id` 파라미터가 런타임에 변경되면 내부 Chat 인스턴스가 재생성되어 기존 메시지가 전부 리셋된다.

## 배경

채팅 세션(Thread) 관리 기능을 구현하면서, 세션별 메시지 분리를 위해 `useChat({ id: threadId })`를 사용했다. Vercel AI SDK의 `ChatInit.id`는 conversation session을 추적하는 용도로 설계되어 있어, threadId를 여기에 넘기면 세션별로 독립적인 메시지 상태가 관리될 것으로 기대했다.

## 핵심 내용

### 문제 발생 시나리오

```typescript
// thread atom 초기값이 null
const currentThreadIdAtom = atom<string | null>(null);

// useChat에 id 전달
const currentThreadId = useAtomValue(currentThreadIdAtom);
const chat = useChat({
  id: currentThreadId || undefined,  // 처음엔 undefined
  transport: chatTransport,
});
```

1. 앱 시작 → `currentThreadId = null` → `id = undefined`
2. useChat이 내부적으로 auto-generated ID로 Chat 인스턴스 생성
3. 사용자가 메시지 입력 → 정상 동작
4. Thread 시스템이 `currentThreadId`를 `"thread_abc123"`으로 설정
5. `id: undefined` → `id: "thread_abc123"`으로 변경
6. **useChat이 새 Chat 인스턴스를 생성 → messages = [] (빈 배열!)**
7. UI에서 메시지가 전부 사라짐

### 원인: @ai-sdk/react 내부 동작

```typescript
// node_modules/@ai-sdk/react/src/use-chat.ts (line 102-109)
// id가 변경되면 새 Chat 인스턴스를 생성한다
const chatRef = useRef<Chat<UI_MESSAGE> | null>(null);

if (!chatRef.current || chatRef.current.id !== resolvedId) {
  chatRef.current = new Chat({ id: resolvedId, ... });
  // → 새 인스턴스는 messages: [] 로 시작
}
```

### 해결: 초기값을 즉시 확정

```typescript
// Before: null → 나중에 변경 (id 전환 발생!)
const currentThreadIdAtom = atom<string | null>(null);

// After: 앱 시작 시 즉시 ID 생성 (id 전환 없음)
const initialThreadId = crypto.randomUUID();
const currentThreadIdAtom = atom<string>(initialThreadId);
```

이렇게 하면 `useChat({ id })`에 처음부터 확정된 ID가 전달되므로, `undefined → "xxx"` 전환이 발생하지 않는다.

### 세션 전환 시에는?

세션 전환 시에는 id가 의도적으로 변경되므로 메시지 리셋이 **정상 동작**이다. 전환 직후 `setMessages()`로 새 세션의 이력을 주입하면 된다:

```typescript
async function switchThread(threadId: string) {
  const history = await repo.getHistory(threadId);
  const uiMessages = historyToUIMessages(history);
  // id 변경 → 메시지 리셋 → 즉시 이력 주입
  setCurrentThreadId(threadId);
  setMessages(uiMessages);
}
```

## 정리

- `useChat({ id })`의 id는 **안정적(stable)**이어야 한다. 런타임에 `undefined → string` 전환은 의도치 않은 메시지 손실을 유발한다.
- atom 초기값을 `null`로 두고 "나중에 설정"하는 패턴은 useChat과 궁합이 안 맞는다.
- 세션 관리를 위해 id를 변경할 때는 반드시 `setMessages()`로 후속 복원을 해줘야 한다.
- Vercel AI SDK의 내부 동작을 이해하려면 `node_modules/@ai-sdk/react/src/use-chat.ts`의 Chat 인스턴스 생성 로직을 직접 읽어보는 것이 좋다.
