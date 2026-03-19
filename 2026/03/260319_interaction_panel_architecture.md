---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "InteractionPanel 아키텍처 설계 — 위계 결정, sticky 레이아웃, Framer Motion 애니메이션"
updatedAt: "2026-03-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "framer-motion"
  - "jotai"
  - "sticky-layout"
  - "flex-layout"
  - "css-transition"
  - "ai-sdk-v6"
  - "fsd-architecture"
  - "requestAnimationFrame"

relatedCategories:
  - "css"
  - "nextjs"
  - "typescript"
  - "architecture"
---

# InteractionPanel 아키텍처 설계 — 위계 결정부터 애니메이션까지

> 채팅 옆에 나란히 표시되는 Interaction 사이드 패널을 설계하면서, 컴포넌트 위계·sticky 레이아웃·Framer Motion 순차 애니메이션·상태 동기화 문제를 해결한 과정.

## 배경

MIDAS MAX 프로젝트에서 AI 채팅 응답을 기반으로 스프레드시트·3D 뷰어 등의 인터랙티브 콘텐츠를 채팅 옆에 나란히 표시하는 InteractionPanel 기능을 구현했다. 단순한 사이드 패널처럼 보이지만, 위계 결정 → 버그 수정 → 레이아웃 설계 → 애니메이션 → 상태 동기화까지 여러 레이어의 문제를 풀어야 했다.

## 핵심 내용

### 1. 컴포넌트 위계 결정 — 3단계 변천

처음에는 CoworkPanel 내부의 서브 컴포넌트로 시작했다가, 최종적으로 InsightPanel과 동급의 독립 패널로 승격했다.

| 단계 | 구조 | 문제 |
|---|---|---|
| 1차: `interaction-panel/` (CoworkPanel 내부) | CoworkPanel > ChatArea + InteractionPanel | sticky 안 먹힘 — 스크롤 컨테이너의 직접 자식이 아니기 때문 |
| 2차: `interaction-view/` (네이밍 변경) | 위치 동일, Panel→View 리네이밍 | 근본 문제 미해결 |
| 3차: `interaction-panel/` (SplitPanelLayout 승격) | scroll container > mainPanel + InteractionPanel + InsightPanel | sticky 정상 동작 |

**교훈:** sticky positioning은 **가장 가까운 스크롤 조상의 직접 자식**이어야 동작한다. 중간에 flex 컨테이너가 끼어 있으면 안 된다.

### 2. Enter 키 전송 버그 — 클로저 캡처 문제

`useChatStream` 내부의 `handleKeyDown`이 클로저로 자신의 `submitMessage`를 캡처하고 있어서, `useChatOrchestration`에서 오버라이드한 `submitMessageWithMidasIntercept`가 호출되지 않았다.

```typescript
// useChatOrchestration의 return
return { ...chatStream, submitMessage: submitMessageWithMidasIntercept, ... };
// ↑ submitMessage는 오버라이드되지만, handleKeyDown은 chatStream 내부의 원본을 캡처
```

**해결:** `useChatOrchestration`에서 `handleKeyDown`도 오버라이드.

### 3. AI SDK v6 — isStreaming 전환과 messages 타이밍

`useEffect`에서 `isStreaming`이 `false`로 바뀔 때 `messagesRef.current`를 즉시 읽으면, messages가 아직 업데이트되지 않은 상태일 수 있다.

**해결:** `requestAnimationFrame`으로 한 프레임 지연. 기존 `useStreamingCompletion`에서 이미 사용하던 패턴.

```typescript
useEffect(() => {
  if (isStreaming || !sendRef.current) return;
  requestAnimationFrame(() => {
    // 이 시점에 messagesRef.current는 최신 상태
    const last = [...messagesRef.current].reverse().find(m => m.role === "assistant");
    // ...
  });
}, [isStreaming, ...]);
```

### 4. Framer Motion 순차 애니메이션

Gemini Canvas 스타일의 2단계 애니메이션:

```
열기: aside flexGrow 0→1 (300ms) → delay 320ms → 카드 scale 0.6→1 (400ms)
닫기: 카드 scale 1→0.7 (120ms) → onExitComplete → aside flexGrow 1→0 (200ms)
```

**핵심:** 닫기 시 `AnimatePresence`의 `onExitComplete`로 카드 exit 완료를 감지한 뒤 aside를 접는다. `useState(asideOpen)`으로 두 단계를 분리.

```typescript
<AnimatePresence onExitComplete={() => { if (!isOpen) setAsideOpen(false); }}>
```

### 5. flex 레이아웃에서 max-width 즉시 적용 충돌

mainPanel에 `max-w`를 즉시 적용하면 InteractionPanel의 `flexGrow` 애니메이션과 타이밍이 불일치하여 InsightPanel이 순간적으로 밀렸다.

**해결:** mainPanel의 `max-w` 제약을 완전 제거. `flexGrow: 1`끼리 자연스럽게 공간을 분배하도록 위임. 내부 MessageList/MessageInput의 `max-w` + `mx-auto`가 이미 콘텐츠 폭을 제한하므로 추가 제약 불필요.

### 6. 아티팩트 카드 이동 버그 — id 보존

패널이 열린 상태에서 추가 메시지를 보내면, 마지막 콘텐츠를 교체할 때 `id`가 새 메시지 ID로 바뀌어 이전 메시지의 카드가 사라지고 새 메시지로 이동했다.

**해결:** 패널이 열린 상태에서는 `content`/`title`/`timestamp`만 갱신하고 `id`는 원래 값 유지.

```typescript
if (panelOpen) {
  setContentList((prev) => {
    const updated = [...prev];
    const last_item = updated[updated.length - 1];
    updated[updated.length - 1] = { ...last_item, content, title, timestamp: Date.now() };
    // id는 건드리지 않음 → 기존 카드 위치 보존
    return updated;
  });
}
```

### 7. FSD 레이어 규칙과 widget 간 import

ESLint FSD 규칙에서 `features → widgets`는 금지이지만, `widgets → widgets`는 허용. `features` 레이어에서 widget atom을 import할 때는 `eslint-disable` 주석으로 우회.

`shared` 레이어의 `SplitPanelLayout`에서 widget atom을 import하는 것도 동일하게 처리했다가, 최종적으로 atom 의존을 제거하여 순수 레이아웃 컴포넌트로 복원.

## 정리

- **위계가 곧 레이아웃이다.** 컴포넌트의 DOM 위치가 CSS 동작(sticky, flex)을 결정한다. 네이밍만 바꿔서는 해결 안 됨.
- **클로저 캡처는 조용한 버그.** 훅에서 반환한 함수가 내부 함수를 캡처하면, 외부에서 오버라이드해도 내부 호출에는 반영 안 됨.
- **애니메이션은 단계별로 분리.** CSS transition과 Framer Motion을 동시에 쓰면 충돌. 한 시스템으로 통일하거나, 명확한 순차(delay + onExitComplete)로 분리.
- **즉시 적용 vs 애니메이션 동기화.** React 상태 변경(즉시)과 애니메이션(시간)의 타이밍 불일치가 레이아웃 jank를 유발. flex 자연 분배로 위임하는 것이 가장 안정적.
