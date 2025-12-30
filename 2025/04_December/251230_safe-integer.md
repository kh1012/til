---
type: skill
domain: frontend
category: javascript
topic: number-safe-integer
updatedAt: 2025-12-30

satisfaction:
  score: 88
  reason: 정수 연산이 언제 조용히 깨지는지 기준을 명확히 인식했다.

keywords:
  - Number
  - isSafeInteger
  - safe-integer
  - IEEE-754
  - precision
  - BigInt

relatedCategories:
  - typescript
  - troubleshoot
---

# Number.isSafeInteger

JavaScript의 number는 정수처럼 보여도 내부적으로는 부동소수점이다.
Number.isSafeInteger는 해당 값이 자바스크립트가 정확하게 표현할 수 있는
정수 범위 안에 있는지를 확인하기 위한 안전 장치다.

JavaScript의 number 타입은 IEEE-754 double 형식을 사용한다.
이 때문에 모든 숫자는 실수로 저장되며,
정확하게 표현 가능한 정수의 범위에는 한계가 존재한다.

이 범위는 플러스 마이너스 2의 53제곱에서 1을 뺀 값까지다.
이를 넘어가는 순간부터 정수는 1 단위로 정확히 증가하지 않는다.

문제는 이 상태에서도 에러가 발생하지 않는다는 점이다.
값은 정상처럼 보이지만, 비교와 연산이 조용히 깨진다.

Number.isSafeInteger는 다음 조건을 모두 만족해야 true를 반환한다.

첫째, 타입이 number일 것
둘째, NaN이나 Infinity가 아닐 것
셋째, 정수일 것
넷째, safe integer 범위 안에 있을 것

단순히 정수인지 확인하는 isInteger보다 훨씬 강한 검사다.

실제로 최대 안전 정수 값에 1을 더해도 값이 변하지 않는 상황이 발생한다.
이런 상태에서 id 비교, 정렬, pagination cursor,
누적 카운트 로직은 언제든 잘못된 결과를 만들 수 있다.

실무에서 특히 위험한 경우는 다음과 같다.

서버에서 내려오는 큰 정수 id를 number로 다루는 경우
누적 포인트나 카운트 값
밀리초 단위 timestamp를 장기간 누적하는 경우

이런 값들은 가능하면 string으로 유지하거나,
필요한 경우에만 BigInt를 사용하는 것이 안전하다.
