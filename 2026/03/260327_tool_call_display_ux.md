---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "AI 도구 호출 표시 UX — i18n 문장형 전환 + 연속 동일 호출 축약"
updatedAt: "2026-03-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "tool-call-indicator"
  - "i18n"
  - "ux-pattern"
  - "consecutive-collapse"
  - "ai-sdk"

relatedCategories:
  - "ux"
  - "i18n"
  - "ai-sdk"
---

# AI 도구 호출 표시 UX — i18n 문장형 전환 + 연속 동일 호출 축약

> AI가 도구를 호출할 때 raw name 대신 문장형 라벨을 보여주고, 같은 도구가 반복되면 `×N`으로 축약하는 패턴

## 배경

Vercel AI SDK의 tool-call 파트를 타임라인으로 렌더링할 때, `set_range`, `insert_rows` 같은 raw tool name이 그대로 노출되면 비개발자 사용자에게 의미 전달이 안 된다. 특히 스프레드시트 조작처럼 같은 도구가 10번 이상 연속 호출되는 케이스에서는 동일한 줄이 반복되어 UX가 매끄럽지 않다.

## 핵심 내용

### 1. i18n fallback 패턴으로 tool name 문장화

```tsx
const toolKey = `tool.${toolName}` as Parameters<typeof t>[0];
const translated = t(toolKey);
const label = translated !== toolKey ? translated : toolName;
```

- `tool.{toolName}` 키가 i18n에 있으면 번역된 라벨 사용
- 없으면 raw name을 fallback으로 그대로 표시 (새 도구 추가 시 깨지지 않음)
- 4개 언어 파일(ko/en/ja/zh)에 동일 키 구조로 관리

### 2. 연속 동일 도구 축약 (collapseConsecutiveTools)

```ts
type CollapsedTool = ToolPartData & { count: number };

function collapseConsecutiveTools(tools: ToolPartData[]): CollapsedTool[] {
  const result: CollapsedTool[] = [];
  for (const tool of tools) {
    const last = result[result.length - 1];
    if (last && last.toolName === tool.toolName && last.phase === tool.phase) {
      last.count += 1;
      // 최신 상태와 출력을 유지
      last.state = tool.state;
      last.output = tool.output;
    } else {
      result.push({ ...tool, count: 1 });
    }
  }
  return result;
}
```

- **연속(consecutive)** 조건: toolName과 phase가 동일한 인접 항목만 합침
- 최신 state/output을 유지해서 진행 상황이 정확히 반영됨
- `ToolCallIndicator`에 `count` prop을 추가하여 `×N` suffix 렌더링

### 3. 적용 위치

축약 로직은 **렌더링 시점**에만 적용하고, 데이터 모델(`chunk-parts.ts`의 `chunkParts`)은 건드리지 않았다. `ToolCallGroup`과 `ToolStepSection` 두 곳에서 `tools` 배열을 map하기 직전에 `collapseConsecutiveTools()`를 호출하는 방식.

데이터와 표현을 분리해서, 개별 도구의 output을 확인해야 하는 디버깅 용도에는 원본 데이터가 그대로 남아 있다.

## 정리

- i18n fallback 패턴은 도구뿐 아니라 에러 코드, 상태 표시 등 동적 키에도 범용 적용 가능
- 축약은 "연속 동일"만 합치는 게 핵심 — 전체 그룹에서 같은 이름을 합치면 실행 순서가 사라져서 맥락을 잃는다
- 렌더링 레이어에서만 축약하고 데이터 모델은 유지하는 것이 확장에 유리
