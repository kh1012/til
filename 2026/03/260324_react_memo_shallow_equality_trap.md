---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "React.memo 커스텀 비교 함수의 shallow equality 함정"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react-memo"
  - "shallow-equality"
  - "reference-comparison"
  - "fingerprint"
  - "vercel-ai-sdk"

relatedCategories:
  - "performance"
  - "typescript"
---

# React.memo 커스텀 비교 함수에서 배열 내부 변경이 감지되지 않는 문제

> `prev.parts !== next.parts`(참조 비교)만으로는 배열 내부 객체의 state 변경을 감지할 수 없어 UI가 멈추는 버그

## 배경

Vercel AI SDK의 `useChat`으로 AI 도구 호출을 처리하는 채팅 UI에서, SpreadJS 도구 실행이 완료된 후 응답 메시지 버블이 업데이트되지 않는 현상이 발생했다. 도구는 정상 실행되지만, "도구 실행 중" 상태에서 "완료" 상태로 UI가 전환되지 않았다.

## 핵심 내용

### 문제의 코드

```typescript
// areMessageBubblePropsEqual — React.memo의 커스텀 비교 함수
export function areMessageBubblePropsEqual(prev, next) {
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.parts !== next.message.parts) return false;  // ← 참조 비교
  if (prev.isCodeRunning !== next.isCodeRunning) return false;
  return true;
}

export const MessageBubble = memo(MessageBubbleInner, areMessageBubblePropsEqual);
```

### 왜 실패하는가

Vercel AI SDK가 tool state를 업데이트할 때:

```
parts[2].state: "input-available" → "output-available"
```

배열 내부 객체의 `state` 속성만 변경되고, **`parts` 배열 참조 자체는 동일**할 수 있다. JavaScript에서 `===`는 배열의 메모리 주소만 비교하므로:

```javascript
const arr = [{ state: "running" }];
arr[0].state = "done";
arr === arr;  // true — 같은 참조
```

결과: `areMessageBubblePropsEqual`이 `true`를 반환 → `React.memo`가 리렌더 차단 → UI 정지

### 해결: fingerprint 패턴

full deep equality는 비용이 크므로, **변경 감지가 필요한 필드만 요약한 fingerprint**를 비교:

```typescript
function toolStateFingerprint(parts): string {
  let fp = "";
  for (const p of parts) {
    if (typeof p.type === "string" && p.type.startsWith("tool-")) {
      const raw = p as { toolCallId?: string; state?: string };
      fp += `${raw.toolCallId ?? ""}:${raw.state ?? ""};`;
    }
  }
  return fp;
}

export function areMessageBubblePropsEqual(prev, next) {
  if (prev.message.id !== next.message.id) return false;
  if (prev.message.parts !== next.message.parts) return false;
  // 참조가 같아도 내부 tool state가 변했으면 리렌더
  if (toolStateFingerprint(prev.message.parts)
      !== toolStateFingerprint(next.message.parts)) return false;
  if (prev.isCodeRunning !== next.isCodeRunning) return false;
  return true;
}
```

### 성능 고려

- tool part만 순회 (text part 스킵)
- 문자열 concat으로 O(n) — 메시지당 tool part는 보통 1~10개
- `JSON.stringify` 전체 비교 대비 훨씬 가벼움

## 정리

- **`React.memo` 커스텀 비교 함수에서 배열/객체는 참조 비교로 충분하지 않을 수 있다** — 외부 라이브러리(AI SDK 등)가 내부 mutation으로 상태를 변경하면 참조는 그대로
- **fingerprint 패턴**: 변경 감지가 필요한 필드만 문자열로 요약하여 비교하면 deep equality와 성능 사이의 좋은 트레이드오프
- **증상과 원인의 거리**: "스트리밍이 멈춤" → 원인은 `React.memo`의 비교 함수. 렌더링 문제는 데이터 흐름의 최상위부터 추적해야 한다
- **Virtualized list + React.memo 조합 주의**: Virtuoso 같은 가상 스크롤 라이브러리와 memo를 함께 쓰면, 리렌더 차단이 의도치 않게 작동할 수 있다
