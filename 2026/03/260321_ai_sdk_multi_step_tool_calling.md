---
draft: true
type: "content"
domain: "frontend"
category: "ai-sdk"
topic: "AI SDK streamText multi-step tool calling 디버깅"
updatedAt: "2026-03-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ai-sdk"
  - "streamText"
  - "maxSteps"
  - "tool-calling"
  - "spreadjs"
  - "system-prompt"
  - "anthropic"

relatedCategories:
  - "nextjs"
  - "react"
  - "spreadjs"
---

# AI SDK streamText multi-step tool calling 디버깅

> AI SDK의 `streamText`에서 `maxSteps`를 설정해도 모델이 도구를 1~2개만 호출하고 멈추는 문제를 디버깅하며 배운 것들

## 배경

SpreadJS 인터랙션 패널에서 "성과 분석 시트 만들어줘"를 요청하면, AI가 `rename_sheet` → `set_range` → `set_style` × N → `set_col_width` → `set_formula` 순으로 여러 도구를 연속 호출해야 완성된 시트가 만들어진다. 하지만 실제로는 `rename_sheet` 하나만 호출하고 멈추는 문제가 발생했다.

## 핵심 내용

### 1. maxSteps의 동작 원리

```typescript
const result = streamText({
  model,
  tools: sheetTools,
  maxSteps: 30,  // 최대 30번의 모델 호출 허용
});
```

- `maxSteps: 1` (기본값): 모델이 도구를 호출해도 **1번만** 실행하고 종료
- `maxSteps: N`: 도구 실행 결과를 모델에 피드백 → 모델이 다음 도구 호출 → 반복 (최대 N번)
- 각 step에서 모델은 **여러 도구를 동시에 병렬 호출** 가능 (Anthropic Claude 지원)

### 2. finishReason으로 진단

```typescript
onStepFinish(event) {
  console.log(`step finished: finishReason=${event.finishReason}, tools=[${toolNames}]`);
}
```

| finishReason | 의미 | 다음 step |
|---|---|---|
| `tool-calls` | 모델이 도구를 호출함, 더 할 일이 있음 | SDK가 자동으로 다음 step 진행 |
| `end-turn` | 모델이 "끝"이라고 판단 | 여기서 종료 |
| `stop` | 최대 토큰 도달 등 | 여기서 종료 |

**발견**: `finishReason=tool-calls`인데 step 2가 실행되지 않는 경우가 있었음. 이는 streaming 응답의 타이밍 이슈로 보임.

### 3. 모델 능력 차이가 크다

| 모델 | 1회 응답 도구 호출 수 | multi-step 지원 |
|---|---|---|
| Haiku 3 | 1~2개 | 거의 안 됨 |
| Sonnet 4.6 | 5~10개 | 제한적 |

**교훈**: `maxSteps`를 높여도 모델이 "끝"이라고 판단하면 소용없다. 시스템 프롬프트로 유도해야 한다.

### 4. ack 응답이 모델의 다음 행동을 결정한다

```typescript
// Before — 모델이 "완료"로 판단하고 멈춤
const ack = async () => ({ success: true });

// After — 모델이 계속 진행하도록 유도
const ack = async () => ({
  success: true,
  instruction: "이 도구가 완료되었습니다. 나머지 도구도 계속 호출하세요.",
});
```

tool 실행 결과(ack)가 모델에게 다시 전달되므로, 여기에 "계속하라"는 메시지를 포함하면 multi-step이 이어질 확률이 높아진다.

### 5. 시스템 프롬프트 엔지니어링 핵심

```
// 효과 없음
"도구를 연속 호출하세요"

// 효과 있음
"한 번의 응답에서 필요한 모든 도구를 한꺼번에 호출하세요.
rename_sheet, set_range, set_col_width, set_style를 모두 동시에 병렬 호출하세요.
도구를 1~2개만 호출하는 것은 실패입니다."
```

**핵심**: "연속 호출"보다 "한 번에 동시 호출"이 효과적. 모델이 multi-step을 하는 것보다 **한 step에서 여러 도구를 병렬 호출**하는 게 더 안정적.

### 6. 클라이언트-서버 데이터 흐름 체인

```
사용자 입력 → useChatRequestBody (activeTool, useMockup)
  → /api/chat/route.ts (isSheetMode → tools 전달 여부)
    → streamText (maxSteps, onStepFinish)
      → toUIMessageStreamResponse (tool parts 스트리밍)
        → use-sheet-command-sync (tool parts → SheetCommand 변환 → SpreadJS 실행)
```

**어디서든 하나가 빠지면 전체가 안 됨**:
- `activeInteractionAtom`이 null → `activeTool: undefined` → `isSheetMode: false` → 도구 미전달
- `workbook`이 null → 인터랙션 패널 미열림 → SpreadJS 미마운트 → 명령 미실행
- `processedIds`에 이미 등록 → 중복 실행 방지로 스킵

### 7. React Flow 높이 계산 (flex 중첩 환경)

디버그 패널에서 React Flow 그래프가 안 보이는 문제:

```tsx
// 문제: flex-1만으로는 React Flow가 높이를 계산 못 함
<div className="flex-1 overflow-hidden">
  <ReactFlow />
</div>

// 해결: min-h-0으로 flex 자식이 shrink 가능하게
<div className="relative flex-1 min-h-0">
  <ReactFlow />
</div>
```

flex 컨테이너가 중첩될 때 `min-h-0`이 없으면 자식의 `min-height: auto` 기본값 때문에 높이가 0이 되지 않아 React Flow가 렌더링되지 않는다.

## 정리

- AI SDK의 `maxSteps`는 모델의 multi-step을 **허용**할 뿐, **강제**하지 않는다
- 모델이 실제로 여러 도구를 호출하게 만들려면 시스템 프롬프트 + ack 응답 모두 최적화 필요
- 경량 모델(Haiku)은 multi-tool calling에 한계가 있으므로, 복합 도구(`create_table`) 설계가 현실적인 대안
- 데이터 흐름 체인에서 atom 하나가 null이면 전체가 동작 안 하므로, 디버깅 시 체인의 각 단계를 console.log로 추적하는 것이 가장 빠름
