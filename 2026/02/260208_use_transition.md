---
type: "content"
domain: "frontend"
category: "react"
topic: "useTransition"
updatedAt: "2026-02-08"

satisfaction:
  score: 100
  reason: "극강의 사용성을 위한 학습"

keywords:
  - "useTransition"
  - "control"
  - "accessibility"

relatedCategories:
  - "react"
  - "accessibility"
---

# UI 응답성을 위한 스레드 양보의 기술

이 블로그 초기에 동시성에 대한 학습을 잠깐 했었지만,  
기억이 하나도 나질 않아.. 결국 다시 학습하게 되었다.  
최근데 rAF와 setTimeout(fn, 0) 트릭까지 학습하다 보니, 극강의 사용성을 위해선 결국 javascript엔진, 브라우저 엔진 그리고 react 엔진이 어떻게 동작하는지 이해해야 한다는 걸 깨닫게 되었다.  

사용자 경험의 핵심은, 응답성이다.  
내가 페이지를 들어갔는데, 화면이 멈추거나 페이지가 404가 되거나 검색어 타이핑을 하는데 즉각적인 응답이 없다면 페이지를 이탈할 가능성이 극히 높아진다.  

무거운 연산 중에도 입력창이 멈추지 않게 만드는 것, 즉 메인 스레드 독점을 막기 위한 여러 기술들에 대해 본질적 차이를 다시금 연구해보려 한다.  

## 왜 양보해야 하는가?

자바스크립트는 싱글 스레드이다.  
대량의 데이터를 처리하거나 복잡한 UI를 그리는 동안 메인 스레드를 점유하면,  
브라우저는 다른 이벤트를 처리할 수 없게 된다.  
이를 해결하기 위한 노력은 아래와 같이 정리할 수 있다.  

### 메인 스레드 제어 전략 비교

| 구분 | rAF | setTimeout (0) | scheduler.yield() | useTransition |
| :--- | :--- | :--- | :--- | :--- |
| **관리 주체** | 브라우저 (Paint) | 브라우저 (Task) | 브라우저 (Scheduler) | 리액트 (Fiber) |
| **핵심 목적** | 시점 동기화 | 실행 미룸 | **명시적 양보** | **지능적 우선순위** |
| **작업 분할** | 불가 | 불가 | **수동 분할 필요** | **자동 분할 (Time Slicing)** |
| **중단 가능성** | 불가 | 불가 | 가능 (수동 제어) | **가능 (자동 취소/재개)** |
| **주요 사용처** | 애니메이션 | 비동기 로직 분리 | 일반 긴 JS 연산 | 리액트 상태 업데이트 |
| **통합 수준** | 하드웨어 밀착 | 독립적 태스크 | 브라우저 표준 | 리액트 엔진 밀착 |

이 표를 보니 제법 명확해졌는데, 사실 상 rAF와 useTransition이 어떤 차이가 있는지 혼란 스럽긴 하다.  

rAF(Timing Control)는 브라우저가 화면을 그리기 직전이라는 타이밍을 선점하는 행위이다.  애니메이션처럼 시각적인 부드러움이 최우선일 때 사용한다.  
하지만 작업을 쪼개지 못하므로, 콜백이 길어지면 주사율을 지키지 못하고 화면이 끊기게 된다.  

useTransition(Execution Control)은 실행 시간을 쪼개는 타임 슬라이싱을 수행한다.  
작업을 수행하다가 브라우저가 급한 일을 처리해야 하면 즉시 멈추고 제어권을 넘긴다.  
즉 rAF가 제시간에 실행될 수 있도록 길을 비켜주는 기반 기술에 가깝다.  

서로 상호보완적인건가?  
이전 블로그글에서 적용하려 했던 scheduler.yield() 대신 리엑트 기반이라면 useTransition을 사용해야 하는 거 같다. 실행을 제어할 수 있으니!  

useTransition은 단순히 작업을 미루는 setTimeout의 리엑트 버젼이 아니다.  
사용자가 검색어를 빠르게 입력할 때, 이전 입력에 대한 무거운 렌더링 결과가 더 이상 필요 없다면 리엑트는 이를 즉시 폐기하고 새 작업에 집중한다.  
isPending 상태를 통해 유저에게 작업이 진행 중임을 자연스럽게 알릴 수 있는 인터페이스를 제공한다.  
단순 자바스크립트 연산이 아닌, 리엑트의 컴포넌트 트리 비교(Diffing)와 커밋(Comming) 과정을 쪼개어 관리 한다.

거의 뭐, react 내부의 tanstack-query급 성능이지 않은가.  

입력 상태(query)와 결과 상태(list)를 분리하여 사용자의 타이핑 경험을 방해하지 않는 것이 핵심이다.  

예제에서 보는 것과 같이 startTransition으로 감싸진 부분은 우선순위가 낮아 진다.  
(리엑트는 모든 업데이트를 긴급한 상태로 가정함.)  

