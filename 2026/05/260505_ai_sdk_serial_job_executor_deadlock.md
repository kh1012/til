---
draft: true
type: "content"
domain: "frontend"
category: "ai-sdk"
topic: "AI SDK onToolCall 안에서 addToolOutput을 await하면 SerialJobExecutor 데드락"
updatedAt: "2026-05-05"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ai-sdk"
  - "@ai-sdk/react"
  - "useChat"
  - "onToolCall"
  - "addToolOutput"
  - "SerialJobExecutor"
  - "deadlock"
  - "MCP"

relatedCategories:
  - "react"
  - "nextjs"
  - "rag"
---

# AI SDK `onToolCall` 안에서 `addToolOutput`을 await하면 데드락이 난다

> `@ai-sdk/react`의 `useChat`은 stream chunk 처리와 `addToolOutput`을 같은 `SerialJobExecutor` 큐로 직렬화한다. `onToolCall` 콜백 안에서 `await chat.addToolOutput(...)`을 부르면 "현재 잡이 자기 뒤 잡의 완료를 기다리는" 큐 데드락이 발생한다. 해법은 `void`로 fire-and-forget.

## 배경

자인 RAG 멀티 스텝 프로젝트에서 LLM이 `get_howto_info` 같은 client-side tool을 호출하면 클라이언트가 직접 MCP에 forward하는 흐름을 짰다. 도구 응답은 730ms만에 정상 도착하고 토스트도 success로 떴는데, UI는 계속 "호출 중…"으로 멈췄다.

콘솔 로그가 정확히 한 줄까지만 찍히고 그 다음이 영원히 안 찍혔다.

```
[useChatStream] [diag] before addToolOutput: chat.status=streaming
... (이후 침묵)
```

`after addToolOutput` 로그도, `onError`도, 자동 follow-up 요청도 일어나지 않았다. 단순히 await pending 상태로 영원히 멈춰 있었다.

## 핵심 내용

### 1. SDK 내부 구조 — 동일 큐를 공유

`ai@6.x`의 `AbstractChat`은 stream chunk 처리(`processUIMessageStream`)와 메시지 mutation 류(`addToolOutput`, `addToolApprovalResponse` 등)를 **모두 같은 `SerialJobExecutor` 인스턴스**에 넣는다.

`node_modules/ai/dist/index.mjs:5256-5257` (chunk 처리):

```js
async transform(chunk, controller) {
  await runUpdateMessageJob(async ({ state, write }) => {
    // ...
    case "tool-input-available": {
      // ...
      if (onToolCall && !chunk.providerExecuted) {
        await onToolCall({ toolCall: chunk });   // ← 여기서 사용자 코드 await
      }
    }
  });
}
// runUpdateMessageJob = (job) => this.jobExecutor.run(() => job({...}))
```

`index.mjs:13029-13035` (`addToolOutput`):

```js
this.addToolOutput = async ({...}) => this.jobExecutor.run(async () => {
  // 메시지 part 업데이트 + activeResponse 갱신
});
```

### 2. SerialJobExecutor 동작

`index.mjs:10402-10431`:

```js
class SerialJobExecutor {
  constructor() { this.queue = []; this.isProcessing = false; }
  async processQueue() {
    if (this.isProcessing) return;       // ← 이미 처리 중이면 즉시 return
    this.isProcessing = true;
    while (this.queue.length > 0) {
      await this.queue[0]();
      this.queue.shift();
    }
    this.isProcessing = false;
  }
  async run(job) {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try { await job(); resolve(); } catch (e) { reject(e); }
      });
      void this.processQueue();          // 새 잡 enqueue 후 processQueue 호출
    });
  }
}
```

핵심: `processQueue()`가 **재진입 가드**(`if (this.isProcessing) return;`)를 갖는다. 이미 큐 머리에서 잡이 실행 중이면, 새로 enqueue된 잡은 머리 잡이 끝날 때까지 절대 실행되지 않는다.

### 3. 데드락 시퀀스

