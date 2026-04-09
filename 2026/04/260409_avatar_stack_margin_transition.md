---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "아바타 스택 패턴과 margin transition으로 동적 겹침 애니메이션 구현"
updatedAt: "2026-04-09"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "avatar-stack"
  - "negative-margin"
  - "margin-transition"
  - "z-index"
  - "cubic-bezier"
  - "tailwind-css"

relatedCategories:
  - "react"
  - "animation"
  - "tailwind"
---

# 아바타 스택 패턴과 margin transition으로 동적 겹침 애니메이션

> 아이콘 칩 개수가 동적으로 변할 때, margin transition과 z-index로 SNS 아바타 스택 겹침을 자연스럽게 구현하는 방법.

## 배경

PlusMenu의 도구(웹서치, KDS 등) 활성화 상태를 ToolChipBar에 아이콘 전용 원형 칩으로 표시하는 기능을 구현했다. 2개 이하일 때는 간격을 두고, 3개 이상이면 SNS 댓글 반응처럼 겹쳐서 표시해야 했다. 문제는 2↔3개 전환 시 갑자기 확 겹치거나 벌어지면 부자연스럽다는 것.

## 핵심 내용

### 1. `-space-x`가 아닌 개별 margin으로 전환

Tailwind의 `-space-x-2`는 CSS `> * + * { margin-left: -0.5rem }`로 변환된다. 하지만 이건 클래스 토글이라 transition이 불가능하다. 대신 각 아이템에 직접 margin을 조건부로 적용하면 transition이 걸린다.

```tsx
className={cn(
  "transition-[margin] duration-(--duration-normal) ease-(--ease-claude)",
  !isFirst && (stacked ? "-ml-2" : "ml-1"),
)}
```

- `ml-1` (4px 간격) ↔ `-ml-2` (-8px 겹침) 사이를 transition
- `isFirst`로 첫 번째 아이템은 margin 제외

### 2. z-index 좌→우 내림차순

아바타 스택에서 왼쪽이 앞에 보이려면 DOM 순서와 반대로 z-index를 설정해야 한다. DOM에서 나중에 오는 요소가 기본적으로 위에 그려지기 때문.

```tsx
// 중립데이터(4) > 문서검색(3) > 웹서치(2) > KDS(1)
style={{ zIndex: tool.zIndex }}
```

### 3. ring으로 겹침 경계 표현

겹칠 때 배경색 경계가 없으면 아이콘이 합쳐져 보인다. `ring-2 ring-background`로 배경색과 동일한 테두리를 주면 개별 원이 구분된다.

```tsx
stacked && "ring-2 ring-background"
```

### 4. ease-claude — snappy 가속/급감속 커브

`ease-smooth`(ease-in-out)는 시작과 끝 모두 느려서 밋밋하다. `ease-claude`는 `cubic-bezier(0.165, 0.85, 0.45, 1)`로, 빠르게 출발해서 급감속하는 snappy 커브다. 겹침 전환처럼 짧은 거리를 이동하는 애니메이션에 적합하다.

```
ease-smooth:  ──╮          ╭──  (양쪽 느림)
               ╰──────────╯

ease-claude:  ╲                 (빠른 출발)
               ╰─────────────  (급감속 정착)
```

### 5. 조건부 렌더링 → 배열 기반 렌더링

`{flag && <Item />}` 패턴에서는 "몇 번째 아이템인가"를 알 수 없다. 활성 도구를 `useMemo`로 배열 수집한 뒤 `.map((tool, i) => ...)` 하면 index 기반으로 `isFirst`, z-index를 깔끔하게 전달할 수 있다.

```tsx
const activeTools = useMemo(() => {
  const all = [];
  if (projectData) all.push({ key: "projectData", ... });
  if (docSearch) all.push({ key: "docSearch", ... });
  // ...
  return all;
}, [projectData, docSearch, webSearch, kds, t]);
```

## 정리

- `transition-[margin]`으로 겹침/벌림을 CSS transition만으로 처리할 수 있다. JS 애니메이션 라이브러리 불필요.
- z-index + ring-background 조합이 아바타 스택의 핵심. 없으면 겹친 부분이 뭉개진다.
- easing 선택이 체감 품질을 크게 좌우한다. 짧은 거리 이동엔 snappy 커브가 linear/ease-in-out보다 훨씬 자연스럽다.
- 조건부 렌더링을 배열 수집 + map으로 바꾸면 index 기반 로직이 깔끔해진다.
