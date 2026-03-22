---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Command Atom 패턴으로 FSD 위젯 간 통신"
updatedAt: "2026-03-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "jotai"
  - "command pattern"
  - "FSD"
  - "widget communication"
  - "loose coupling"
  - "atom"

relatedCategories:
  - "typescript"
  - "architecture"
---

# Command Atom 패턴 — FSD 위젯 간 느슨한 통신

> Widget 레이어에서 직접 import 없이 entities 레이어의 atom을 통해 커맨드를 주고받는 패턴

## 배경

FSD(Feature-Sliced Design) 아키텍처에서 Widget 간 직접 import는 금지다. ThreadSidePanel(스레드 목록)에서 "스레드 전환/생성/삭제/이름변경" 액션을 CoworkPanel(채팅 영역)에 전달해야 했다.

## 핵심 내용

### Command Atom 구조

```ts
// entities/thread/model/thread-atoms.ts
export type ThreadCommand =
  | { type: "switch"; threadId: string }
  | { type: "new" }
  | { type: "delete"; threadId: string }
  | { type: "rename"; threadId: string; newTitle: string }
  | null;

export const threadCommandAtom = atom<ThreadCommand>(null);
```

### 발행 측 (ThreadSidePanel)

```tsx
const setCommand = useSetAtom(threadCommandAtom);

const handleRenameThread = useCallback(
  (threadId: string, newTitle: string) =>
    setCommand({ type: "rename", threadId, newTitle }),
  [setCommand],
);
```

### 소비 측 (CoworkPanel)

```tsx
const [command, setCommand] = useAtom(threadCommandAtom);

useEffect(() => {
  if (!command) return;
  setCommand(null); // 즉시 소비하여 중복 실행 방지
  switch (command.type) {
    case "switch":
      threadManager.switchThread(command.threadId, setMessages, reset);
      break;
    case "rename":
      threadManager.renameThread(command.threadId, command.newTitle);
      break;
    // ...
  }
}, [command]);
```

### FSD 레이어 흐름

```
ThreadSidePanel (widgets)
      │ setCommand({ type: "rename", ... })
      ▼
threadCommandAtom (entities)  ← 중간 레이어
      │ useAtom 구독
      ▼
CoworkPanel (widgets)
      │ threadManager.renameThread()
      ▼
LocalThreadRepository (entities)
```

Widget → entities → Widget 방향으로 통신하므로 FSD 규칙(단방향 의존)을 위반하지 않는다.

### 패턴의 장점

| 장점 | 설명 |
|------|------|
| **느슨한 결합** | 발행자와 소비자가 서로 모름 |
| **FSD 준수** | entities 레이어 atom만 공유 |
| **확장 용이** | 새 커맨드 타입은 union에 추가만 |
| **즉시 소비** | `setCommand(null)`로 중복 방지 |
| **TypeScript 타입 안전** | discriminated union으로 payload 검증 |

### 새 커맨드 추가 체크리스트

1. `ThreadCommand` union에 타입 추가
2. 발행 측에 콜백 추가 (ThreadSidePanel)
3. 소비 측 switch-case에 분기 추가 (CoworkPanel)
4. `useThreadManager`에 실행 함수 추가

## 정리

- Command Atom은 **이벤트 버스의 Jotai 버전** — Widget 간 직접 의존 없이 통신
- discriminated union으로 타입 안전한 커맨드 페이로드
- 소비 후 즉시 null로 초기화하여 이중 실행 방지
- FSD 아키텍처에서 Widget↔Widget 통신의 표준 패턴으로 활용 가능
