---
draft: true
type: "content"
domain: "frontend"
category: "ai-sdk"
topic: "AI SDK v6 multi-step tool calling — maxSteps는 무효, stopWhen 사용 필수"
updatedAt: "2026-03-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ai-sdk"
  - "vercel-ai"
  - "streamText"
  - "stopWhen"
  - "stepCountIs"
  - "multi-step"
  - "tool-calling"
  - "maxSteps"

relatedCategories:
  - "nextjs"
  - "typescript"
  - "llm"
---

# AI SDK v6: maxSteps는 무효 — stopWhen + stepCountIs로 multi-step tool calling 활성화

> AI SDK v6에서 `streamText({ maxSteps: 30 })`는 아무 효과가 없다. 기본값 `stopWhen: stepCountIs(1)`이 적용되어 1 step 후 무조건 중단된다.

## 배경

SpreadJS와 LLM을 연동하여 스프레드시트를 자동 생성하는 파이프라인을 구현했다. LLM이 `rename_sheet`, `set_range`, `set_style`, `set_formula` 등 여러 tool을 순차적으로 호출해야 하는데, `maxSteps: 30`을 설정했음에도 **tool 1개만 호출하고 멈추는 문제**가 발생했다.

서버 로그에서는 `maxSteps=30`이 출력되었지만, LLM은 `rename_sheet` 하나만 호출하고 종료했다.

## 핵심 내용

### maxSteps는 AI SDK v6에서 유효하지 않은 파라미터

```typescript
// BAD — maxSteps는 무시됨, 기본값 stopWhen: stepCountIs(1) 적용
const result = streamText({
  model,
  tools: sheetTools,
  maxSteps: 30,  // ← TypeScript가 잡지 않지만 런타임에서 무시됨
});
```

AI SDK v6의 `streamText()` / `generateText()`의 `CallSettings` 타입에 `maxSteps` 필드가 존재하지 않는다. TypeScript가 이를 잡지 못하는 이유는 spread operator(`...rest`)로 추가 프로퍼티가 허용되기 때문이다.

### 올바른 방법: stopWhen + stepCountIs

```typescript
import { streamText, stepCountIs } from "ai";

// GOOD — 최대 30 step까지 tool calling 루프 허용
const result = streamText({
  model,
  tools: sheetTools,
  stopWhen: stepCountIs(30),
});
```

### 내부 동작 원리

AI SDK v6의 `streamText` 내부 루프:

```
while (toolCalls.length > 0 && !isStopConditionMet(stopConditions, steps)) {
  // 다음 step 실행
}
```

- **기본값**: `stopWhen = stepCountIs(1)` → 1 step 후 즉시 중단
- `stepCountIs(N)`: N번째 step에서 중단
- 각 step = 1회 LLM API 호출 (여러 tool을 병렬 호출 가능)

### 비용 주의

multi-step은 **매 step마다 전체 컨텍스트(시스템 프롬프트 + 이전 메시지 + 이전 tool 결과)를 다시 전송**한다. step이 늘어날수록 누적 토큰이 급격히 증가한다.

```
Step 1: [시스템 2K] + [유저] → tool_result_1
Step 2: [시스템 2K] + [유저] + [result_1] → tool_result_2
Step 3: [시스템 2K] + [유저] + [result_1] + [result_2] → ...
```

예시: Sonnet 4.6으로 75개 tool call → 약 $0.15~$0.30 소비

### tool의 execute 반환값이 다음 step에 영향

```typescript
const ack = async () => ({
  success: true,
  instruction: "나머지 도구도 계속 호출하세요. 멈추지 마세요.",
});
```

이 반환값이 다음 step의 컨텍스트에 tool result로 포함된다. 짧을수록 토큰 절약.

### messageMetadata와 finish-step/finish 이벤트

AI SDK v6에서 `toUIMessageStreamResponse`의 `messageMetadata` 콜백:

- `finish-step` part → 별도 `message-metadata` 청크로 클라이언트에 전달
- `finish` part → **finish 청크 자체의 `messageMetadata` 프로퍼티에 인라인** (별도 청크 아님!)

```typescript
return result.toUIMessageStreamResponse({
  messageMetadata({ part }) {
    if (part.type === "finish-step") {
      // → 별도 message-metadata 청크로 전달
      return { stepUsage: part.usage, finishReason: part.finishReason };
    }
    if (part.type === "finish") {
      // → finish 청크의 messageMetadata 프로퍼티에 인라인
      return { usage: part.totalUsage, modelId: resolvedModelId };
    }
  },
});
```

클라이언트에서 접근:
- `finish-step` 메타: `entry.eventType === "message-metadata"` → `data.messageMetadata.stepUsage`
- `finish` 메타: `entry.eventType === "finish"` → `data.messageMetadata.usage`, `data.messageMetadata.modelId`

## 정리

- **`maxSteps`는 AI SDK v6에서 완전히 무효**. 에러도 경고도 없이 무시된다.
- **`stopWhen: stepCountIs(N)`이 유일한 방법**. `import { stepCountIs } from "ai"` 필요.
- multi-step은 토큰 비용이 기하급수적으로 증가하므로 step 수를 적절히 제한해야 한다.
- `finish-step`과 `finish`의 메타데이터 전달 방식이 다르므로 클라이언트에서 올바르게 접근해야 한다.
