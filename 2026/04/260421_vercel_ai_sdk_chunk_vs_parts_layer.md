---
draft: true
type: "content"
domain: "frontend"
category: "ai-sdk"
topic: "Vercel AI SDK SSE chunk와 message.parts는 다른 레이어다"
updatedAt: "2026-04-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vercel-ai-sdk"
  - "sse"
  - "message-parts"
  - "dynamic-tool"
  - "step-start"
  - "langfuse"

relatedCategories:
  - "streaming"
  - "observability"
  - "typescript"
---

# Vercel AI SDK의 SSE chunk와 message.parts는 다른 레이어다

> 네트워크 와이어 포맷(SSE chunk)과 FE 런타임 스토리지(message.parts.type)는 이름이 비슷해도 서로 다른 계층이다. 두 계층을 분리해서 문서화하지 않으면 "왜 SSE에서 `tool-output-available`이 오는데 `message.parts`에는 `dynamic-tool`로 들어있지?" 같은 질문이 반복된다.

## 배경

MAX 프로젝트에서 BE(Pydantic AI) ↔ SSE ↔ FE(Jotai) ↔ Langfuse 구조의 SSE 매핑 문서를 작성하고, 실측 데이터(`fe-messages.json` 4 messages, `langfuse.json` 13 observations)로 교차 검증하면서 발견했다. 최초 매핑 테이블은 "SSE chunk" 열 하나로 묶었는데, 실측 객체를 열어보니 FE `message.parts[i].type` 값이 SSE chunk type과 다른 경우가 2가지 있었다.

## 핵심 내용

### 1. SSE 와이어 ↔ FE 스토리지 레이어 매핑

| 카테고리 | SSE chunk type (와이어) | FE `parts.type` (스토리지) | 변환 주체 |
|---------|------------------------|--------------------------|----------|
| Tool 결과 | `tool-output-available` | `dynamic-tool` | Vercel AI SDK |
| 도메인 데이터 | `data-*` (custom) | `data-*` (동명 보존) | 변환 없음 |
| 텍스트 | `text-start` / `text-delta` / `text-end` | `text` | AI SDK (id 기반 누적) |
| 경계 마커 | (네트워크에 존재 안 함) | `step-start` | AI SDK (step 경계) |

**핵심**: `tool-output-available`은 네트워크에서 오는 일회성 이벤트. AI SDK가 이걸 받아서 `message.parts` 배열에 `{type: "dynamic-tool", toolName, toolCallId, ...}` 모양으로 저장한다. 즉 FE 컴포넌트가 렌더할 때 참조하는 건 변환된 `parts[].type`이지 원본 chunk type이 아니다.

### 2. `step-start` — 네트워크에 없는데 FE parts에는 있는 타입

실측 4-message 샘플에서 `step-start` 파트가 4건 관측됐다. 근데 이건 SSE chunk로 전송되는 게 아니라 AI SDK 내부에서 assistant 응답 시작 지점마다 삽입하는 경계 마커다. 

문제는 커스텀 chunk 파서가 exhaustive switch를 하면서 `step-start`를 처리 안 하면 R20 규칙(unknown type → default 분기로 `console.warn`) 때문에 매번 경고가 뜨거나, silent drop되면서 정적 분석이 놓친다. 해결책: 명시적으로 `case "step-start": /* no-op */ break`.

### 3. FE가 runtime에 주입하는 공통 메타데이터

`data-chunk-interceptor`가 SSE 수신 시점에 모든 FE part에 4개 필드를 얹는다.

```typescript
interface InjectedMeta {
  domain: string;          // "Hitl", "OrchestratorLog" — @sse-display JSDoc grep 키
  componentName: string;   // "HitlConfirmCard"
  componentPath: string;   // "src/shared/ui/hitl/HitlConfirmCard.tsx"
  raw: unknown;            // Zod 파싱 전 원본 payload
}
```

이 덕분에 런타임 inspector/debug 도구가 part 한 조각만 보고도 어느 도메인의 어느 컴포넌트가 렌더되는지 역추적할 수 있다. JSDoc `@sse-display {Domain}` 태그와 1:1 대응하는 응집 메커니즘.

### 4. Langfuse trace는 또 별개 레이어

네트워크/FE와 무관하게 BE observability는 Langfuse trace로 수렴한다. 실측에서 `orchestrate` trace 하나가 5 SPAN (orchestrate 루트 + 4 agent) · 6 GENERATION · 2 TOOL을 담고 있었다.

```
orchestrate (15.13s · trace root)
├── chat_coordinator run (1.18s)   → AssistantText (text-*)
├── executor run (9.58s)            → GenNxProgress · DesignArtifact · ToolActivity (data-*)
│   ├── TOOL load_cached_gen_nx_required_data (0.00s · 캐시 히트)
│   └── TOOL fetch_gen_nx_required_data (1.90s)
├── planner run (2.73s)             → OrchestratorLog (tool-output: agent_orchestration_log)
└── intent run (1.62s)              → Intent (tool-output: intent_analysis)
```

재밌는 발견: `load_cached_gen_nx_required_data`는 캐시 히트 경로여서 SSE progress chunk를 발행하지 않는다 — 즉 FE에는 안 보이고 Langfuse에만 기록된다. 3개 레이어(네트워크/FE/관측)가 각자 독립적으로 존재한다는 증거.

## 정리

- **이름이 겹쳐 보여도 레이어를 분리해서 문서화하라**. SSE chunk type ↔ FE parts.type ↔ Langfuse SPAN은 각각 다른 시점/주체가 만드는 별개 계층.
- **실측 데이터 없이 매핑 문서를 쓰면 반드시 빠진다**. 설계 단계에서 보지 못한 `step-start` / `load_cached_*` 같은 "네트워크엔 없고 한쪽에만 있는" 타입들이 실측에서 드러난다.
- **A3 포스터로 만들면 BE-FE 합의가 빨라진다**. 9열(BE 발생원 / SSE chunk / FE parts.type / Zod / FE 컴포넌트 / atom / SPAN) × 8행 매트릭스로 한 장에 펼치면 "이 도메인은 어느 레이어에서 어떻게 변환되나?"가 한눈에 보인다.
- 다음에 유사 매핑 작업을 할 땐 **설계 직후 실측 샘플 수집을 PDCA Check 단계에 넣자**. 샘플 없이 설계만으로 확정하면 R20 exhaustive 위반 같은 버그 소지가 남는다.
