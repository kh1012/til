---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "SpreadJS를 Next.js 16 + React 19에 통합할 때 발생하는 이슈와 해결법"
updatedAt: "2026-03-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "spreadjs"
  - "next/dynamic"
  - "ssr:false"
  - "ai-sdk-v6"
  - "tool-use"
  - "flex-overflow"

relatedCategories:
  - "react"
  - "typescript"
  - "ai"
---

# SpreadJS + Next.js 16 통합 시 주요 이슈와 해결법

> SpreadJS(상용 스프레드시트 라이브러리)를 Next.js 16 + React 19 환경에 통합하면서 만난 SSR, 번들, 사이징, AI SDK 호환성 이슈 정리.

## 배경

InteractionPanel에 SpreadJS를 마운트하고, MOCK_UP 모드에서 AI tool-use로 셀을 조작하는 기능을 구현했다. Next.js 16(App Router) + React 19.2.3 + Vercel AI SDK v6 환경에서 여러 함정을 만났다.

## 핵심 내용

### 1. SSR 우회 — `next/dynamic` + `ssr: false` 필수

SpreadJS는 `window`/`document`를 직접 참조하므로 SSR에서 크래시한다. `"use client"`만으로는 부족하다.

```tsx
// InteractionWithSheet.tsx
const loadSpreadSheetView = () =>
  import("@/features/spread-sheet").then((mod) => mod.SpreadSheetView);

const SpreadSheetView = dynamic(loadSpreadSheetView, {
  ssr: false,
  loading: () => <SpreadSheetSkeleton />,
});
```

- 모듈 레벨에서 `dynamic()` 호출 (컴포넌트 내부 X)
- `ssr: false` 필수 — 없으면 `ReferenceError: window is not defined`

### 2. AI SDK v6에서 `tool()` 시그니처 변경

AI SDK v6(ai@^6.0.99)에서 `tool()` 함수의 프로퍼티명이 변경되었다.

```tsx
// v5 (이전)
tool({ description: "...", parameters: z.object({...}) })

// v6 (현재)
tool({ description: "...", inputSchema: z.object({...}) })
```

`parameters`를 사용하면 `No overload matches this call` 에러. `inputSchema`로 변경해야 한다.

### 3. SpreadJS `sheet.clear()` — 6개 인자 필요

```tsx
// 틀림 — 4개 인자
sheet.clear(startRow, startCol, rowCount, colCount);

// 맞음 — SheetArea + StorageType 필수
sheet.clear(
  startRow, startCol, rowCount, colCount,
  GC.Spread.Sheets.SheetArea.viewport,
  GC.Spread.Sheets.StorageType.data,
);
```

TypeScript 타입 정의에서 4개 인자 오버로드가 없으므로 컴파일 에러로 잡힌다.

### 4. Flex 컨테이너에서 SpreadJS 사이즈 오버플로우

SpreadJS에 `hostStyle={{ width: "100%", height: "100%" }}`를 설정해도, flex 레이아웃에서 부모의 고정 높이가 없으면 자체 콘텐츠 크기로 팽창하여 UI가 깨진다.

**해결: `absolute inset-0` 패턴**

```tsx
<div ref={containerRef} className="relative flex-1 w-full min-h-0 min-w-0">
  <div className="absolute inset-0">
    <SpreadSheets hostStyle={{ width: "100%", height: "100%" }}>
      <Worksheet />
    </SpreadSheets>
  </div>
</div>
```

- `relative` + `absolute inset-0`으로 SpreadJS를 부모의 실제 크기에 가둔다
- `min-h-0 min-w-0`은 flex 자식의 기본 `min-width: auto` 문제 방지
- `height: 100%`가 absolute 포지셔닝된 부모 기준으로 계산되므로 넘치지 않는다

### 5. ResizeObserver + framer-motion 애니메이션 충돌

InteractionPanel이 framer-motion `flexGrow` 애니메이션(300ms)으로 너비가 변동된다. ResizeObserver 콜백이 매 프레임 발화되면 `workbook.refresh()`가 과다 호출된다.

```tsx
const observer = new ResizeObserver(() => {
  if (rafRef.current !== null) return; // throttle
  rafRef.current = requestAnimationFrame(() => {
    rafRef.current = null;
    workbookRef.current?.refresh();
  });
});
```

`requestAnimationFrame` 기반 throttle로 프레임당 최대 1회만 refresh.

### 6. execute 없는 Tool 정의 (프론트엔드 실행 패턴)

AI SDK에서 `execute` 함수 없이 tool을 정의하면, AI가 tool_use로 응답할 때 서버에서 실행하지 않고 tool parts를 클라이언트에 스트리밍한다. 클라이언트에서 `args`를 읽어 직접 실행하는 패턴.

```tsx
// 서버: execute 없음
set_range: tool({
  description: "Set a 2D array of data",
  inputSchema: z.object({ startRow: z.number(), startCol: z.number(), data: z.array(...) }),
  // execute 없음!
})

// 클라이언트: tool parts에서 args를 읽어 SpreadJS에 직접 적용
for (const part of msg.parts) {
  if (part.toolName && part.state === "input-available") {
    const command = { type: TOOL_TO_COMMAND[part.toolName], ...part.args };
    executeSheetCommands(workbook, [command]);
  }
}
```

SpreadJS처럼 브라우저 전용 라이브러리를 AI가 조작해야 할 때 유용한 패턴이다.

## 정리

- SpreadJS + Next.js는 `next/dynamic` + `ssr: false`가 필수. CSS도 dynamic import 내부에서 import하면 SSR에서 로드되지 않아 안전
- AI SDK v6의 `tool()` 시그니처가 `parameters` → `inputSchema`로 변경됨. 마이그레이션 가이드에 명시 안 되어 있어서 빠지기 쉬운 함정
- Flex 레이아웃에서 100% 높이 문제는 `absolute inset-0` 패턴이 가장 확실
- execute 없는 tool 정의로 서버→클라이언트 tool args 전달 패턴은 브라우저 전용 라이브러리 조작 시 핵심 아키텍처