[example code sandbox 🪩](https://codesandbox.io/p/sandbox/887lll)

```ts
import { useState, useTransition } from 'react';

// 가상의 대량 데이터 (10,000개)
const bigData = Array.from({ length: 10000 }, (_, i) => `Item ${i + 1}`);

export function FilterList() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');      // 1. 긴급한 상태 (입력값)
  const [filtered, setFiltered] = useState(bigData); // 2. 전환 상태 (결과값)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // [Urgent] 입력창의 텍스트는 즉시 업데이트되어야 함
    setQuery(value);

    // [Transition] 무거운 필터링과 리렌더링은 우선순위를 낮춤
    startTransition(() => {
      const result = bigData.filter(item => item.includes(value));
      setFiltered(result);
    });
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Pretendard' }}>
      <input 
        type="text" 
        value={query} 
        onChange={handleChange} 
        placeholder="검색어를 입력하세요 (UI 차단 테스트)"
        style={{ padding: '8px', border: '1px solid #ccc', width: '100%' }}
      />

      {/* 현재 업데이트가 진행 중임을 사용자에게 시각적으로 알림 */}
      <div style={{ height: '20px', margin: '10px 0', color: '#007aff' }}>
        {isPending ? '목록을 갱신 중입니다...' : `결과: ${filtered.length}건`}
      </div>

      <ul style={{ opacity: isPending ? 0.5 : 1, transition: 'opacity 0.2s' }}>
        {filtered.slice(0, 100).map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
```
[![](https://mermaid.ink/img/pako:eNqNVF1PE0EU_Ss388KaVLJ0aWk3URNRIgn4BTxo-rLScTtJd6ZOd0UlJH4UUwRiiFarbkk1oMH4UAVJH_APdWb_g7PbXUCLwX2Y7Oyee-45987cRTTPihiZqIrveZjO40vEsrnlFCiox_JcRj3nDubxft5lHOaqyb5icZfMk4pFXbjI2YL6AVb18HXaIhRmSxxbxUH8TazYQnT_5TK1CcWgTRCV7cwgfMa1XBzCx5lTYRQnnwq0jw1FnT1_Pk5tQvB0S35YE698kJvLor0N2pA1FPPGIAWPcpvA6HjJojYG2doTP7aCF10QHV8-a_Xx_ZVjJZPbd7T0qJ6CZIkprzKljt1XpiPKVF-cCXPcDqXOVYqhfK2K3Rse5g_jqAirZMTg5G8kFYJmV-77fwJjvfJ9R9basu5Lv2bCFWKXQJt0HFwkiucv7sOK9OsgO79AfP4m2mti_bX48gS0uUlltimbT-JATItJUY8sp0O3RkYtmcwplme5RavEJYwe2XZVJ4--_9P9BCm7mOOixnHVK7tnQDbrsvHrP2owxRZAO5Z5yqL45DSkel05JNSGc-ByT_X87bJY76jOq7b_o3RD4qMvXu-A3NoYgsN6DZSrzFgFZomDYaaszq1KocnNDcUPYr8WNNqxoBPM9H50ersHIL7uiI8tONYc2ToQ-49B1pvBm5UT4g8lFpBY3RLbXeh1V4KGOvWtAy0--eLVd1XJzbp8s3ehgCB415CtLmi3CC4Xj1Emt-JIVQHJRk2s1lPQ263J5-tBY6-ABlwPHrSfvvy0_JenS9em47KBpq6wQ9zT23PXKlfx_7REtv3e947if5mkCzZ8ueqjFLI5KSIzbHQKOZg7VrhFiyFrAbkl7OACCp0ulIgaJsrdkgpSE-c2Y04Sx5lnl5KNF53peEwiM9KoIEo05uPMoy4yR_VcxIHMRfQAmfnssKGPZDMjuj6WzaeNfAo9RKahDxvpdM7Q9ayRyeZzY7mlFHoUZdWHc6O6YeSNtDGa0fW8PpZC6m6r2TvdH9bRzF76DeGLMKk?type=png)](https://mermaid.live/edit#pako:eNqNVF1PE0EU_Ss388KaVLJ0aWk3URNRIgn4BTxo-rLScTtJd6ZOd0UlJH4UUwRiiFarbkk1oMH4UAVJH_APdWb_g7PbXUCLwX2Y7Oyee-45987cRTTPihiZqIrveZjO40vEsrnlFCiox_JcRj3nDubxft5lHOaqyb5icZfMk4pFXbjI2YL6AVb18HXaIhRmSxxbxUH8TazYQnT_5TK1CcWgTRCV7cwgfMa1XBzCx5lTYRQnnwq0jw1FnT1_Pk5tQvB0S35YE698kJvLor0N2pA1FPPGIAWPcpvA6HjJojYG2doTP7aCF10QHV8-a_Xx_ZVjJZPbd7T0qJ6CZIkprzKljt1XpiPKVF-cCXPcDqXOVYqhfK2K3Rse5g_jqAirZMTg5G8kFYJmV-77fwJjvfJ9R9basu5Lv2bCFWKXQJt0HFwkiucv7sOK9OsgO79AfP4m2mti_bX48gS0uUlltimbT-JATItJUY8sp0O3RkYtmcwplme5RavEJYwe2XZVJ4--_9P9BCm7mOOixnHVK7tnQDbrsvHrP2owxRZAO5Z5yqL45DSkel05JNSGc-ByT_X87bJY76jOq7b_o3RD4qMvXu-A3NoYgsN6DZSrzFgFZomDYaaszq1KocnNDcUPYr8WNNqxoBPM9H50ersHIL7uiI8tONYc2ToQ-49B1pvBm5UT4g8lFpBY3RLbXeh1V4KGOvWtAy0--eLVd1XJzbp8s3ehgCB415CtLmi3CC4Xj1Emt-JIVQHJRk2s1lPQ263J5-tBY6-ABlwPHrSfvvy0_JenS9em47KBpq6wQ9zT23PXKlfx_7REtv3e947if5mkCzZ8ueqjFLI5KSIzbHQKOZg7VrhFiyFrAbkl7OACCp0ulIgaJsrdkgpSE-c2Y04Sx5lnl5KNF53peEwiM9KoIEo05uPMoy4yR_VcxIHMRfQAmfnssKGPZDMjuj6WzaeNfAo9RKahDxvpdM7Q9ayRyeZzY7mlFHoUZdWHc6O6YeSNtDGa0fW8PpZC6m6r2TvdH9bRzF76DeGLMKk)