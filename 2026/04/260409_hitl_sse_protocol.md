---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "FE-BE HITL 프로토콜 설계 및 구현 — SSE 이벤트 + 이중 소스 atom + 파이프라인 체인"
updatedAt: "2026-04-09"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "HITL"
  - "SSE"
  - "Jotai"
  - "derived atom"
  - "TransformStream"
  - "event-driven"
  - "agent protocol"

relatedCategories:
  - "react"
  - "nextjs"
  - "backend"
  - "streaming"
---

# FE-BE HITL 프로토콜 설계 — SSE 이벤트 기반 사용자 의사결정 루프

> 백엔드 AI 에이전트 응답 내 사용자 선택이 필요한 시점을 구조화된 SSE 이벤트로 전달하고, FE가 오버레이 UI를 렌더링하여 선택 결과를 반환하는 양방향 프로토콜을 설계하고 구현했다.

## 배경

AI 구조설계 어시스턴트에서 백엔드 에이전트가 사용자 확인/선택이 필요한 시점에 텍스트로만 선택지를 제시하고 있었다. "진행해줘라고 답해주세요", "1) A 2) B", "진행하실까요?" 등 매번 다른 형식으로 응답하여 FE에서 안정적으로 HITL UI를 렌더링할 수 없었다.

처음에는 FE 텍스트 파싱(regex)으로 해결을 시도했으나, 비정형 응답에 대한 정확도가 ~90%에 그쳤고 오탐/미탐이 빈번했다. 결국 FE-BE 양쪽을 수정하여 구조화된 SSE 이벤트 프로토콜을 설계하게 되었다.

## 핵심 내용

### 1. 이중 소스 아키텍처 (Dual Source Atom)

가장 중요한 설계 결정. SSE 이벤트와 텍스트 파싱을 **동시에 지원하되 우선순위를 두는** 구조:

```typescript
// eventHitlAtom: SSE 이벤트에서 직접 설정 (정확도 100%)
// textHitlAtom: 텍스트 파싱 fallback (정확도 ~90%)

const agentHitlAtom = atom((get) => {
  const event = get(eventHitlAtom);
  if (event) return eventToState(event);
  return get(textHitlAtom);  // fallback
});
```

이렇게 하면 BE가 SSE 이벤트를 보내면 정확하게 동작하고, BE 미구현 시에도 텍스트 파싱으로 기본 동작이 유지된다. 하위 호환성 확보.

### 2. TransformStream에서 atom 즉시 설정 + isStreaming 가드

가장 삽질이 많았던 부분. 세 가지 접근을 시도했다:

| 접근 | 결과 | 문제 |
|------|------|------|
| `flush`에서 atom 설정 | 안 됨 | flush 타이밍과 React 렌더 race condition |
| `flush` + `setTimeout(0)` | 안 됨 | 여전히 race condition |
| `transform`에서 즉시 설정 + `isStreaming` 가드 | 동작 | 관심사 분리 |

최종 결론: **atom은 데이터가 도착하는 즉시 설정하고, UI 표시 타이밍은 별도 가드로 제어**한다.

```typescript
// DebugChatTransport: 즉시 설정
transform(chunk, controller) {
  const hitlReq = extractHitlRequest(chunk);
  if (hitlReq) store.set(eventHitlAtom, hitlReq);
}

// use-chat-area-state: isStreaming 가드
const isAgentHitlActive = useAgentHitlActive() && !orchestration.isStreaming;
```

### 3. `[지시: ...]` 패턴 — BE agent tier 한계 우회

`taskInstruction`이 agent tier에서 무시되는 문제를 발견. 해결:
- AI 지시를 메시지 **텍스트에 포함** (`[지시: fetch를 즉시 호출하세요.]`)
- `UserMessageContent`에서 `[지시: ...]` 패턴을 **strip하여 사용자에게 미노출**
- BE AI가 메시지 본문에서 `[지시:]`를 인식하여 도구 호출

```typescript
// UserMessageContent.tsx
function stripInstructions(text: string): string {
  return text.replace(/\n*\[지시:[\s\S]*?\]/g, "").trim();
}
```

### 4. 커넥터 인라인 검증 (freeTextAction)

HITL 오버레이의 자유 입력 필드를 **API Key 검증 UI로 재활용**:
- `freeTextAction: "verify-connector:gen"` → 입력값을 MAPI Key로 검증
- 검증 성공 시 3개 atom 동시 업데이트 (key + connectedAt + enabled)
- `inputRows: 3` → textarea로 렌더링 (긴 Key 대응)

### 5. action: "skip" — 선택적 도구 호출 제어

`nextInstruction`은 긍정 응답에만 포함되어야 한다:
- `action: "skip"` 옵션 선택 시 → `nextInstruction` 제외하여 전송
- AI가 다음 도구를 호출하지 않고 멈춤

### 6. setState-during-render 방지

`useHitlTimeout`에서 `setRemainingMs` state updater 안에서 `onTimeout()`을 직접 호출하면 React 에러 발생:

```
Cannot update a component (ChatArea) while rendering a different component (AgentHitlOverlay)
```

`setTimeout(onTimeout, 0)`으로 다음 마이크로태스크로 분리하여 해결.

## 정리

- **이중 소스 패턴**은 새 프로토콜 도입 시 하위 호환을 유지하는 좋은 전략이다. 완전 전환이 아닌 점진 전환.
- **atom 설정 시점 vs UI 표시 시점을 분리**하는 것이 TransformStream + React 통합의 핵심이었다. "언제 데이터가 준비되는가"와 "언제 사용자에게 보여줄 것인가"는 다른 문제.
- agent tier에서 `taskInstruction`이 무시되는 것은 FE-BE 프로토콜 설계 시 반드시 확인해야 할 사항. 메시지 본문에 지시를 넣고 UI에서 strip하는 패턴이 실용적 우회법이었다.
- 하루 만에 PM → Plan → Design → Do → Check까지 PDCA 전체 사이클을 2바퀴 돌렸다 (hitl-chat-connect + hitl-protocol). 구조화된 프로세스가 속도를 오히려 높여준 케이스.
