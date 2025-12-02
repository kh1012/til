---
type: "content"
domain: "frontend"
category: "performance"
topic: "concurrent-feature"
updatedAt: "2025-11-30"

satisfaction:
  score: 85
  reason: "레인 모델 심화, 얽힘 메커니즘, useDeferredValue/useTransition 비교까지 체계적으로 정리"

keywords:
  - "React18"
  - "concurrency"
  - "Lane-model"
  - "useDeferredValue"
  - "useTransition"
  - "entanglement"
  - "expiration-time"

relatedCategories:
  - "javascript"
  - "performance"
---

# React 18 동시성 - 심화

레인 모델이 동시성을 지원하는 방식, 만료시간 관리, 얽힘(Entanglement) 메커니즘을 정리한다.  
useDeferredValue와 useTransition API의 차이점과 사용 시점을 이해하면 복잡한 UI 업데이트를 효율적으로 처리할 수 있다.

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
- ✅ [만료시간 관리](#만료시간-관리)
- ✅ [얽힘(Entanglement) 메커니즘](#얽힘-메커니즘)
- ✅ [useDeferredValue와 useTransition](#usedeferredvalue-x-usetransition)

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
- '중단 가능한 렌더링'의 핵심 메커니즘

## 만료시간 관리

- Fiber 내부적으로 업데이트가 너무 오래 지연되는 것을 방지하기 위해 만료시간을 관리함.
- 사용자 상호작용 관련 레인은 250ms 후에 만료, 기본 전환 레인은 5000ms에 만료.

## 얽힘 메커니즘

- 얽힘(Entanglement)은 관련된 혹은 의존적인 업데이트들이 함께 처리되도록 보장함.
- 얽힘의 핵심 속성은 전이적 속성, 한 레인이 다른 레인과 얽히면 그와 관련된 모든 레인이 자동으로 서로 얽히게 되는 특성을 의미.
- 조금이라도 연관이 있다면, 한번에 업데이트를 하여 불완전한 데이터를 렌더링하지 못하게 원천차단 함.
- 예를 들어, 얽혀있는 실 중 하나를 당기면 모두가 따라오듯.
- startTransition 콜백 파라미터에 포함된 업데이트는 모두 하나의 묶음으로 간주.

## useDeferredValue X useTransition

- React18에 추가된 두 API
- 복잡하거나 무거운 UI 업데이트를 처리할 때 애플리케이션의 응답성을 유지하는 데 도움.

### useDeferredValue

https://5xhdgv.csb.app/

- 값의 '지연된 버전'을 생성하여 무거운 계산 작업은 브라우저가 여유 있을 때 처리하도록 함.
- input과 그 input에 따른 결과 리스트가 있을 때, 결과 리스트 출력 데이터가 굉장히 많고 느린 경우에 input query 상태 업데이트를 일부러 지연시켜,
- 백그라운드에서 브라우저가 유후상태 일 때, 실행되도록 처리하면 input query는 deferredQuery를 통해 즉각적인 반응을 수행하고,
- 실제 query 업데이트에 따른 값 업데이트는 일괄로 수행되면서 사용자 경험이 좋아짐.

https://ko.react.dev/reference/react/useDeferredValue#deferring-re-rendering-for-a-part-of-the-ui

```ts
function App() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <SlowList text={deferredQuery}>
    </>
  )
}
```

### useTransition

- useDeferredValue가 값에 초점을 맞춘다면, useTransition은 상태 업데이트 자체에 초점을 맞춤.
- 이 API는 특정 상태 업데이트를 명시적으로 낮은 우선순위로 표시.
- startTransition의 역할은 '이 상태 업데이트는 TransitionLane에 배치 해주세요'라고 지시하는 것.

### 두 API 비교

- useDeferredValue는 특정 값의 업데이트를 지연시켜, 해당 값에 의존하는 렌더링 작업을 TransitionLane에 배치 함. (상태를 지연시킴) - Single?
- useTransition은 상태 업데이트를 명시적으로 TransitionLane에 배치하여 지연 처리함. (상태 자체를 묶어서 지연시켜버림) - Bundle?
- 동일한 레인 모델을 기반으로 작동하지만, 사용 목적에 따라 취사 선택.
- 단일 값의 지연처리가 필요하면 useDeferredValue가 간편
- 복잡한 상태 업데이트를 관리하려면 useTransition이 적합.
