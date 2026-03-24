---
draft: true
type: "content"
domain: "frontend"
category: "ai-sdk"
topic: "Vercel AI SDK 컨텍스트 누적 문제와 서버 사이드 트리밍"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vercel-ai-sdk"
  - "useChat"
  - "context-window"
  - "sliding-window"
  - "tanstack-query"
  - "split-select"

relatedCategories:
  - "react"
  - "nextjs"
  - "typescript"
---

# Vercel AI SDK 컨텍스트 누적 문제와 서버 사이드 트리밍

> AI SDK의 useChat는 전체 대화 히스토리를 매 요청마다 자동 전송한다 — 클라이언트에서 제어 불가하므로 서버에서 트리밍해야 한다.

## 배경

Next.js + Vercel AI SDK v6 기반 AI 채팅 앱에서 대화가 길어질수록 매 요청의 input 토큰이 선형 증가하는 문제를 발견했다. Backend 모드에서는 서버 DB가 히스토리를 관리하므로 전체 전송이 불필요하고, Mockup 모드에서도 50턴 대화 시 매 요청 $0.15+의 비용이 발생했다.

## 핵심 내용

### 1. AI SDK의 메시지 전송 메커니즘

Vercel AI SDK의 `useChat` 훅은 내부적으로 `chat.messages` 배열 전체를 HTTP 요청에 포함한다. `DefaultChatTransport`가 이를 처리하며, 클라이언트 측에서 메시지를 필터링하거나 줄이는 공식 API는 없다.

```
useChat.sendMessage()
  → DefaultChatTransport: chat.messages 전체 자동 포함
    → POST /api/chat { messages: [전체 히스토리] }
```

### 2. 서버 사이드 트리밍 전략

클라이언트의 `chat.messages`는 UI 표시용으로 유지하고, API Route Handler(route.ts)에서 LLM 전달 직전에 트리밍한다.

```typescript
type TrimMode = "backend" | "mockup" | "passthrough";

function trimMessages<T extends { role?: string }>(options): TrimResult<T> {
  // Backend 모드: 마지막 user 메시지 1개만 (서버 DB가 히스토리 관리)
  if (!useMockup && threadId) return [lastUserMessage];

  // Mockup 모드: 최근 N턴 슬라이딩 윈도우
  if (useMockup) return messages.slice(-contextTurns * 2);

  // Fallback: 전체 유지
  return messages;
}
```

### 3. TanStack Query로 모델 리스트 관리

`useEffect` + `fetch`를 `useQuery`로 전환하여 자동 복구를 구현했다.

```typescript
const { data, isLoading } = useQuery({
  queryKey: ["models", mockupMode],
  queryFn: () => fetchModels(mockupMode),
  staleTime: isOffline ? 0 : 5 * 60 * 1000,  // offline이면 항상 stale
  retry: 3,
  refetchOnWindowFocus: true,
  refetchInterval: isOffline ? 30_000 : false, // offline이면 30초 주기
});
```

핵심 포인트: `refetchOnWindowFocus`는 **데이터가 stale일 때만** 동작한다. `staleTime`이 5분이면 5분 이내에는 포커스해도 refetch하지 않는다. offline 복구가 필요한 경우 `staleTime: 0`으로 설정해야 한다.

### 4. SplitSelect — GitHub 스타일 분할 셀렉터

하나의 pill 안에 두 개의 독립 드롭다운을 결합하는 패턴. 단일 `openState: "none" | "primary" | "secondary"`로 상호 배타적 열림을 보장한다.

```
[ Sonnet 4.6  ▾ │ 10 ]
  ← primary →    ← secondary →
```

variant의 hover를 pill 전체가 아닌 각 버튼에 독립 적용하려면, variant 문자열에서 `hover:` 접두사 클래스를 regex로 분리해야 한다.

```typescript
const variantBase = VARIANT_STYLES[variant].replace(/hover:\S+/g, "").trim();
const variantHover = VARIANT_STYLES[variant].match(/hover:\S+/g)?.join(" ") ?? "";
```

### 5. disabled 상태에서의 hover 차단

`opacity-50 cursor-not-allowed`만으로는 hover 스타일이 여전히 적용된다. `pointer-events-none`을 사용해야 마우스 이벤트 자체가 차단된다.

## 정리

- AI SDK처럼 내부 동작을 제어할 수 없는 라이브러리는 "경계에서 변환"하는 패턴이 효과적이다 — 클라이언트는 그대로 두고 서버에서 가공.
- TanStack Query의 `staleTime`과 `refetchOnWindowFocus`의 관계를 정확히 이해해야 원하는 자동 복구 동작을 구현할 수 있다.
- CSS의 `pointer-events-none`은 disabled UI에서 hover/click을 완전히 차단하는 가장 확실한 방법이다.
- 이미 설치된 도구(TanStack Query)를 안 쓰고 있었던 건 기술 부채 — 정비 기회를 놓치지 말 것.
