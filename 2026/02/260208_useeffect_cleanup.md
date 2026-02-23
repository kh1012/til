---
type: "content"
domain: "frontend"
category: "react"
topic: "cleanup"
updatedAt: "2026-02-08"

satisfaction:
  score: 100
  reason: "useEffect의 cleanup 함수가 왜 실행되는지에 대한 명확한 이해"

keywords:
  - "useEffect"
  - "cleanup"
  - "react"

relatedCategories:
  - "react"
---

# useEffect Cleanup이 과거를 기억하는 법

컴포넌트가 리렌더링 되거나 언마운트 될 때, 이전 렌더링 시점의 변수를 기억하고 있는 Clean up 함수가 실행 된다.  
보통 착각하고 있는게, 언마운트 시점에 메모리 정리를 위해서 cleanup 함수가 실행된다고 생각하는데,  
그게 아니라 리렌더링 시점에도 실행된다.  
매번 다른 주소 값을 바라보고 있는 상태로 실행이 된다.

> cleanup 함수는 새로 만들어진 상태가 아니라, 자신이 생성된 시점의 스코프를 참조한다.  

```ts
// React Component Scope
useEffect(() => {
  // Setup (Render N)
  let isCancelled = false; 
  console.log(`[Render ${id}] Effect Start`);

  return () => {
    // Cleanup (Render N)
    // 다음 렌더링(Render N+1)이 일어나도, 이 함수는 
    // 여전히 Render N 시점의 isCancelled 메모리 주소를 보고 있음.
    isCancelled = true; 
    console.log(`[Render ${id}] Cleanup Executed`);
  };
}, [id]);
```  

그럼 이러한 동작은 어디서 부터 시작했을까?  
리엑트 엔진 자체적으로 처리하는 걸까, 아니면 내가 알고 있는 클로져 개념과 비슷한 걸까?  
다시금 클로저를 복기 해봐야겠단 생각이 들었다.  

## Closure

과거의 변수를 기억할 수 있는 메커니즘이 바로 클로저이다.  
간단히 정의해보면 함수와 함수 주변의 렉시컬 환경(Lexical Environment)의 결합체이다.  

```ts
function outer() {
  let count = 0; // 1. 렉시컬 환경에 포함된 변수

  function inner() {
    // 2. inner 함수는 outer의 렉시컬 환경을 기억한다.
    count++;
    console.log(count);
  }

  return inner;
}

const closureFunc = outer(); // outer 실행 종료, count 변수는 사라져야 함.

closureFunc(); // 1 (사라지지 않고 기억됨)
closureFunc(); // 2 (여전히 같은 count를 참조)
```  

위 코드에서 `inner` 함수는 `outer` 함수가 실행되고 반환된 후에도,  
자신이 생성될 당시의 `count` 변수를 계속 기억하고 있다.  
이것이 바로 클로저의 핵심이다.  

```ts
// Vanilla JS Simulation
function createEffect(renderId) {
  let isCancelled = false; // Local Variable (Environment Record)

  // 이 함수(Cleanup)가 외부로 반환되어 나중에 호출되더라도
  // 상위 스코프의 isCancelled에 접근 가능함 (Closure)
  return function cleanup() {
    isCancelled = true;
    console.log(`Render ${renderId} cancelled: ${isCancelled}`);
  };
}

const cleanupFunc = createEffect(1);
cleanupFunc(); // "Render 1 cancelled: true"
```

AbortController의 동작 방식도 이와 유사하다.  

근데 클로저 이야기를 하다보면, 은닉화, 캡슐화 등등 이전에 OOP를 익히며 익히 들었던 다양한 이야기들이 나온다.  
결국 이것들도 함수형 프로그래밍의 관점에서 보면 다 같은 이야기 아닌가 싶다.  
자바스크립트 자체도 언어가 발전하면서 자연스럽게 클로저 대신 class의 private 필드 문법을 도입하기도 했고. 자연스럽게 클로저는 점차 개발자가 직접 다루기보다 언어 내부의 동작 원리로 숨겨진 개념이 되어 가는 듯 하다.  

서두에 말한 것 처럼, 클로저는 함수 + 환경의 조합이다.  
그럼 여기서 말하는 환경은 무엇일까?

## Lexical Environment

렉시컬 환경은 함수가 선언된 시점의 스코프를 말한다.  
간단히 말해, 함수가 생성될 때 주변에 어떤 변수들이 있었는지에 대한 정보이다.  
즉, 클로저가 실제로 데이터를 보관하는 논리적 공간을 말한다.  

구조는 크게 2가지이다.  
1) Environment Record: 현재 스코프의 변수와 함수 정보
2) Outer Environment Reference: 외부 스코프 참조

