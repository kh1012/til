---
type: "content"
domain: "frontend"
category: "performance"
topic: "concurrent-feature"
updatedAt: "2025-11-30"

keywords:
  - "React18"
  - "concurrency"
  - "Lane-model"
  - "bit-operation"
  - "priority"
  - "Expiration-Time"
  - "startTransition"

relatedCategories:
  - "javascript"
  - "performance"
---

# React 18 동시성 - 레인 모델

React의 레인(Lane) 모델 구현 방식, 비트 연산을 사용한 우선순위 관리, 이벤트와 레인의 우선순위 매핑을 정리한다.  
32비트 정수로 구현된 레인 시스템이 어떻게 작업의 중요도를 관리하는지 이해할 수 있다.

> 학습 URL: https://tech.remember.co.kr/%EC%BD%94%EB%93%9C-%ED%95%9C-%EC%A4%84%EB%A1%9C-%EA%B2%BD%ED%97%98%ED%95%98%EB%8A%94-react-%EB%8F%99%EC%8B%9C%EC%84%B1%EC%9D%98-%EB%A7%88%EB%B2%95-5ff18aee148d

## 학습 진행도

- ✅ [React는 동시성을 왜 연구했을까?](/2025/01_August/250804_transition-1.md/#react는-동시성을-왜-연구-했을까)
- ✅ [블로킹](/2025/01_August/250804_transition-1.md/#블로킹)
- ✅ [디바운싱 or 스로틀링](/2025/01_August/250804_transition-1.md/#디바운싱-or-스로틀링)
- ✅ [즉각적인 반응과 지연을 예상하는 상태변화](/2025/01_August/250804_transition-1.md/#즉각적인-반응과-지연을-예상하는-상태변화)
- ✅ [레인(Lane)모델과 동시성 렌더링](#레인lane모델과-동시성-렌더링)
- ✅ [레인의 구현방식](#레인의-구현방식)
- ✅ [비트연산](#레인-모델이-비트-연산을-사용하는-이유)
- ✅ [우선순위](#이벤트와-레인의-우선순위)
- ✅ [Expiration Time 모델의 한계와 레인모델의 장점](#expiration-time-모델의-한계와-레인-모델의-장점)
- 🚧 [레인모델이 동시성을 지원하는 방식]()
- 🚧 [만료시간 관리]()
- 🚧 [얽힘(Entanglement) 메커니즘]()
- 🚧 [useDeferredValue와 useTransition]()

## 레인(Lane)모델과 동시성 렌더링

- 2020년 구현
- Expiration Time 모델의 한계 해결을 위해 설계
  > ### Expiration Time 모델?
  >
  > - JWT 기반, 세션을 토큰으로 저장 시, 만료 시간 설정을 통해 보안 유지 (일정 시간 후 재인증 필요)
  > - 쿠키/로컬스토리지에서의 수동 만료시간 관리. (만료 후, 쿠키(4KB)는 자동삭제 가능, 로컬 스토리지(5-10MB)는 체크 필요,)
- React의 각 업데이트는 서로 다른 `차선`에 배치.
- 추월 차선과 저속 주행 차선으로 구분한다는 게 핵심 개념.
- 레인은 업데이트와 우선순위를 표시하는 것. 어떤 작업이 얼마나 중요한지를 나타냄.
- 이 우선순위를 통해 어떤 업데이트를 먼저 처리할지, 잠시 미룰지 결정할 수 있음.

## 레인의 구현방식

- 레인은 32비트 정수로 구현.
- 각 비트는 하나의 `차선`
- 낮은 비트 (우측) 일수록 우선순위 높음
- 실제 구현 부 ([react-reconciler/src/ReactFiberLane.new.js](https://github.com/facebook/react/blob/9e3b772b8cabbd8cadc7522ebe3dde3279e79d9e/packages/react-reconciler/src/ReactFiberLane.new.js#L34-L71%3E))
- 각 `차선`이 비트로 정의되어 있음.

```ts
const TotalLanes = 31;

const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000010000;

const TransitionHydrationLane: Lane = /*         */ 0b0000000000000000000000000100000;
const TransitionLanes: Lanes = /*                */ 0b0000000001111111111111111000000;
const TransitionLane1: Lane = /*                 */ 0b0000000000000000000000001000000;

const RetryLanes: Lanes = /*                     */ 0b0000111110000000000000000000000;
const RetryLane1: Lane = /*                      */ 0b0000000010000000000000000000000;

const IdleHydrationLane: Lane = /*               */ 0b0010000000000000000000000000000;
const IdleLane: Lane = /*                        */ 0b0100000000000000000000000000000;

const OffscreenLane: Lane = /*                   */ 0b1000000000000000000000000000000;
```

## 레인 모델이 비트 연산을 사용하는 이유

- 비트연산은 메모리 효율이 뛰어나다. 복잡한 UI 업데이트 상황에서도 메모리 사용량을 최소화할 수 있음.
- 컴퓨터 아키텍처의 가장 기본 수준에서 직접 처리 되기에 CPU 효율성 극대화
- ms 단위의 성능이 중요한 상호작용에서는 큰 이점이 됨.

## 이벤트와 레인의 우선순위

- 하나의 이벤트는 하나의 레인에 대응.
- 비트로 표현하는 수가 작을 수록 (오른쪽) 우선순위가 높음.

| 레인 종류                    | 비트 표헌           | 심진수 값 | 우선순위        | 대상 이벤트/업데이트              | 특징                                                    | 예시                                                                           |
| ---------------------------- | ------------------- | --------- | --------------- | --------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------ |
| SyncLane                     | 0b...001            | 1         | 최상위          | 이산적인 이벤트 (DiscreteEvent)   | 사용자의 개별적인 물리적 행동에 대한 즉각적인 응답 필요 | 클릭, 키보드 입력, 마우스 다운, 폼 제출, flushSync로 감싼 setState             |
| InputContinuousHydrationLane | 0b...010            | 2         | 최상위 이후     | 하이드리션 관련 연속 입력         | 서버 사이트 렌더링된 연속 입력을 위한 이드레이션        | SSR된 슬라이더, 드래그 영역의 초기화                                           |
| InputContinuousLane          | 0b...100            | 4         | 높음            | 연속적인 이벤트 (ContinuousEvent) | 일련의 흐름으로 발생하며 부드러운 사용자 경험 필요      | 드래그, 스크롤, 마우스 이동, 휠, 슬라이더 조작                                 |
| DefaultHydrationLane         | 0b...1000           | 8         | 중간 상위       | 기본 하이드리션                   | 서버 사이트 렌더링된 일반 컴포넌트의 하이드레이션       | SSR된 일반 UI 요소의 초기화                                                    |
| DefaultLane                  | 0b...10000          | 16        | 중간            | React 외부 이벤트                 | 사용자 상호작용보다는 낮지만 처리에 경험 필요           | setTimeout, Promise, 네트워크 요청 응답, 일반 작업 이벤트 핸들러 내의 setState |
| TransitionHydrationLane      | 0b...100000         | 32        | 중간 하위       | 전환 하이드리션                   | 전환 관련 SSR 컴포넌터의 하이드레이션                   | 페이지 전환 시 SSR 콘텐츠 초기화                                               |
| TransitionLanes              | 0b...1111...1000000 | ~16.7M    | 낮음            | 개발자 정의 전환                  | 백그라운드에서 처리되어 사용자 경험 방해 최소화         | startTransition, useTransition(), useDeferredValue()                           |
| RetryLanes                   | 0b...1111...0000000 | ~31.5M    | 특수(중간)      | Suspense 관련                     | 실패한 렌더링 재시도 처리                               | Suspense 경계에서의 실패 복구, 데이터 로딩 재시도                              |
| IdleHydrationLane            | 0b0010...0          | 536.9M    | 매우 낮음       | 유휴 하이드리션                   | 브라우저 유휴 상태에서 처리되는 하이드리션              | 화면 밖 SSR 콘텐츠 초기화                                                      |
| IdleLane                     | 0b0100...0          | 1.07B     | 매우 낮음       | 우선순위가 낮은 작업              | 브라우저 유휴 상태에서만 처리                           | 사용자 상호작용이 없을 때 백그라운드 작업, e.g., 메트릭 수정                   |
| OffscreenLane                | 0b1000...0          | 2.15B     | 특수(매우 낮음) | 화면 바깥 컴포넌트                | 보이지 않는 UI 요소에 대한 처리                         | 숨겨진 탭, 접힌 아코디언 메뉴 컴포넌트, React.lazy 사전로딩                    |

- 사용자 경험에 기반한 레인 분류
- 버튼 클릭과 같은 직접적 사용자 입력은 가장 높은 우선순위임.
- 반면 대량의 데이터 필터링과 같은 무거운 작업은 낮은 우선순위로 처리됨.
- 이전에 이야기 했던 `반응`과 `상태변화`.

## 세가지 우선순위 시스템

- React는 Lane, 이벤트, 스케줄러라는 3가지의 서로 연결된 시스템을 통해 작업 중요도를 관리함.
- Lane 우선순위: 업데이트의 중요도를 나타냄.
- 이벤트 우선순위: 사용자 이벤트의 중요도를 나타냄.
- 스케줄러 우선순위: 스케줄러에서 작업 예약 시 사용되는 우선순위임.
- 위 3가지 우선순위 시스템은 서로 연결되어 있으며, Lane 우선순위를 이벤트 우선순위로 변환하고 다시 스케줄러 우선순위로 매핑하여 작업을 처리함.
- 먼저 이벤트 우선순위는 특정 레인 값에 매핑 됨.
https://github.com/facebook/react/blob/f9d78089c6ec8dce3a11cdf135d6d27b7a8dc1c5/packages/react-reconciler/src/ReactEventPriorities.js#L24C1-L28C58
```ts
export const NoEventPriority: EventPriority = NoLane;
export const DiscreteEventPriority: EventPriority = SyncLane;
export const ContinuousEventPriority: EventPriority = InputContinuousLane;
export const DefaultEventPriority: EventPriority = DefaultLane;
export const IdleEventPriority: EventPriority = IdleLane;
```
- 레인에서 이벤트 우선순위로의 변환은 lanesToEventPriority 함수를 통해 이루어짐.
https://github.com/facebook/react/blob/707b3fc6b2d7db1aaea6545e06672873e70685d5/packages/react-reconciler/src/ReactEventPriorities.js#L55-L67
```ts
export function lanesToEventPriority(lanes: Lanes): EventPriority {
  const lane = getHighestPriorityLane(lanes);
  if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
    return DiscreteEventPriority;
  }
  if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
    return ContinuousEventPriority;
  }
  if (includesNonIdleWork(lane)) {
    return DefaultEventPriority;
  }
  return IdleEventPriority;
}
```
- lanesToEventPriority 함수는 lanes 집합에서 가장 높은 우선순위를 찾아 해당하는 이벤트 우선순위로 매핑!
- IdleWork이 포함되어 있지 않다면, DefaultEventPriority로 매핑 됨. (TransitionLane)
- 이는 UI 전환 작업이 사용자 직접 입력 보다는 낮지만 백그라운드 작업보다는 높은 우선순위로 처리되어야 함을 시사함.
- 사용자 직접 입력 >>> UI 전환 >>> 백그라운드 작업 순.
- 우선순위 체계는 다양한 작업의 중요도를 효과적으로 관리, 사용자 경험을 최적화 하면서도 시스템 성능을 유지할 수 있게함.
- 키보드 입력, 클릭과 같은 사용자 상호작용은 높은 우선순위 (즉각적인 반응성 보장)
- 페이지 전환과 같은 작업은 중간 우선순위
- 데이터 프리페칭과 같은 작업은 낮은 우선순위

- 특정 업데이트를 낮은 우선순위로 전환하는 `startTransition` API를 사용하는 이벤트 핸들러!
```ts
function handleSearch(e) {
  // 이벤트 핸들러는 DefaultEventPriority로 실행됨
  setSearchQuery(e.target.value); // 즉시 업데이트 (SyncLane)
  
  startTransition(() => {
    // 이 안의 상태 업데이트는 TransitionLane으로 처리됨
    setSearchResults(searchData(e.target.value)); // 지연된 업데이트
  });
}
```

- startTransition 내부의 상태 업데이트에는 TransitionLane이 할당 됨. (상태 업데이트 낮은 우선순위로 배치)
- 하지만 이벤트 핸들러 자체는 DefaultEventPriority로 처리 됨. (이벤트 핸들러 우선순위 Default, 높은 수준 즉각적인 반응)
- 결국 실행은 바로 되는데, 상태 업데이트 및 렌더링 우선순위는 낮음.
- 이 두 우선순위(이벤트 핸들러와 상태 업데이트) 시스템의 분리는 이벤트 처리와 렌더링을 더 세밀하게 제어할 수 있게 해줌.
- React가 마치 멀티스레드 환경처럼, 동작하면서도 사용자 경험을 우선시할 수 있는 이유임.

## Expiration Time 모델의 한계와 레인 모델의 장점
- 레인 모델 이전에는 Expiration Time 모델을 사용 했음.
- 해당 모델에서는 각 업데이트에 시간 기반의 만료시간을 할당하여 작업 우선순위와 배치 처리를 모두 결정함.
- Expiration Time에서는 각 작업에 만료 시간을 할당하고, 이 값에 기반해 우선순위와 배치 처리를 결정함.
- 만료 시간은 우선순위에 영향을 미치고, 이 값이 낮은 우선순위를 갖게 되면 다른 작업이 먼저 처리될 수 있음.
- 예를 들어, 높은 우선순위를 가진 CPU Bound 작업(버튼 클릭)와 낮은 우선순위를 가진 IO Bound 작업(데이터 패칭)이 있을 경우,
- setTimeout을 통해 데이터 패칭을 강제로 지연시키면, 버튼 클릭과 동시에 지속해서 UI가 업데이트 되어야 하는 상황에도,
- 여러번 클릭하게 되면 그 만큼 데이터 페칭이 계속 실행되어 UI 업데이트가 지연되는 우선순위 역전의 상황이 발생 됨.
```ts
import React, { useState, useEffect } from 'react';

function App() {
  const [buttonColor, setButtonColor] = useState("blue");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  // CPU Bound 작업 (UI 렌더링)
  const handleButtonClick = async () => {
    console.log("UI 렌더링 시작");
    await fetchData();
    setButtonColor("green");  // 즉시 UI 변경
    console.log("UI 렌더링 끝");
  };

  // I/O Bound 작업 (데이터 패칭)
  const fetchData = async () => {
    setLoading(true);
    console.log("데이터 패칭 시작");
    
    // 네트워크 요청을 시뮬레이션하기 위해 지연 발생 (3초)
    await new Promise(resolve => setTimeout(resolve, 3000));  // 3초 대기
    
    setData("서버에서 받은 데이터");
    setLoading(false);
    console.log("데이터 패칭 끝");
  };

  return (
    <div>
      <button onClick={handleButtonClick} style={{ backgroundColor: buttonColor }}>
        버튼 클릭
      </button>

      {loading ? <p>데이터를 불러오는 중...</p> : <p>{data}</p>}
    </div>
  );
}

export default App;
```
- 작위적이긴 하지만 렌더링 블로킹을 강제해서 페칭이 끝나야만, UI가 업데이트 될 수 있도록 만든 코드임.
- 우선순위에 대한 조작을 개발자가 직접 제어할 수 없었던 것에 비해, 레인모델은 32비트 정수와 비트 연산을 활용하여 더 세밀한 우선순위 제어를 가능하게 함.
- 각 업데이트는 고유한 레인에 할당이 되고, 이를 통해 서로다른 유형의 작업을 독립적으로 스케줄링 할 수 있음.