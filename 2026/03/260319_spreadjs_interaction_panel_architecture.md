---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "SpreadJS + InteractionPanel AI 자동화 아키텍처 설계"
updatedAt: "2026-03-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "SpreadJS"
  - "InteractionPanel"
  - "Vercel AI SDK"
  - "tool-use"
  - "Next.js dynamic import"
  - "Jotai"
  - "framer-motion"

relatedCategories:
  - "nextjs"
  - "architecture"
  - "ai"
---

# SpreadJS와 InteractionPanel 연계 — AI 자동화를 고려한 아키텍처 설계

> 기존 placeholder였던 InteractionPanel의 Sheet 영역에 SpreadJS를 통합하되, 향후 AI 채팅으로 셀 조작을 자동화할 수 있는 구조까지 미리 설계한 과정을 정리한다.

## 배경

프로젝트의 InteractionPanel은 채팅 옆에 sticky로 붙는 패널로, "Sheet와 함께" / "3D Viewer와 함께" 두 가지 모드를 지원한다. 하지만 Sheet 모드는 아이콘과 빈 텍스트만 보여주는 placeholder 상태였다. 여기에 SpreadJS를 넣되, 단순 뷰어가 아니라 **좌측 채팅에서 AI가 tool-use로 셀을 직접 조작하는 자동화**까지 고려한 설계가 필요했다.

## 핵심 내용

### 1. 현재 InteractionPanel 아키텍처

InteractionPanel은 Jotai atom 기반으로 상태를 관리한다:

- `activeInteractionAtom` — MessageInput에서 사용자가 선택한 Interaction 타입
- `interactionPanelOpenAtom` — 패널 열림/닫힘
- `interactionContentListAtom` — AI 응답마다 쌓이는 콘텐츠 버전 배열
- `currentInteractionContentAtom` — 파생 atom, 현재 표시 중인 버전

데이터 흐름은 `PlusMenu 선택 → 메시지 전송(activeTool: "sheet") → AI 응답 완료 → useInteractionSync에서 콘텐츠 생성 → 패널 열림` 순서다. `InteractionPanelContent`가 `interactionType`에 따라 Sheet/3D Viewer 컴포넌트를 분기 렌더링한다.

### 2. SpreadJS Next.js 통합 시 SSR 문제

SpreadJS는 내부적으로 `window`/`document`에 접근하므로, `"use client"` 지시문만으로는 부족하다. Next.js의 서버 컴포넌트 렌더링 단계에서 여전히 SSR이 발생하기 때문이다.

```tsx
// InteractionWithSheet.tsx
import dynamic from "next/dynamic";
const SpreadSheetView = dynamic(() => import("./SpreadSheetView"), { ssr: false });
```

`next/dynamic({ ssr: false })`로 감싸야 `window is not defined` 에러를 회피할 수 있다. 패키지는 구 `@grapecity` 대신 `@mescius/spread-sheets` + `@mescius/spread-sheets-react`를 사용해야 한다.

### 3. AI 자동화를 위한 Workbook 인스턴스 공유 설계

핵심 설계 포인트는 **SpreadJS Workbook 인스턴스를 외부에서 접근 가능하게 노출**하는 것이다:

```
spreadWorkbookRefAtom ← Workbook 인스턴스 ref (Jotai atom)
  ↑ workbookInitialized 콜백에서 설정
  ↓ Phase 2에서 SheetCommandExecutor가 참조하여 명령 실행
```

SpreadJS의 `workbookInitialized` 콜백에서 Workbook 인스턴스를 받아 Jotai atom에 저장하면, 이후 어디서든 `commandManager().execute()`를 호출할 수 있다.

### 4. Tool-Use 브리지 패턴 (향후 AI 자동화 아키텍처)

조사한 업계 사례들(SheetCopilot, SpreadJS-AI-Agent, CopilotKit)을 종합하면, 가장 적합한 패턴은 **Vercel AI SDK tool-use → 클라이언트 브리지 → SpreadJS CommandManager**:

```
AI (Server)  →  tool_call JSON  →  Client Runtime
                                    └ SpreadJS CommandExecutor
                                      └ commandManager().execute()
                                        └ SpreadJS Workbook
```

- 서버: Zod 스키마로 `setCellValue`, `setFormula`, `addSheet`, `setArray` 등 tool 정의
- AI가 구조화된 JSON으로 tool_call 반환
- 클라이언트: `message.parts`에서 `tool-invocation` 매칭 → SpreadJS API 호출
- 실행 결과를 `tool_result`로 피드백 (closed-loop)

SheetCopilot 논문(NeurIPS 2023)의 인사이트: **세분화된 atomic action이 LLM 환각을 줄인다**. 거친 고수준 명령보다 `setValue`, `setFormula` 같은 원자적 명령이 더 정확하다.

### 5. SpreadJS 배치 성능 최적화

AI가 대량의 셀을 한번에 조작할 때는 `suspendPaint` 패턴이 필수:

```ts
spread.suspendPaint();
sheet.suspendEvent();
sheet.suspendCalcService();
try {
  sheet.setArray(0, 0, bulkData);
  sheet.setFormula(0, 5, "SUM(A1:E1)");
} finally {
  sheet.resumeCalcService(false);
  sheet.resumeEvent();
  spread.resumePaint();
}
```

`commandManager().execute()`로 실행하면 자동으로 Undo 스택에 적재되므로, 사용자가 AI의 변경을 되돌릴 수 있다.

### 6. framer-motion Variants 타입 이슈

InteractionPanel 리팩토링 중 `canvasVariants` 객체를 `motion.div`의 `variants` prop에 전달할 때 타입 에러가 발생했다. framer-motion이 `Variants` 타입을 정확히 추론하지 못하는 경우, 명시적 타입 어노테이션이 필요하다:

```ts
import { type Variants } from "framer-motion";
const canvasVariants: Variants = { ... };
```

## 정리

- SpreadJS를 Next.js에 통합할 때 SSR 우회(`dynamic + ssr: false`)는 선택이 아닌 필수
- 향후 AI 자동화를 고려하면, Phase 1에서 **Workbook 인스턴스를 Jotai atom으로 외부 노출**하는 설계를 미리 해두는 것이 핵심. 이 하나의 결정이 Phase 2 진입 시 마찰을 크게 줄인다
- AI tool-use로 스프레드시트를 조작하는 패턴은 이미 업계에서 검증됨 (SheetCopilot, SpreadJS-AI-Agent). 핵심은 **세분화된 atomic action 스키마 + CommandManager를 통한 Undo 지원 + suspendPaint 배치 최적화**
- framer-motion의 `Variants` 타입은 복잡한 transition 객체가 있을 때 추론에 실패할 수 있으므로, 명시적 타입 어노테이션을 습관화하면 좋다
