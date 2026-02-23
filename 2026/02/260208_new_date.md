---
type: "content"
domain: "frontend"
category: "javascript"
topic: "date"
updatedAt: "2026-02-08"

satisfaction:
  score: 100
  reason: "미래/과거 판별로 시작해서 Date 객체의 동작 원리를 파악하고, 시간대 변환의 필요성을 인지하게 된 점"

keywords:
  - "date"
  - "timezone"
  - "utc"

relatedCategories:
  - "javascript"
---

# Date 객체의 다양한 함정과 연산

hackerRank에서 사용자 날짜 입력과 비교해 에러 메세지를 띄우는 문제를 풀다, 날짜 형태의 문자열 데이터를 연산할 수 있을까?라는 의문에서 이 학습이 시작 되었다.  

## 오늘인가? 내일인가?

페이지 "2026-02-08"을 표현하는 건 생각보다 간단했다.  
아주 짧은 시행착오를 겪어보면 잘 표현이 된다.  

```ts
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0'); //1월은 0이다.
const day = String(today.getDate()).padStart(2, '0'); //day가 아니라 date를 써야한다.

renderPage(`${year}-${month}-${day}`)
```

주의 할점은 Month는 1월을 '0'으로 표현한다는 점이다.

하지만 여기서 문제가 발생한다.  
만약 사용자가 캘린더 UI를 통해 2026-02-09를 선택했다면, 이건 현재 기준으로 미래라고 표현해야 한다.  
어떻게 표현할 수 있을까?  

```ts
const today = new Date();
const selectedDate = new Date('2026-02-09');

if (selectedDate > today) {
  renderPage('미래');
} else {
  renderPage('과거');
}
```

위와 같이 비교 연산을 할 수 있다.  
근데 신기하다. 왜 비교 연산이 될까? Date 객체가 연산자를 만나면 내부 동작이 어떻게 되길래?  
c++처럼 클래스 내부 연산자 오버라이드가 가능한 건가?라고 생각했지만, 아쉽게도 자바스크립트 엔진의 ECMAScript 명시된 객체-원시값 변환 규칙을 Date 객체가 충족하고 있을 뿐 이다.  
개발자가 임의로 커스텀할 순 없고, 자바스크립트 엔진이 연산자를 만나면, 피연산자들을 ToPrimitive 알고리즘을 실행하려 하는 것일 뿐이다.  
이 알고리즘은 내부적으로 valueOf()를 먼저 호출하고, 그 다음 Symbol.toPrimitive를 호출한다.  
Date 객체의 경우 valueOf()가 원시값인 number를 반환하기 때문에, 비교 연산이 가능했던 것이다.  
근데 만약 오늘인지를 판단하고 싶다면 이야기가 조금 더 복잡해진다.  
년/월/일 뿐 아니라, 시/분/초/밀리초까지 고려해야 한다.  

Date 클래스는 그저 1970년 1월 1일 UTC부터 흐른 밀리초(ms)라는 단 하나의 숫자를 의미한다.  
암시적 형변환에 의해 isNaN(new Date())를 만나면 ms의 number로 형변환되어 NaN이 판단된다.  

그럼 최종적으로 아주아주 말끔한 형태는 아래와 같다.  

```ts
type DateStatus = 'past' | 'today' | 'future';

function checkDataStatus(targetDate: Date): DateStatus | null {
  if (!(targetDate instanceof Date) || isNaN(targetDate.getTime())) {
    return null;
  }

  const today = new Date();
  const todaySnapshot = (new Date(today.getFullYear(), today.getMonth(), today.getDate())).getTime();
  const targetSnapshot = (new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())).getTime();

  if (targetSnapshot > todaySnapshot) return 'future';
  if (targetSnapshot < todaySnapshot) return 'past';
  return 'today';
}

console.log(checkDataStatus(new Date('2026-02-09'))); // future
console.log(checkDataStatus(new Date('2026-02-08'))); // today
console.log(checkDataStatus(new Date('2026-02-07'))); // past
```

