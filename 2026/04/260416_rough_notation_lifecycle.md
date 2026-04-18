---
draft: true
type: "content"
domain: "frontend"
category: "animation"
topic: "rough-notation 애니메이션의 lifecycle 전환 설계"
updatedAt: "2026-04-16"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "rough-notation"
  - "animation-lifecycle"
  - "react-useEffect-cleanup"
  - "AnimatePresence"
  - "streaming-indicator"

relatedCategories:
  - "react"
  - "framer-motion"
  - "ux"
---

# rough-notation 애니메이션의 lifecycle 전환 설계

> 외부 라이브러리가 제어하는 애니메이션에 React lifecycle 전환을 매끄럽게 붙이는 건, 생각보다 까다롭다.

## 배경

AI 스트리밍 인디케이터에 rough-notation의 highlight 루프를 사용하고 있었다. 스트리밍이 끝나면 애니메이션이 그냥 "뚝" 사라지는 게 어색해서, 완료 후 상태 전환(Done + underline + fade out)을 추가하려 했다.

간단할 줄 알았다. phase prop 하나 추가하고 조건 분기하면 되지 않을까? 실제로는 3번의 시도가 필요했다.

## 핵심 내용

### 1차 시도: 즉시 전환 — "뚝 끊김"

phase가 바뀌면 텍스트, annotation, shimmer를 동시에 교체했다. 결과: highlight SVG가 즉시 `remove()`되면서 시각적 빈 틈 발생. 사용자 피드백은 "전환의 느낌이 전혀 안 산다."

### 2차 시도: fade-out 후 교체 — "여전히 뚝"

텍스트를 opacity 0으로 fade out → 안 보이는 시점에 annotation 교체 → fade in. CSS transition으로 부드러워질 줄 알았지만, 문제는 highlight 루프가 중간에 끊기는 것. 애니메이션이 draw 중이든 visible 중이든, phase가 바뀌는 순간 타이머가 clear되면서 highlight가 갑자기 사라졌다.

### 3차 시도: pendingComplete 플래그 — "동작 안 함"

loop 안에서 사이클 끝 지점에 플래그를 체크하는 방식. 아이디어는 좋았지만 **React useEffect cleanup이 함정**이었다. phase가 바뀌면 이전 effect의 cleanup이 먼저 실행되어 타이머를 모두 제거한다. 플래그를 세워도 체크할 loop이 이미 죽어 있다.

```
useEffect cleanup 실행 순서:
1. 이전 effect의 return () => { clearTimeout(timer); } 실행 — loop 죽음
2. 새 effect 실행 — pendingComplete = true 설정
3. 하지만 loop은 이미 없음 — 플래그를 아무도 안 읽음
```

### 결론: 미리보기 페이지로 방향 전환

결국 "매끄러운 전환"의 정답은 코드 레벨에서 반복 시도하는 것보다, 여러 변형을 나란히 놓고 눈으로 보고 판단하는 게 더 효율적이었다. 4가지 변형(Original, Waiting, Ink Dry, Minimal)을 preview 페이지에 나열하고 실시간 비교할 수 있게 만들었다.

### rough-notation의 특성

rough-notation은 DOM에 SVG를 직접 append하고, `show()`/`hide()`/`remove()`로 제어한다. React의 선언적 모델과 충돌하는 지점들:

- `remove()`는 즉시 SVG를 DOM에서 제거. fade-out 같은 건 없음
- `hide()`는 비동기 애니메이션이지만 완료 콜백이 없음
- annotation 인스턴스는 ref로 관리해야 하고, React 렌더 사이클과 동기화가 어려움

## 정리

- 외부 라이브러리의 명령형 API(show/hide/remove)와 React의 선언적 lifecycle은 근본적으로 충돌한다. 이 간극을 메우려면 ref + timer + flag 조합이 필요한데, useEffect cleanup이 timer를 먼저 죽이는 문제를 항상 고려해야 한다.
- 애니메이션 전환 같은 감각적 판단이 필요한 작업은, 코드로 "정답"을 찾으려 하기보다 변형을 나열하고 눈으로 비교하는 게 빠르다.
- 때로는 가장 단순한 구현(즉시 전환)이 복잡한 시도보다 나을 수 있다. 전환을 "매끄럽게" 만들려는 시도가 오히려 타이밍 버그를 만들 수 있다.