1. SDK가 `tool-input-available` chunk를 받아 `runUpdateMessageJob(job1)` 호출 → `jobExecutor.queue = [job1(running)]`, `isProcessing=true`.
2. job1 안에서 `await onToolCall(...)` → 사용자 코드 진입.
3. 사용자 코드가 `await chat.addToolOutput(...)` 호출 → `jobExecutor.run(job2)` → `queue = [job1(running), job2]`, 그리고 `processQueue()` 재호출 → `isProcessing===true`라서 **즉시 return**.
4. `addToolOutput`은 job2 완료 시 resolve되는 Promise를 반환했지만, job2는 큐 머리에서 빠져야(=job1.shift) 실행됨. **하지만 job1은 job2 Promise의 resolve를 기다리는 중**.
5. **상호 무한 대기.** stream 다음 chunk도 처리 안 되고 status는 영원히 `streaming`.

### 4. 해법 — `await` 제거

```ts
// ❌ 데드락
await chat.addToolOutput({
  tool: toolCall.toolName,
  toolCallId: toolCall.toolCallId,
  output,
});

// ✅ 정상 동작
void chat.addToolOutput({
  tool: toolCall.toolName,
  toolCallId: toolCall.toolCallId,
  output,
});
```

`void`로 enqueue만 하고 onToolCall은 즉시 return → job1 종료 → `queue.shift()` → job2 실행 → 다음 chunk 처리 → stream 자연 종료 → `setStatus("ready")` → `makeRequest` 끝부분에서 `shouldSendAutomatically()` 체크 → `lastAssistantMessageIsCompleteWithToolCalls === true`라서 자동 follow-up 발사.

### 5. 왜 이렇게 설계되어 있나

`index.mjs:13046`:

```js
if (this.status !== "streaming" && this.status !== "submitted" && this.sendAutomaticallyWhen) {
  this.shouldSendAutomatically().then(...);   // ← streaming 중에는 발사 안 함
}
```

`addToolOutput`이 즉시 follow-up을 트리거하지 않는 가드가 따로 있다. 즉 SDK는 **streaming 중에 호출된 addToolOutput은 fire-and-forget으로 enqueue되어 stream 자연 종료 후 처리되는 것을 전제**로 설계되어 있다. 사용자가 await을 박는 건 SDK 의도와 맞지 않는다.

### 6. 진단 단서 정리

| 증상 | 원인 |
|---|---|
| 토스트 success는 찍히는데 UI는 "호출 중…" | onToolCall 함수가 도구 호출까지는 끝냈지만 그 뒤 await에서 멈춤 |
| `before addToolOutput` 로그 후 `after`가 안 찍힘 | jobExecutor 큐 데드락 |
| `chat.status === "streaming"` 고정 | stream chunk 처리 잡이 큐에서 못 빠짐 |
| `onError`도 안 찍힘 | throw가 아니라 무한 대기라서 |
| `DebugChatTransport.sendMessages`가 follow-up용으로 다시 호출 안 됨 | 위 원인의 결과 — sendAutomaticallyWhen이 트리거 안 됨 |

## 정리

- "Promise를 받았으니 일단 await을 박자"는 직관이 라이브러리 내부의 **공유 직렬 큐 + 콜백 위치** 조합에서 정확히 데드락을 만들 수 있다.
- API 시그니처가 `Promise<void>`를 반환한다고 해서 항상 await이 안전하지는 않다. 호출 컨텍스트가 같은 Job/Queue 안인지 확인해야 한다.
- 디버깅에서 `before X` / `after X` 로그를 await 양쪽에 붙이는 패턴이 데드락 발견에 결정적이었다. throw 없이 멈추는 케이스는 try/catch만으로는 못 잡는다.
- "fire-and-forget이 안 좋아 보인다"는 일반적 코딩 감각이 SDK 설계 의도와 어긋날 수 있다. AI SDK의 경우 stream 자연 종료 시점에 후처리(`shouldSendAutomatically`)가 일어나도록 의도된 설계라, **`void chat.addToolOutput(...)`이 정답**이었다.

`@ai-sdk/react@3.0.101` + `ai@6.0.99` 환경에서 검증.
