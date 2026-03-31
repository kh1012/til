---
draft: true
type: "content"
domain: "frontend"
category: "mathjs"
topic: "mathjs AST 노드 타입은 문서와 다를 수 있다 — 실제 파싱 결과를 확인하라"
updatedAt: "2026-03-31"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "mathjs"
  - "AST"
  - "KaTeX"
  - "LaTeX"
  - "TDD"
  - "Clean Architecture"

relatedCategories:
  - "typescript"
  - "react"
  - "testing"
---

# mathjs AST 노드 타입은 문서와 다를 수 있다

> 설계 시 가정한 노드 타입과 실제 파싱 결과가 다를 수 있으므로, 구현 전 `parse()` 결과를 직접 확인해야 한다.

## 배경

CalcPad에 mathjs LaTeX 렌더링을 확장하면서(비교연산자, 행렬, 단위변환 등), Design 문서에서 가정한 노드 타입이 실제와 달라 구현 방식이 바뀌는 경험을 했다.

## 핵심 내용

### 1. RelationalNode는 존재하지만 거의 사용되지 않는다

Design에서 `a >= b`가 `RelationalNode`로 파싱될 것으로 가정했으나, 실제로는 `OperatorNode`로 파싱된다.

```javascript
parse("a >= b")
// → OperatorNode { op: ">=", fn: "largerEq", args: [SymbolNode, SymbolNode] }
// RelationalNode가 아님!
```

`RelationalNode`는 `a < b < c` 같은 체인 비교에서만 생성된다. 단일 비교는 모두 `OperatorNode`.

### 2. MatrixNode가 아니라 ArrayNode

`[1, 2; 3, 4]`가 `MatrixNode`로 파싱될 것으로 가정했으나, 실제로는 `ArrayNode`다.

```javascript
parse("[1, 2; 3, 4]")  // → ArrayNode (items: [ArrayNode, ArrayNode])
parse("matrix([1,2])")  // → FunctionNode (fn: "matrix", args: [ArrayNode])
```

`matrix()` 함수 래핑은 `FunctionNode`로 감싸진 `ArrayNode`다.

### 3. evaluate 결과의 typeOf도 다르다

```javascript
typeOf(evaluate("[1, 2; 3, 4]"))  // → "DenseMatrix" (not "Matrix")
```

`typeOf`가 `"Matrix"`가 아니라 `"DenseMatrix"`를 반환한다. 분기 조건에 정확한 타입명을 사용해야 한다.

### 4. TDD가 이런 불일치를 안전하게 잡아준다

RED 단계에서 실패 테스트를 먼저 작성하고, `node -e` 로 실제 AST 구조를 확인한 후 GREEN 구현에 들어가니:
- 잘못된 가정이 테스트 실패로 즉시 드러남
- 실제 구조 확인 후 정확한 구현 가능
- Design 문서와 다르더라도 안전하게 진행

### 5. Clean Architecture 리팩터링은 S0에서 선행

기존 170줄 `math-to-katex.ts`를 핸들러 분리 없이 4개 핸들러를 추가하면 300줄+이 된다. 리팩터링을 먼저 하되:
- 기존 테스트 124개가 모두 통과하는 상태에서 파일 분리만 수행
- 신규 기능은 분리 완료 후 추가
- 이렇게 하면 회귀 위험 0으로 구조 변경 가능

## 정리

- mathjs AST 노드 타입을 설계에서 가정하지 말고, `parse()` + `node -e`로 실제 확인 후 구현
- `typeOf()` 반환값도 예상과 다를 수 있다 (`DenseMatrix` vs `Matrix`)
- TDD의 RED 단계가 이런 가정 불일치를 자연스럽게 검출해준다
- 대규모 리팩터링은 기능 추가와 분리하여 S0 단계로 선행하면 안전하다