함수가 호출될 때마다 새로운 렉시컬 환경이 생성된다.  
이 렉시컬 환경은 함수가 종료되어도 사라지지 않고,  
클로저에 의해 참조되는 동안 계속 유지된다.  
더 깊이 들어갔다간 다른 거 학습 못할 거 같아. 다음에 또 내용이 나오면 더 깊게 파보자. 

또 자바스크립트 관점에서 환경과 아주 밀접하게 연관된 개념이 하나 더 있다. 실행 컨텍스트이다.

## Execution Context

이전에 말했던 모든 것이 돌아가는 거대한 환경.  

생명 주기:
1) Creation Phase: 환경 레코드 생성, 변수와 함수 선언, this 바인딩 (이 시점에 렉시컬 환경에 컴포넌트 생성)
2) Execution Phase: 코드 실행, 변수 할당, 함수 호출
3) Cleanup Phase: 함수 종료, 렉시컬 환경 소멸

React와 연결:
- 컴포넌트 함수 호출: 실행 컨텍스트 생성
- 리렌더링: 새로운 실행 컨텍스트 생성 (이전 컨텍스트와는 완전히 별개의 샌드박스)
- Cleanup: 이전 실행 컨텍스트의 렉시컬 환경을 참조하여 실행
- 상태 유지: 컨텍스트는 사라지지만, 클로저에 의해 참조되는 렉시컬 환경은 유지됨

렉시컬 환경은 함수 실행을 위한 환경이고, 클로저는 렉시컬 환경을 참조하는 함수이다.  
그리고 실행 컨텍스트는 렉시컬 환경을 생성하는 함수이다.  
이 세가지 개념이 서로 얽혀서 돌아가는 구조이다.  
두번정도 보니, 조금의 감은 잡힌 듯 하다. 역시 반복만이 살길인가!  

그리고 마지막으로, 도식화 하면서 마무리해보자.  

[![](https://mermaid.ink/img/pako:eNqdkjFv2kAUgP_K6bIaE2NT8AkhBZOtY6fWGQw-glX7zjLn1ilCIhJLm0aKVBpRCSKGpF0yuIFIHZI_ZB__oXdOSDNGfbe8p3vf997whrBLXQwRPIycsA_etG0CROy9a3SamgosHzskDhvlTrPRicpNvljz5QTky6_56TT_dcwXM7BZTPnyGPDlPPudHoBSqQlaEq9InA7iCD_h2epO9BTQj1l2c88XwpV-F2g5-5Py89uDh_GtwmJJi66C1zjxuo4P9skHL6IkwIQ9GfNToVtvJmmWjsUKY35xlZ_NAT-5FFKQX9_lP6_ldtnqNksnj3qr0Lel3lDBfoK7MfMoARYlDCf_5Px-mn-bF-aTy8355_xsln-ZijETfrMG2Xos5ECk2UqaH9wDduRjsAd6nu-jnV4RyoBF9D1GO7quP-alj57L-qgSJs-x1haryvdizPo_rP3yJaEiDsRzIWJRjBUY4ChwZAmHUmhD1scBtiESqYt7TuwzG9pkJLDQIW8pDbZkROPD_raIQ9dhuO054vhER8_xB7IFExdHFo0Jg6huFAqIhjCBSDN31bqmm4Zh7lZ0vVavK_AIIsNQa4ZpvqqYtVq1WtO0kQI_FUNFu_x5FqO_8jchXw?type=png)](https://mermaid.live/edit#pako:eNqdkjFv2kAUgP_K6bIaE2NT8AkhBZOtY6fWGQw-glX7zjLn1ilCIhJLm0aKVBpRCSKGpF0yuIFIHZI_ZB__oXdOSDNGfbe8p3vf997whrBLXQwRPIycsA_etG0CROy9a3SamgosHzskDhvlTrPRicpNvljz5QTky6_56TT_dcwXM7BZTPnyGPDlPPudHoBSqQlaEq9InA7iCD_h2epO9BTQj1l2c88XwpV-F2g5-5Py89uDh_GtwmJJi66C1zjxuo4P9skHL6IkwIQ9GfNToVtvJmmWjsUKY35xlZ_NAT-5FFKQX9_lP6_ldtnqNksnj3qr0Lel3lDBfoK7MfMoARYlDCf_5Px-mn-bF-aTy8355_xsln-ZijETfrMG2Xos5ECk2UqaH9wDduRjsAd6nu-jnV4RyoBF9D1GO7quP-alj57L-qgSJs-x1haryvdizPo_rP3yJaEiDsRzIWJRjBUY4ChwZAmHUmhD1scBtiESqYt7TuwzG9pkJLDQIW8pDbZkROPD_raIQ9dhuO054vhER8_xB7IFExdHFo0Jg6huFAqIhjCBSDN31bqmm4Zh7lZ0vVavK_AIIsNQa4ZpvqqYtVq1WtO0kQI_FUNFu_x5FqO_8jchXw)