---
type: "content"
domain: "frontend"
category: "javascript"
topic: "operator"
updatedAt: "2026-02-09"

satisfaction:
  score: 100
  reason: "??과 ||의 차이점을 명확하게 이해"

keywords:
  - "nullish coalescing operator"
  - "||"
  - "??"

relatedCategories:
  - "javascript"
---

# 기본값을 할당하는 연산자

조건문을 고려하다 보면, 특정 값이 null이거나 undefined일 때 기본값을 할당하는 경우가 많다.  
이때 || 연산자를 사용하곤 하는데, Falsey 값인 0, "", false 등도 기본값으로 할당되어 버리는 문제가 있다.  
이러한 문제를 해결하기 위해 ?? 연산자가 등장한걸로 알고 있다.  
다만 실무에서는 || 연산자 만으로도 충분히 대응되기에,  
그렇게까지 신경을 안쓰고 있다가 최근 공학 연산 문제를 풀면서 ?? 연산자를 사용해야 하는 상황이 발생했다.  

## ?? Nullish Coalescing Operator (널 병합 연산자)

> 이름이 좀 복잡하다.
> 콜리어싱? 널 병합? merge와 다른 느낌의 결합한다는 느낌을 가진 어휘 같다.

말끔하게 동일한 코드는 아래와 같다.
```ts
const DEFAULT = -1;

function isValid(value: number) {
  if (value === undefiend) return DEFAULT;
  if (value === null) return DEFAULT;
  return value;
}
```

undefiend와 null만 검사하겠다는 거다.  
이걸 ??에 오버라이딩 해둔 걸로 추정된다.  
아마 더 깊이 들어가면 더 많은 이야기가 있겠지만, 실무 레벨에서는 Falsey 값에 대한 기본적인 || 연산자를 사용하되,  
0과 같이 Falsey지만 의미를 인정해야 할 때 ?? 연산자를 사용하면 되겠다.  

## || Logical OR Operator (논리합 연산자)

> 삼항연산자 대신에 쓰는게 옳다.
> 기본 값은 무조건 이놈으로 해야 말끔하다.

```ts
//보통 논리적 구조를 작성하다보면, 삼항 연산이 되는 경우가 많다.
//특정 조건이 아니라면, 보통은 아래와 같이 쓰는 경우가 빈번한 것 같다. 왜지?
const value = calculatedValue ? calculatedValue : '-';

//근데 논리 구조로 보면, Falsey를 조건으로 채택하고 true/false 두 가지 경우만 존재하는 논리합 연산자와 아주 일맥상통한다.
const value = calculatedValue || '-';
```

위 코드처럼 Falsey에 대해서 이분법적 사고로 논리를 펼친다면, 당연히 || 연산자가 직관적이다. 또 가독성이 좋다.  

아마 정리해두고 그때그때 또 AI에게 묻고 있을 내가 선하다.  
한줄의 코드라도 의미를 꾹꾹 눌러서 담는 연습을 지속해야 겠다.  
까먹으면 또 다시 글을 써가면서 되새기면 된다.