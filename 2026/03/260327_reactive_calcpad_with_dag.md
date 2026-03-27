---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "DAG 기반 리액티브 계산 문서 에디터 구현"
updatedAt: "2026-03-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "codemirror-6"
  - "mathjs"
  - "katex"
  - "dag"
  - "topological-sort"
  - "reactive-evaluation"
  - "calcpad"

relatedCategories:
  - "react"
  - "typescript"
  - "nextjs"
---

# DAG 기반 리액티브 계산 문서 에디터 구현

> CodeMirror 6 + math.js + KaTeX로 변수 변경 시 의존 수식이 자동 재계산되는 CalcPad를 구현하면서 배운 것들

## 배경

MAXYS(AI 구조공학 어시스턴트)에서 AI가 생성한 계산서를 사용자가 직접 조작할 수 있는 인터랙션이 필요했다. 기존 engineering-tools는 고정 폼 + "Calculate" 버튼 방식이라 유연성이 부족했고, Calcpad/Soulver/Observable 같은 "문서 = 계산기" 패러다임을 참고하여 CalcPad를 설계했다.

## 핵심 내용

### 1. 리액티브 평가 엔진의 핵심: 의존성 DAG

변수 간 의존성을 **DAG(Directed Acyclic Graph)** 로 모델링하고, **Kahn's Algorithm**으로 위상 정렬하면 평가 순서가 자동으로 결정된다.

```
P(50kN) ──→ M(=P*L/4) ──→ σ(=M/S)
L(6.0m) ──↗              ↗
S(500cm³) ───────────────╯
```

- 각 줄을 파싱하여 `name`과 `dependencies` 추출
- in-degree가 0인 노드부터 큐에 넣고 BFS
- 방문되지 않은 노드 = 순환 참조 → `CIRCULAR_REFERENCE` 에러

**의외로 간단했던 점**: Kahn's algorithm 자체는 ~30줄이면 충분. 복잡한 건 math.js의 단위 시스템과 AST 처리.

### 2. math.js 단위 파싱의 함정

`50 kN`을 math.js가 파싱하면 `kN`이 **SymbolNode**로 나타난다. 즉 의존성 추출 시 `kN`이 "변수"로 잡힌다.

```
parse("50 kN") → OperatorNode(ConstantNode(50), SymbolNode("kN"))
```

처음에는 "undefined variable" 사전 체크로 구현했는데, 단위까지 스코프에서 찾으려 해서 에러가 났다. 해결: **사전 체크를 제거하고 math.js `evaluate()`에 위임** — math.js가 단위를 알아서 처리하고, 진짜 에러만 catch하는 방식이 더 견고하다.

### 3. CodeMirror 6 Decoration API

에디터 줄 끝에 계산 결과를 표시하는 핵심:

- `WidgetType` 상속 → `toDOM()`에서 KaTeX `renderToString()` 호출
- `ViewPlugin.fromClass()`로 doc 변경 시 decoration 재구축
- `GutterMarker`로 에러/경고 아이콘 표시

KaTeX를 동적 import하여 번들 사이즈 최적화:
```typescript
let katexModule: typeof import("katex") | null = null;
import("katex").then((mod) => { katexModule = mod; });
```

### 4. 150줄 제한이 만든 좋은 구조

ESLint `max-lines: 150` 규칙 때문에 eval-engine에서 re-export를 분리하고, CalcPadResult에서 CalcPadResultLine을 분리하게 됐다. **강제 제한이 관심사 분리를 자연스럽게 유도**한다.

### 5. Record<InteractionType, ...>의 타입 안전성

`InteractionType`에 `"calcpad"`을 추가하자, `Record<InteractionType, ReactNode>`를 사용하는 3개 파일에서 즉시 컴파일 에러 발생. **union type + Record 패턴은 새 타입 추가 시 누락 없는 통합을 보장**한다.

### 6. AI Tool Call 연동 패턴

```typescript
tool({
  inputSchema: z.object({
    title: z.string(),
    lines: z.array(z.discriminatedUnion("type", [...])),
  }),
  execute: async (input) => ({ success: true, data: input }),
})
```

Tool Call → raw text 변환 → evaluateDocument()로 즉시 평가. 서버는 입력 검증만 하고, 실제 렌더링은 클라이언트에서 수행하는 패턴이 sheet-tools와 동일하다.

## 정리

- **DAG + 위상 정렬**은 리액티브 시스템의 핵심이고, 구현 난이도는 낮지만 설계 효과는 크다
- math.js의 단위 시스템은 강력하지만, AST 수준에서는 단위가 일반 심볼과 구분되지 않으므로 **평가를 위임하는 방식**이 안전하다
- CodeMirror 6의 Decoration API는 인라인 위젯 구현에 매우 적합하며, `@uiw/react-codemirror`로 React 통합이 간편하다
- PDCA 전체 사이클(Plan→Design→Do→Check→Act→Report→Archive)을 한 세션에서 완주 — 100% match rate 달성
