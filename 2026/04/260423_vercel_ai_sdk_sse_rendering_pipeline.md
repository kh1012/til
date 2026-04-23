---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Vercel AI SDK SSE 렌더링 파이프라인 패턴"
updatedAt: "2026-04-23"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vercel-ai-sdk"
  - "useChat"
  - "UIMessage"
  - "SSE"
  - "streaming"
  - "message.parts"
  - "react-markdown"

relatedCategories:
  - "nextjs"
  - "typescript"
  - "streaming"
---

# Vercel AI SDK SSE 렌더링 파이프라인 패턴

> `useChat`이 SSE 스트림을 수신하면 `message.parts[]`로 자동 파싱되고, FE는 이 배열을 `chunkParts → renderMessageChunks` 2단계로 가공해 React 컴포넌트 트리로 변환한다.

## 배경

실제 멀티에이전트 채팅 앱의 코드베이스를 분석하면서 Vercel AI SDK가 SSE 스트림을 어떻게 처리하고, FE에서 어떤 렌더링 파이프라인을 통해 화면에 표시되는지 전체 흐름을 정리했다.

## 핵심 내용

### 1. SSE Wire Format

BE(Next.js BFF 또는 FastAPI)가 내려주는 이벤트 라인:

```
e: text-delta
d: {"id":"c3a6...","delta":"안녕"}

e: tool-result
d: {"toolCallId":"abc","output":"..."}

e: data-hitl-request
d: {"id":"evt_1","data":{"hitlId":"...","pattern":"confirm"}}
```

`data-{name}` 접두사가 붙은 이벤트는 커스텀 도메인 이벤트다. AI SDK가 자동으로 `DataUIPart`로 파싱한다.

### 2. AI SDK → `message.parts[]`

`useChat`이 스트림을 수신하면서 `UIMessage.parts[]`를 실시간 누적한다:

| SSE 이벤트 | parts 항목 |
|-----------|-----------|
| text-start/delta/end | `{ type: "text", text }` |
| tool-call + tool-result | `{ type: "dynamic-tool", toolName, state, input, output }` |
| step-start | `{ type: "step-start" }` |
| data-{name} | `{ type: "data-{name}", data: {...} }` |

### 3. FE 렌더링 2단계 파이프라인

SDK가 채워준 `message.parts[]`를 그대로 렌더하지 않고, 2단계로 가공한다.

**1단계: `chunkParts(parts) → MessageChunk[]`**

- 연속된 tool parts를 `{ kind: "tool-group" }` 으로 묶는다
- `step-start`를 경계 마커로 삽입한다
- 특정 `data-*` parts는 본문 skip (side-channel 처리)
- 결과: `step-start | tool-group | standalone-tool | part | loop-block`

**2단계: `renderMessageChunks(chunks) → ReactNode[]`**

각 chunk kind에 따라 컴포넌트로 변환:

```
tool-group    → <ToolCallGroup> (아코디언)
step-start    → <ToolStepSection> (회차 경계)
standalone    → <IntentIndicator> / <OrchestratorLogIndicator>
part/text     → <MemoTextBlock> → <DebouncedMarkdown> → react-markdown
part/data-*   → <GenNxProgressIndicator> 등 인라인
```

### 4. 렌더링 두 갈래 — 본문 vs 사이드채널

`data-*` 이벤트는 두 갈래로 분리된다:

**갈래 A (본문)**: `message.parts[]` → `chunkParts` → `renderMessageChunks`
- `data-gen-nx-fetch-progress` → 인라인 Progress 카드
- `type="text"` → 마크다운 렌더

**갈래 B (사이드채널)**: `data-chunk-interceptor` → Jotai atom
- `data-hitl-request` → `eventHitlAtom` → 오버레이 HITL 카드
- `data-tool-activity` → `toolActivitiesAtom` → 도구 활동 표시
- `data-design-pipeline-artifact` → `lastDesignPipelineArtifactAtom` → 사이드 노트북

사이드채널 패턴 핵심: 스트리밍 중 atom을 직접 채우기 때문에 메시지 이력에 남지 않는 transient 상태를 표현할 수 있다.

