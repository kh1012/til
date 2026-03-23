---
draft: true
type: "content"
domain: "frontend"
category: "data-visualization"
topic: "CellGraph 시각화의 사용자 가치 재설계 — 전체 그래프에서 질문 기반 Trace로"
updatedAt: "2026-03-23"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "force-directed-graph"
  - "react-force-graph-2d"
  - "spreadsheet"
  - "cell-reference"
  - "trace-mode"
  - "user-value"

relatedCategories:
  - "react"
  - "ux"
  - "architecture"
---

# CellGraph 시각화의 사용자 가치 재설계

> "전체를 다 보여주자"를 버리고 "사용자의 질문에 답하자"로 전환해야 한다.

## 배경

SpreadJS 워크시트의 셀 참조 관계를 force-directed 그래프로 시각화하는 CellGraph 기능을 구현했다. react-force-graph-2d로 옵시디언 스타일 그래프를 만들었는데, 실무 시트에서 테스트해보니 **노드가 수백~수천 개가 되어 시각적으로 무의미한 "헤어볼(hairball)"** 이 되었다.

## 핵심 내용

### 문제: 개별 셀 1:1 노드 전개의 한계

| 노드 수 | 시각적 상태 | 판정 |
|---------|-----------|------|
| ~50 | 개별 셀 식별 가능 | 유용 |
| 150~300 | 줌인 필수, 전체 구조 파악 어려움 | 경계 |
| 300+ | 스파게티 — 시각적 정보 밀도 0 | **무의미** |

구조 엔지니어링 실무 시트는 `SUM(A1:A200)` 같은 범위 참조가 빈번하여 거의 확실히 300+ 노드를 초과한다. `expandRange` 함수가 범위를 개별 셀로 전개하는 것이 근본 원인.

### Excel Trace와의 비교 — 차별화 부재

| Excel Trace | 전체 그래프 |
|------------|-----------|
| 시트 위 화살표 → 위치 맥락 유지 | 별도 탭 → 위치 맥락 상실 |
| 클릭 한 번으로 단계별 확장 | 전체를 한꺼번에 → 정보 과부하 |

### 해결: 질문 기반 시각화로 전환

사용자가 실제로 원하는 것은 "전체 그래프"가 아니라 **"내 질문에 대한 답"**이다.

**Trace 모드 (ROI 최고)**: 선택 셀의 precedent/dependent chain만 하이라이트. 항상 5~30 노드로 실용적.

```
사용자 흐름:
1. 셀 클릭 (D15)
2. Trace 모드 ON
3. D15의 precedent chain (D15 ← C10 ← B5 ← A1) +
   dependent chain (D15 → E20 → F25) 만 표시
4. 나머지 노드는 opacity 0.08로 극도 페이드
```

**시트 간 관계 그래프 (Excel 차별화)**: 시트 단위 노드 3~20개. Excel의 cross-sheet trace는 "Sheet2의 어딘가"만 가리키고 정확한 목적지가 보이지 않아 실패한 기능. 별도 뷰에서 시트 간 관계를 보여주는 것이 유일한 차별화 포인트.

### 구현 아키텍처

Worker 경계가 자연스러운 변경 분리선:
- Worker(토폴로지 구축) → **변경 없음**
- use-cell-graph.ts(후처리) → adjacency list + BFS로 trace chain 추출
- CellGraphVisualization.tsx(렌더링) → trace/hover 하이라이트 공존

## 정리

- 시각화는 "기술적으로 가능한가"보다 **"사용자에게 가치를 주는가"**가 중요하다
- force-directed 그래프는 소규모(~50 노드)에서만 유효하고, 대규모에서는 계층형 레이아웃이나 Trace 모드가 필수
- "전체를 보여주는 뷰"와 "질문에 답하는 뷰"는 근본적으로 다른 설계 철학
- Excel이 이미 시도하고 실패한 접근(스프레드시트 오버레이)을 반복하지 말 것
