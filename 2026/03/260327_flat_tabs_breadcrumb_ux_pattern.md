---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "PopoverMenu를 Flat Tabs로 리팩토링 + Breadcrumb 셀 참조 + Atom 파생 badge"
updatedAt: "2026-03-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "flat-tabs"
  - "breadcrumb"
  - "jotai"
  - "atom-derived-ui"
  - "popover-to-tabs"
  - "150-line-limit"

relatedCategories:
  - "typescript"
  - "tailwindcss"
  - "ux"
---

# PopoverMenu를 Flat Tabs로 전환 + Breadcrumb 셀 참조 + Atom 파생 Badge

> 드롭다운에 숨긴 기능을 동일 레벨 탭으로 노출하고, Jotai atom에서 파생한 카운트를 badge로 표시하는 패턴

## 배경

SpreadJS 인터랙션 헤더에 "추가 기능" PopoverMenu가 있었는데, 사용자가 기능의 존재를 인지하기 어려웠다. "스프레드시트" 버튼은 항상 보이는데 "셀 추적", "시트 관계"는 드롭다운 뒤에 숨겨져 있어 UX 비대칭 발생. 셀 참조도 `Sheet1!A1:B5` plain text라 선택 피드백이 약했다.

## 핵심 내용

### 1. PopoverMenu → Flat Tabs

```
Before: [스프레드시트] | [추가 기능 ▼]  ← 클릭해야 옵션 보임
After:  [스프레드시트] | [셀 추적 [14]] | [시트 관계 [3]]  ← 모두 노출
```

- 동일한 `Button variant="transparent" size="xs" shape="soft"` 재사용
- 활성/비활성은 `tabClass()` 헬퍼로 `text-foreground font-semibold` / `text-muted-foreground` 분기
- 재선택 시 toggle(스프레드시트 복귀) 로직은 `resetToSpreadsheet()` 공통 함수로 추출
- `PopoverMenu`, `ChevronDown`, `Check`, `cn` import 일괄 제거 → 코드 감소

**핵심 판단**: 2개뿐인 옵션을 드롭다운에 넣을 이유가 없었다. 옵션 수가 적으면 Flat Tabs가 발견성 면에서 항상 유리.

### 2. Breadcrumb 셀 참조

```tsx
const breadcrumb = useMemo(() => {
  if (!cellRef) return null;
  const raw = cellRef.replace(/^#/, "");
  const idx = raw.indexOf("!");
  if (idx === -1) return { sheet: raw, cell: null };
  return { sheet: raw.slice(0, idx), cell: raw.slice(idx + 1) };
}, [cellRef]);
```

렌더링:
```
Sheet1 › A1:B5
[muted]   [foreground font-mono font-medium]
```

- `!` 기준 split으로 시트명/셀주소 분리 → 각각 다른 스타일 적용
- `›` 구분자로 계층 표현 (`text-muted-foreground/50`)
- `AnimatePresence` flip 애니메이션 유지 (key를 cellRef로)
- `text-step-n2`는 부모 `motion.span`에서 상속

### 3. Jotai atom 파생 → UI Badge

```tsx
const traceResult = useAtomValue(cellTraceResultAtom);
const sheetRelation = useAtomValue(sheetRelationCacheAtom);

const traceNodeCount = traceResult?.traceNodes.length ?? 0;
const sheetNodeCount = sheetRelation?.nodes.length ?? 0;
```

- 이미 export된 atom을 `useAtomValue`로 읽기만 하면 됨 — 추가 로직 불필요
- Worker가 셀 선택 변경 시 자동 재계산 → atom 갱신 → badge 자동 업데이트
- `CountBadge`: count가 0이면 렌더링 안 함, 0 이상이면 `motion.span`으로 scale 애니메이션 등장
- 데이터는 해당 탭을 한번이라도 활성화한 후에만 존재 (lazy computation)

### 4. 150줄 제한 내 기능 추가 전략

badge 추가로 156줄이 되어 150줄 제한 초과. 해결:

1. **불필요 래퍼 제거**: `handleSpreadsheetClick`이 `resetToSpreadsheet()`만 호출 → `onClick={resetToSpreadsheet}` 직접 전달 (-3줄)
2. **CountBadge 압축**: `motion.span` props를 한 줄로 합치고 닫는 태그 인라인 (-4줄)
3. **최종 148줄** — 여유 2줄 확보

## 정리

- **발견성(discoverability)**: 옵션이 3개 이하면 드롭다운보다 Flat Tabs가 거의 항상 우월. 클릭 한번 줄어드는 것 이상으로, "이런 기능이 있구나"를 인지시키는 효과가 크다.
- **Atom 파생 UI**: Jotai의 강점 — 이미 존재하는 atom에서 `useAtomValue`로 읽어 badge를 만드는데 새로운 atom이나 hook이 필요 없었다. 데이터 흐름이 단방향이라 부작용도 없다.
- **줄 수 제한 준수**: 기능 추가 시 먼저 "제거할 것"을 찾는 습관. 래퍼 함수, 중간 변수, 불필요 import 등이 대상.
- **PDCA 사이클**: Plan → Do → Analyze(92%) → Iterate(i18n 추가) → Report(100%) 흐름으로 구조적으로 빠뜨린 부분(i18n)을 잡아냈다.