```ts
// dispatch table 패턴 — 새 data-* 추가 시 handler 1개 + map 1행
export const DATA_CHUNK_HANDLERS: Record<string, DataChunkHandler> = {
  "data-tool-activity": handleToolActivity,
  "data-hitl-request": handleHitlRequest,
  // 여기에 추가
};

export function interceptDataChunk(store, chunk) {
  const handler = DATA_CHUNK_HANDLERS[chunk.type];
  if (!handler) { console.warn(...); return; }
  handler(store, chunk.data);
}
```

### 5. 마크다운 렌더링 성능 레이어

텍스트 파트는 3겹 memo로 렌더 비용을 줄인다:

```
<MemoTextBlock>        ← text prop 불변 시 전체 스킵 (memo)
  <DebouncedMarkdown>  ← rAF 기반 디바운싱 (스트리밍 중 프레임당 1회 파싱)
    <MemoBlock> × N    ← H3 섹션 단위 분할 + 각 섹션 memo
      <Markdown>       ← react-markdown 실제 파싱
```

- `DebouncedMarkdown`: `requestAnimationFrame`으로 파싱 타이밍 제어. 도구 상태 변경이 text 리렌더를 유발하지 않도록 분리.
- H3 헤더 기준 섹션 분할: 새 섹션이 추가될 때 기존 섹션의 `<MemoBlock>`은 재파싱되지 않음.

### 6. react-markdown 커스텀 렌더러

`createSimpleMarkdownRenderers()`로 기본 HTML 요소를 모두 오버라이드:

```tsx
p: ({ children }) => {
  const stripped = stripSectionEmoji(children);
  return (
    <p className={stripped.isSection ? "my-s" : "mb-2 last:mb-0"}>
      {stripped.children}
    </p>
  );
}
```

`p`에는 BE `agent_orchestration_log` 응답의 이모지 prefix(`🎯📋🔍✅`)를 섹션 헤더로 감지하는 로직이 있다. 이모지를 strip하고 여백만 크게 적용한다. **BE 프롬프트 변경 시 함께 수정해야 하는 brittle한 의존.**

### 7. 컴포넌트 계층 요약

```
MessageList
  └── renderTimelineItem
        └── MessageErrorBoundary      R23 — 메시지 단위 에러 격리
              └── MessageItem (memo)
                    ├── UserFileCards
                    ├── MessageBubble (memo)
                    │     └── AssistantTextBlock
                    │           └── chunkParts → renderMessageChunks
                    │                 ├── <LoopBlock>
                    │                 ├── <IntentIndicator>
                    │                 ├── <OrchestratorLogIndicator>
                    │                 ├── <ToolCallGroup> / <ToolStepSection>
                    │                 ├── <GenNxProgressIndicator>
                    │                 └── <MemoTextBlock> → <DebouncedMarkdown>
                    ├── InteractionSlot    HITL 오버레이 앵커 (atom 구독)
                    ├── ViewerSlot         DesignNotebook 앵커 (atom 구독)
                    └── MessageItemFooter
```

## 정리

- **SDK의 역할은 `message.parts[]` 채우기까지**. 렌더링 로직은 FE가 직접 담당한다.
- **`chunkParts → renderMessageChunks` 2단계 변환**이 핵심 패턴. 이 사이에 "어떤 컴포넌트로 렌더할지"를 결정하는 분기가 모인다.
- **본문(message.parts) vs 사이드채널(atom)** 분리가 transient 상태 표현의 핵심. 오버레이/사이드패널처럼 메시지 이력에 남지 않아도 되는 UI는 사이드채널로 처리한다.
- **3겹 memo 구조**(`MemoTextBlock → DebouncedMarkdown → MemoBlock`)는 스트리밍 중 마크다운 파싱 비용을 최소화하는 실전 패턴. 도구 상태 변경이 텍스트 재파싱을 유발하지 않는 게 핵심.
- `AppUIMessage = UIMessage<unknown, AppDataTypes>` 제네릭 타입을 실제로 쓰면 DataUIPart 타입 안전성을 확보할 수 있는데, 현재 코드베이스에서 정의만 되고 사용되지 않고 있다.
