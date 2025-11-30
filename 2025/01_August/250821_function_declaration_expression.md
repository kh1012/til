---
type: "skill"
domain: "frontend"
category: "javascript"
topic: "function-declaration-expression"
updatedAt: "2025-11-30"

keywords:
  - "function-declaration"
  - "function-expression"
  - "hoisting"
  - "closure"
  - "callback"

relatedCategories:
  - "typescript"
---

# 함수 선언과 함수 표현식의 차이

## Function Declaration (함수 선언)
```ts
function summation(a: number, b: number): number {
  return a + b;
}
```
- 가독성 좋음.
- 호이스팅 됨. (코드 선언 전에 함수가 메모리에 올라감) 

## Function Expression (함수 표현식)
```ts
const do = function (a: number, b: number):number {
  return a + b;
}
```
- 변수 자체의 호이스팅만 가능. 하지만 해당 라인을 읽기전까지는 undefined인 상태라 사용 불가 (안정성 측면)
- 보통, 클로저 & 콜백으로 많이 쓰임. (은닉)