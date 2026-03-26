---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "채팅 버블 가로폭 제어와 런타임 에러 디버깅"
updatedAt: "2026-03-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "max-width"
  - "chat-bubble"
  - "SpreadJS"
  - "formula-validation"
  - "fetch-404"
  - "timing-issue"

relatedCategories:
  - "css"
  - "nextjs"
  - "debugging"
---

# 채팅 버블 가로폭 제어와 런타임 에러 디버깅

> 어시스턴트 메시지 버블의 max-width 분리, 수식 블랙리스트 디버깅, fetch 404 타이밍 이슈 대응

## 배경

AI 구조공학 어시스턴트 UI에서 세 가지 이슈를 연달아 수정했다. 어시스턴트 응답 버블이 우측 마진으로 좁게 보이는 문제, SpreadJS 수식 차단 에러의 원인 불명, 시트 완성 후 스레드 제목 PATCH 404 에러.

## 핵심 내용

### 1. 어시스턴트 메시지 버블 — max-width 분리

유저/어시스턴트 모두에게 `max-w-(--message-bubble-max-width)` (80%)가 공통 적용되어 어시스턴트 메시지가 우측 20%를 비워두고 있었다.

**수정**: 조건 분기로 유저 메시지만 max-width를 유지하고, 어시스턴트는 `w-full`로 변경.

```tsx
// Before: 공통 적용
"max-w-(--message-bubble-max-width) wrap-break-word"

// After: 역할별 분기
isUser
  ? "max-w-(--message-bubble-max-width) rounded-full ..."
  : "w-full text-foreground"
```

**교훈**: 채팅 UI에서 유저 버블과 어시스턴트 버블의 레이아웃 전략은 근본적으로 다르다. 유저는 말풍선 형태로 max-width 제한이 자연스럽지만, 어시스턴트는 마크다운/코드블록 등 넓은 콘텐츠를 담으므로 전체 폭을 쓰는 게 맞다.

### 2. SpreadJS 수식 블랙리스트 — 에러 메시지에 원본 수식 포함

`isValidFormula()` 블랙리스트 검증에서 "suspicious function"이라고만 표시되어 어떤 수식이 차단됐는지 알 수 없었다.

```ts
// Before
errors.push(`Blocked formula at row ${f.row}, col ${f.col}: suspicious function`);

// After — 원본 수식 포함
errors.push(`Blocked formula at row ${f.row}, col ${f.col}: suspicious function — ${f.formula}`);
```

**교훈**: 보안 검증 로직의 에러 메시지에는 차단된 입력값을 포함해야 디버깅이 가능하다. 프로덕션에서는 로그 레벨로 제어하되, 개발 중에는 원본을 반드시 남겨야 한다.

### 3. fetch 404 — Core API 타이밍 이슈

시트 작업 완료 후 `generateTitle`이 호출되면서 `PATCH /api/threads/:id`가 404를 받았다. 프론트 API 라우트(`[threadId]/route.ts`)에 PATCH 핸들러는 존재하지만, Core API에 해당 conversation이 아직 생성되지 않은 상태였다.

**핵심**: 브라우저 DevTools의 빨간 fetch 에러는 JS `console.error`가 아니라 **브라우저 자체가 표시**하는 것이라 코드로 숨길 수 없다. `try/catch`나 응답 체크로는 DevTools 네트워크 에러 출력을 제거할 수 없다.

**대응**: 프론트에서 404 응답을 조용히 무시하도록 처리. 근본 해결은 Core API에서 conversation auto-create 지원 또는 호출 순서 보장이 필요.

## 정리

- 채팅 버블 레이아웃: 유저와 어시스턴트는 별도 스타일 전략이 필요 (공통 max-width 지양)
- 보안 검증 에러 로그: 차단 원인을 특정할 수 있도록 입력값을 항상 포함
- 브라우저 fetch 에러: JS로 제어 불가능한 DevTools 출력이 있으며, 타이밍 이슈는 프론트 단독으로 완전히 해결하기 어려움
