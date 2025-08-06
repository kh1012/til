# 동시성 (React 18)

> 학습 URL: https://tech.remember.co.kr/%EC%BD%94%EB%93%9C-%ED%95%9C-%EC%A4%84%EB%A1%9C-%EA%B2%BD%ED%97%98%ED%95%98%EB%8A%94-react-%EB%8F%99%EC%8B%9C%EC%84%B1%EC%9D%98-%EB%A7%88%EB%B2%95-5ff18aee148d

## 학습 진행도

- ✅ [React는 동시성을 왜 연구했을까?](/2025/01_August/250804_transition-1.md/#react는-동시성을-왜-연구-했을까)
- ✅ [블로킹](/2025/01_August/250804_transition-1.md/#블로킹)
- ✅ [디바운싱 or 스로틀링](/2025/01_August/250804_transition-1.md/#디바운싱-or-스로틀링)
- ✅ [즉각적인 반응과 지연을 예상하는 상태변화](/2025/01_August/250804_transition-1.md/#즉각적인-반응과-지연을-예상하는-상태변화)
- ✅ [레인(Lane)모델과 동시성 렌더링](/2025/01_August/250805_transition-2.md/#레인lane모델과-동시성-렌더링)
- ✅ [레인의 구현방식](/2025/01_August/250805_transition-2.md/#레인의-구현방식)
- ✅ [비트연산](/2025/01_August/250805_transition-2.md/#레인-모델이-비트-연산을-사용하는-이유)
- ✅ [우선순위](/2025/01_August/250805_transition-2.md/#이벤트와-레인의-우선순위)
- ✅ [Expiration Time 모델의 한계와 레인모델의 장점](/2025/01_August/250805_transition-2.md/#expiration-time-모델의-한계와-레인-모델의-장점)
- ✅ [레인모델이 동시성을 지원하는 방식](#레인-모델이-동시성을-지원하는-방식)
- 🚧 [만료시간 관리]()
- 🚧 [얽힘(Entanglement) 메커니즘]()
- 🚧 [useDeferredValue와 useTransition]()

## 레인 모델이 동시성을 지원하는 방식

- 레인 모델의 핵심 기능 중 하나는 현재 렌더링 중인 작업보다 더 높은 우선순위의 업데이트가 발생했을 때, 이전 렌더링을 중단하고 새 업데이트를 처리할 수 있는 능력.
  https://github.com/facebook/react/blob/39cad7afc43fcbca1fd2e3a0d5b7706c8b237793/packages/react-reconciler/src/ReactFiberLane.js#L226-L342

```ts
export function getNextLanes(
  root: FiberRoot,
  wipLanes: Lanes,
  rootHasPendingCommit: boolean
): Lanes {
  // 보류 중인 작업이 없으면 일찍 반환
  const pendingLanes = root.pendingLanes;
  if (pendingLanes === NoLanes) {
    return NoLanes;
  }

  // ... 중략 ...

  // 이미 렌더링 중이라면, 새 레인이 더 높은 우선순위인 경우에만 전환
  if (wipLanes !== NoLanes && wipLanes !== nextLanes) {
    const nextLane = getHighestPriorityLane(nextLanes);
    const wipLane = getHighestPriorityLane(wipLanes);
    if (
      // nextLane이 wipLane보다 우선순위가 같거나 낮은지 확인
      nextLane >= wipLane ||
      // 기본 우선순위 업데이트는 전환 업데이트를 중단해서는 안 됨
      (nextLane === DefaultLane && (wipLane & TransitionLanes) !== NoLanes)
    ) {
      // 기존 진행 중인 작업을 계속 진행. 중단하지 않음.
      return wipLanes;
    }
  }

  // ... 중략 ...

  return nextLanes;
}
```

- getnextLanes는 현재 진행 중인 렌더링(wipLanes)보다 우선순위가 높은 업데이트가 있는지 확인함.
- 만약 더 높은 우선순위의 업데이트가 발생하면 현재 렌더링을 중단하고 새로운 업데이트를 처리함.
- 중단 가능한 렌더링의 핵심 메커니즘.
- wip : work in progress
- pendingLanes 현재 큐에 등록된 모든 Lane들
