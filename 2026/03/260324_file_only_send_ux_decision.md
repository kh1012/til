---
draft: true
type: "content"
domain: "frontend"
category: "ux-engineering"
topic: "첨부파일만 전송 기능의 설계-구현-폐기 사이클에서 배운 것"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vercel-ai-sdk"
  - "chat-ux"
  - "file-attachment"
  - "rule-based-response"
  - "feature-revert"

relatedCategories:
  - "react"
  - "nextjs"
  - "llm"
---

# 첨부파일만 전송 — 만들고 부수며 배운 것

> "텍스트 없이 파일만 보내면 AI가 알아서 응답하면 좋겠다"는 아이디어가 왜 현실에서 작동하지 않았는지, 그리고 전제를 바꾸는 것이 최선이었던 이유.

## 배경

MAXYS 채팅 UI에서 파일을 첨부했지만 텍스트를 입력하지 않으면 보내기 버튼이 비활성화되는 문제가 있었다. "파일만 보내면 AI가 분석해주면 되지 않나?"라는 자연스러운 아이디어에서 출발했다.

## 핵심 내용

### 1단계: canSend 조건 확장 (성공)

```typescript
// Before
const canSend = inputValue.trim() && !isStreaming;
// After
const canSend = (inputValue.trim() || hasFiles) && !isStreaming;
```

단순해 보였지만, 실제 전송 경로가 3곳이었다:
- `use-chat-stream.ts` — 직접 전송
- `use-midas-submit.ts` — MIDAS 인터셉트 경유
- `use-chat-orchestration.ts` — Thread 관리 래퍼

**교훈: Design 단계에서 "2파일 수정"이라고 예상했지만, 전송 흐름의 모든 경유 경로를 추적하지 않으면 scope creep이 발생한다.**

### 2단계: 빈 텍스트 + 파일 전송 시 AI 응답 문제

| 시도 | 결과 |
|------|------|
| 시스템 프롬프트로 응답 형식 유도 | LLM이 매번 다르게 응답, 잘림/불필요한 말 발생 |
| 프롬프트를 더 구체적으로 (코드블록 템플릿) | 여전히 불안정 — "이해합니다. 이 이미지에는 간단한 계..." |
| API route에서 룰베이스 고정 응답 | Vercel AI SDK의 UI Message Stream Protocol 포맷 불일치 → 파싱 실패 |
| 프론트에서 `setMessages`로 직접 주입 | 동작하지만, 후속 메시지에서 `non-empty content` 에러 |
| 유저 메시지에 `"(첨부파일)"` 텍스트 삽입 | 작동하지만 해킹 느낌, 숨김 로직까지 필요 |

**교훈: LLM 프롬프팅으로 응답 형식을 "보장"할 수 없다. 확정적 동작이 필요하면 룰베이스로 가야 한다.**

### 3단계: 전제를 바꾸기로 결정

모든 시도가 새로운 문제를 낳았다. 결국 "첨부파일만 있으면 보내기 버튼 비활성화" — 원래 동작이 가장 안전하다는 결론.

**교훈: 가정 자체가 연쇄 복잡도를 만들면, 가정을 없애는 것이 최선이다.**

### 살아남은 코드: 에러 자연어 변환

파일 전송 기능은 폐기했지만, 과정에서 만든 `format-chat-error.ts`의 15개 에러 패턴 자연어 변환은 독립적으로 유용하여 유지했다.

```typescript
const FRIENDLY_ERROR_PATTERNS = [
  { pattern: /image exceeds.*maximum/i, message: "이미지가 너무 커서..." },
  { pattern: /rate.?limit|429/i, message: "요청이 너무 많아 잠시 제한..." },
  // ... 15개 패턴
];
```

## 정리

- **PDCA 전체 사이클(Plan→Design→Do→Check→Report→Revert)을 한 세션에서 경험.** 만들고 부수는 것도 학습이다.
- **Vercel AI SDK의 sendMessage는 빈 text를 허용하지만**, 대화 히스토리에 남으면 후속 API 호출에서 `non-empty content` 에러가 발생한다.
- **UI Message Stream Protocol의 포맷**을 직접 생성하려면 SDK 내부 구현을 정확히 알아야 한다. `0:` prefix 방식은 v4에서 작동하지 않을 수 있다.
- **"이 기능이 정말 필요한가?"를 먼저 물어야 한다.** 구현 난이도가 아니라, 연쇄 복잡도가 기능의 실현 가능성을 결정한다.
