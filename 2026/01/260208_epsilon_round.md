---
type: "content"
domain: "frontend"
category: "javascript"
topic: "epsilon"
updatedAt: "2026-02-08"

satisfaction:
  score: 100
  reason: "부동소수점과 epsilon의 관계에 대한 명확한 이해"

keywords:
  - "epsilon"
  - "round"
  - "float"

relatedCategories:
  - "javascript"
---

# 부동소수점의 배신 (feat IEEE 754)

자바스크립트는 숫자를 64비트 부동 소수점 (IEEE 754 표준)으로 표현한다.  
이로 인해 발생하는 문제점들이 있다.  

## 0.1 + 0.2 !== 0.3

```ts
console.log(0.1 + 0.2); // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3); // false
```

10진수를 바라보고 있는 개발자 입장에서는 0.3으로 보이지만,  
컴퓨터는 0.30000000000000004로 저장한다.  
이로 인해 논리 오류가 발생하게 된다.

만약 반올림하는 함수를 구현한다고 해보자.  
기본적으로 Math.round를 사용하면 된다.

```ts
function round(num: number) {
  return Math.round(num * 1e8) / 1e8;
}
```

위 코드는 대 부분의 경우에는 잘 동작한다.  
하지만 0.5를 반올림하는 경우에는 문제가 발생한다.  

```ts
console.log(round(0.5)); // 0
```

이유는 간단하다.  
0.5가 0.49999999999999994로 저장되기 때문이다.  
논리적 관점으로 보자면, 0.4니까 버려지는게 맞다.

그럼 이걸 개발자가 제어할 순 없는걸까?  
이 관점에서 epsilon이 등장한다.  
Number.EPSILON은 부동소수점 사이의 가장 작은 단위의 차이이다.  
결국, 이 보정치를 더하면 0.5를 0.49999999999999994가 아닌 0.5000000000000001로 만들 수 있다.  
상상할 수 있는 논리적 결과를 얻을 수 있는 보조 장치인 셈이다.  

# 최종 safeRound 구현

```ts
/**
 * 왜 우리는 보정 함수를 만들어 써야 할까?
 * 1) 하드웨어 (CPU)는 속도를 위해 2진수 연산을 선택했고, 그 대가는 '미세한 오차'이다.
 * 2) 이 오차는 반올림이라는 '판단'을 내릴 때 치명적이므로, 시스템 최소 단위인 EPSILON을 가져와 판단 직전에 밀어올리는 전략을 취해야 한다.
 */
function safeRound(value: number, exp: number): number {
  if (typeof value !== 'number' || isNaN(value)) return '0';
  const multiplier = Math.pow(10, exp); //1e{exp}
  return Math.round(value * multiplier + Number.EPSILON) / multiplier;
}
```

근데 왜 IEEE 754는 40년 간 그 자리를 이어오고 있을까?
하드웨어 가속과, 메모리 효율성을 위해 IEEE 754는 40년 간 그 자리를 이어오고 있다.
또한 이전에 C++을 할떄에도 부동 소수점과 관련한 예외처리를 하느라 골머리를 앓았던 기억을 되짚어 보면, 그 만큼 범용적인 표준이라는 이야기가 된다.  
결국 대부분의 언어가 채택하고 있는 표준을 변경하기에는 사이드 이펙트를 처리할 수 있는 용기가 없었던 것 같다. 그리고 그 만큼의 에너지를 사용하는게 분명 쉽지 않았을 것 이라 생각 된다.  
C#이나 Java의 경우 Decimal이라는 자료형을 사용하여 금융권 데이터들을 아주 잘 보정하고 있고, 실질적으로 js에도 Big.js나 Decimal.js와 같은 라이브러리들이 존재한다.  

이러한 한계를 인지하고, 사용하는 것과 당연하게 받아들이는 것의 차이는 분명 존재한다고 생각한다.  
다음에 또 부동소수점을 만난다면, safeRound와 라이브러리를 비교해가면서 분석 데이터를 정리해보는 것도 재미있을거 같다.  

```ts
import Big from 'big.js';

// 0.1 + 0.2 연산 (JS 기본은 0.30000000000000004)
const result = new Big(0.1).plus(0.2); 
console.log(result.toString()); // "0.3" (정확함)

// 8자리 반올림
const rounded = new Big(1.005).toFixed(8);
```

크으 멋지다.




