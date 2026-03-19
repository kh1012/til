---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "AI 채팅 서비스의 Thread Sidebar 설계 — 리서치부터 구현 계획까지"
updatedAt: "2026-03-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vercel-ai-sdk"
  - "useChat"
  - "chatId"
  - "langfuse"
  - "thread-management"
  - "split-panel-layout"
  - "jotai"
  - "design-system"

relatedCategories:
  - "react"
  - "nextjs"
  - "state-management"
  - "ux-design"
---

# AI 채팅 서비스의 Thread Sidebar 설계 — 리서치부터 구현 계획까지

> CoworkPanel(AI 채팅 인터페이스)에 세션 관리 사이드바를 추가하기 위해, 백엔드 API·프론트엔드 상태·디자인 시스템·레이아웃 아키텍처를 종합 분석하고 구현 계획을 수립한 과정.

## 배경

현재 AI 채팅 시스템은 매 메시지 전송마다 새 ULID가 생성되어, 사실상 모든 대화가 독립 세션으로 기록된다. 과거 대화를 다시 불러오거나 세션을 전환할 수 없는 상태였다. Claude, ChatGPT처럼 좌측 사이드바에서 채팅 히스토리를 관리할 수 있도록 설계가 필요했다.

## 핵심 내용

### 1. 백엔드 — Langfuse 기반 Thread 관리 구조

채팅 이력은 별도 DB 없이 **Langfuse의 session_id**로 관리된다.

- `GET /api/v1/thread/{thread_id}` — `langfuse.api.trace.list(session_id=thread_id)`로 이력 조회
- `submit_message_proto`에서 `get_chat_history(thread_id)`가 이미 thread_id를 받을 수 있음
- **누락된 것**: 세션 **목록** 조회 API (`GET /api/v1/threads`)와, FE에서 threadId를 전달할 `SubmitMessageRequest.threadId` 필드

Langfuse SDK의 `sessions.list()`를 활용하면 BE 작업량이 최소화된다.

### 2. Vercel AI SDK `useChat`의 `chatId` 메커니즘

`@ai-sdk/react`의 `useChat`은 `chatId` 옵션으로 메시지 상태를 분리할 수 있다.

```
chatId 변경 → 해당 키의 메시지 세트로 전환 (빈 배열로 시작)
setMessages()로 서버 이력 주입 → 복원 완료
이전 chatId의 상태는 내부 캐시에 보존
```

**중요 발견**: 스트리밍 중 chatId를 변경해도 이전 chatId의 스트리밍이 백그라운드에서 계속 수신된다. 따라서 Claude/ChatGPT처럼 스트리밍 중 thread 전환을 허용할 수 있다. 다시 돌아오면 완료된 응답이 이미 반영되어 있다.

### 3. 독립 패널 아키텍처 — SplitPanelLayout 슬롯 패턴

처음에는 ThreadSidebar를 CoworkPanel 내부에 넣으려 했으나, **스크롤 문제**가 있었다.

```
SplitPanelLayout
└── content (overflow-y-auto)  ← 스크롤 컨테이너
    ├── mainPanel (flex-1)     ← CoworkPanel이 여기 안에 있음
    ├── interactionPanel       ← sticky (최근 승격됨)
    └── sidePanel              ← sticky (InsightPanel)
```

CoworkPanel 안에 사이드바를 넣으면 mainPanel 내부에 위치하게 되어 채팅 스크롤에 사이드바가 함께 딸려간다. 해결: `SplitPanelLayout`에 `leftPanel` 슬롯을 추가하여 InsightPanel과 동일 레벨에 배치.

마침 같은 날 InteractionPanel도 동일한 이유로 SplitPanelLayout 레벨로 승격되는 리팩토링이 이루어져서, 이 패턴이 이미 검증된 상태.

### 4. Thread 전환 시 초기화해야 할 Jotai Atom 8개

Thread를 전환할 때 이전 thread의 상태가 잔류하지 않도록 초기화해야 할 atom 목록:

| Atom | 초기화 값 |
|---|---|
| `progressEntriesAtom` | `[]` |
| `interactionsAtom` | `[]` |
| `savedFilesAtom` | `{}` |
| `chatStreamingAtom` | `false` |
| `interactionContentListAtom` | `[]` |
| `interactionVersionIndexAtom` | `-1` |
| `interactionPanelOpenAtom` | `false` |
| `activeInteractionAtom` | `null` |

초기 계획에서는 3개만 식별했으나, FE 엔지니어 검토에서 5개가 추가로 발견됨. `resetAllThreadState()` 헬퍼로 묶어 관리하는 것이 안전하다.

### 5. 디자인 시스템 감사 — 새 토큰 1개만 추가

기존 디자인 토큰을 감사한 결과, 새로 정의할 토큰은 `--thread-sidebar-width: 16.5rem` 단 1개뿐이었다.

- 색상: `bg-surface`(배경), `bg-muted`(호버), `bg-brand-subtle`(활성) 재사용
- 애니메이션: `--duration-normal`, `--ease-claude` (InsightPanel과 동일)
- 타이포: `text-step-n2`(제목/날짜), `text-step-n1`(헤더)

### 6. 4열 레이아웃과의 공간 계산

같은 날 도입된 `--chat-area-min: 37rem`, `--chat-area-max: 48rem` 클램프와의 상호작용 검증:

- 1440px 뷰포트에서 ThreadSidebar(264px) + InteractionPanel 동시 열림 → mainPanel ~584px → `max-w` 이하이므로 자연 축소
- flex 레이아웃이 공간을 자동 분배하므로 토큰 수정 불필요

## 정리

- **리서치 → 디자인 → FE 검토** 3단계 팀 리뷰가 효과적이었다. 디자이너가 토큰 감사로 불필요한 추가를 방지하고, FE 엔지니어가 누락된 atom 5개를 발견했다.
- `useChat`의 `chatId`가 thread 관리에 핵심 역할을 한다. 특히 **스트리밍 중 전환 허용**은 직접 테스트해보기 전까지 확신하기 어려운 부분이었으나, chatId별 독립 상태 캐시 덕분에 자연스럽게 지원된다.
- 같은 날 InteractionPanel이 SplitPanelLayout으로 승격되면서 `leftPanel` 추가 패턴이 이미 검증된 것은 타이밍이 좋았다. 레이아웃 변경에 대한 리스크가 크게 줄었다.
- BE 요청사항은 최소화했다: 세션 목록 API 1개 + SubmitMessageRequest에 Optional 필드 1개. Langfuse SDK를 활용하면 BE 구현 부담이 적다.
