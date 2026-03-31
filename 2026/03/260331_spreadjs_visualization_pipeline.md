---
draft: true
type: "content"
domain: "frontend"
category: "spreadjs"
topic: "SpreadJS 시각화 커맨드 파이프라인 확장 (조건부 서식, 스파크라인, 차트)"
updatedAt: "2026-03-31"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "SpreadJS"
  - "ConditionalFormatting"
  - "Sparkline"
  - "Chart"
  - "TDD"
  - "vi.mock"

relatedCategories:
  - "typescript"
  - "testing"
  - "ai-tools"
---

# SpreadJS 시각화 커맨드 파이프라인 확장

> AI가 호출하는 SpreadJS SheetCommand 파이프라인에 조건부 서식, 스파크라인, 차트 도구 6종을 TDD로 추가한 과정

## 배경

AI 어시스턴트가 "철근콘크리트 보 설계 검토 시트"를 만들 때 "응력 분포도를 셀 서식으로 표현해줘"라는 요청을 처리할 도구가 없었다. 기존 14개 SheetCommand는 데이터/구조/기본 스타일만 지원하고, 조건부 서식이나 차트 같은 시각화 기능이 빠져 있었다.

추가로 AI가 생성한 데이터에 스마트 따옴표(`''""`)가 포함되어 SpreadJS `setArray()`에서 `No syntax ''' to match the syntax '''` 파싱 에러가 발생하는 버그도 함께 발견했다.

## 핵심 내용

### 1. 4-Layer Pipeline 구조

기존 SheetCommand는 깔끔한 4단계 파이프라인으로 동작한다:

```
AI Tool (zod schema) → Batcher (snake→camel 매핑) → Command Type → Executor (SpreadJS API)
```

새 도구를 추가할 때 이 4개 레이어를 모두 건드려야 한다. Option B(Clean Architecture)를 선택해서 도메인별로 파일을 분리했다:
- CF(조건부 서식 4종): `sheet-cf-tools.ts` + `sheet-cf-utils.ts`
- Sparkline: `sheet-sparkline-tools.ts` + `sheet-sparkline-utils.ts`
- Chart: `sheet-chart-tools.ts` + `sheet-chart-utils.ts`

### 2. SpreadJS 테스트에서 vi.mock 필수

SpreadJS(`@mescius/spread-sheets`)는 import 시점에 `canvas` 모듈을 요구하므로 Node/Vitest 환경에서 직접 import하면 바로 크래시한다. 기존 spread-sheet 테스트들은 SpreadJS를 import하지 않는 순수 로직 테스트였기 때문에 이 문제가 없었다.

해결: `vi.mock("@mescius/spread-sheets", () => ({...}))` 로 모듈 전체를 mock한 뒤, 테스트 대상 함수에는 mock sheet 객체를 주입한다.

```typescript
vi.mock("@mescius/spread-sheets", () => ({
  default: {
    Spread: {
      Sheets: {
        ConditionalFormatting: {
          ScaleValueType: { lowestValue: 0, highestValue: 1, ... },
          // ...
        },
      },
    },
  },
}));
```

핵심: `vi.mock`은 파일 최상단에서 호출하되, import문보다 **위에** 위치해야 한다. Vitest가 호이스팅해주긴 하지만 명시적으로 위에 두는 게 안전하다.

### 3. 스마트 따옴표 정규화

AI(LLM)가 텍스트를 생성할 때 Unicode 스마트 따옴표(`U+2018`, `U+2019`, `U+201C`, `U+201D`)를 사용하는 경우가 있다. SpreadJS의 `setArray()`가 이를 수식 구문으로 해석하려다 실패한다.

```typescript
function normalizeQuotes(val: unknown): unknown {
  if (typeof val !== "string") return val;
  return val.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
}
```

`applyRangeData`에서 `setArray()` 호출 **전에** 데이터 전체를 순회하며 정규화하는 것이 포인트. `setArray()` 이후에 하면 이미 SpreadJS 내부에서 에러가 발생한 뒤다.

### 4. SpreadJS Charts는 별도 패키지

`@mescius/spread-sheets` 코어에는 ConditionalFormats와 Sparklines가 포함되어 있지만, Charts는 `@mescius/spread-sheets-charts` 별도 패키지가 필요하다. 설치하면 `@mescius/spread-sheets-shapes`도 의존성으로 함께 들어온다.

### 5. TDD RED-GREEN-REFACTOR 흐름

각 Task마다 엄격하게 적용:
1. RED: 테스트 작성 → 실패 확인 (모듈 없음 or 매핑 없음)
2. GREEN: 최소 구현 → 테스트 통과
3. VERIFY: 전체 테스트 스위트 실행 (232 pass)

batcher 테스트가 특히 효과적이었다 — 새 매핑 6개를 테스트에 먼저 추가하면 기존 "maps all tool names" 테스트가 즉시 실패하므로, RED 상태를 자연스럽게 만들 수 있었다.

## 정리

- AI tool → SpreadJS 실행까지의 4-Layer 파이프라인 구조를 이해하면 새 도구 추가가 기계적으로 가능하다
- SpreadJS처럼 브라우저 전용 라이브러리를 테스트할 때는 `vi.mock` 전체 모듈 mock이 유일한 방법
- LLM이 생성하는 텍스트에는 Unicode 스마트 따옴표가 섞일 수 있으므로, 외부 파서에 전달하기 전 정규화가 필요하다
- PDCA 워크플로우(Plan→Design→Do→Analyze)로 진행하니 스코프가 명확하고 검증 기준이 자동으로 생긴다
