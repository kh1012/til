---
type: "content"
domain: "frontend"
category: "javascript"
topic: "functional programming (1)"
updatedAt: "2026-03-09"

satisfaction:
  score: 100
  reason: "완벽하진 않아도 1차로 함수형에 대해 익숙해졌다."

keywords:
  - "functional programming"

relatedCategories:
  - "javascript"
  - "typescript"
---

# 함수형 프로그래밍 패턴 기본

> 객체 지향은 익숙한데, 내가 과연 일급 함수와 고차함수를 구분할 수 있을까?  
> 직접 구현해보고 사용해보고 cosnole.log를 찍어봐야만 머릿속에 남는다.  
> 그 옛날 Class를 익힐때도 그렇고 결국 내가 이해하려면 100번 이상은 타이핑 또 타이핑 밖에 답이 없다.


```js
//함수형 프로그래밍 패턴
//curry
//reduce
//go
//pipe
//L.filter
//L.map
//take
//takeAll
//filter
//map

const curry = f => (a, ..._) =>
    _.length ?
        f(a, ..._) : // [case 1] 인자가 2개 이상인 경우 바로 실행한다.
        (...args) => f(a, ...args); // [case 2] 인자가 1개인 경우, 첫번째 인자를 제외한 새로운 익명함수를 만들어서 내보낸다. 그리고 실행 시점에 클로저에 의해 a를 넣어준다.
//아직도 이해가 안된다. 커링한다.
//단순하게 보면, 함수를 주고 args가 1개면 다시 함수를 반환하고 2개 이상이면 실행시켜준다. 아주 간단하다.
//근데 1개만 주었을 때, a라는 첫번째 인자를 제외하고 받는 부분이 이해가 안된다.
//const add = (a, b) => a + b;
//const curriedAdd = curry(add);
//const add5 = curriedAdd(5); ---> (a, ..._) 중 a는 5, ..._는 빈배열 (length 없음) ---> (...args) => f(a, ...args)가 add5
//const log(add5(6)) ---> 11이 됨. ...args -> 6 => f(a, b) ---> (a, b) => a + b; ---> (a, ...args) => a + ...args;의 형태.
//이해가 될듯 말듯, 어찌되었건 인자를 2개 이상 받을 때, 함수를 실행한다. 첫번째 인자는 떼어둔다. 2가지 특징을 이해하자.
//js의 bind 개념과 비슷한거 같기도 하고 아닌것 같기도 하다...

const reduce = curry((f, acc, iter) => { //이터러블/이터레이터 프로토콜을 만족하는 파라미터가 넘어 왔을 때, 압축할 수 있는 함수이다.
    if (!iter) { //세번째 인자가 비었단 소리는 보통 acc자리에 Iterable 값을 넣어둔다.
        iter = acc[Symbol.iterator](); //acc가 곧 이터러블 프로토콜일테니, Symbol.iterator를 실행해서 Iterator를 추출
        acc = iter.next().value; //초기 값은 이터레이터에서 next()를 한번 호출해서 값을 채워둔다.
    }
    for (const item of iter) { //초기값을 채웠다면 두번째 값부터 순회하게 된다.
        acc = f(acc, item); //reduce function을 적용하여 acc를 갱신한다.
    }
    return acc;
}); //커링으로 감싸두면, go나 pipe에서 인자를 넘기지 않고도 두번째 인자 실행에 대한 보장을 해주면서 가독성이 대폭 증가 된다.

const go = (...fs) => reduce((a, f) => f(a), fs);
// go([1,2,3],
//   console.log,
// );
//데이터로 시작해서 위에서 아래로 내려가면서 순차적으로 함수를 실행한다.
//reduce가 acc, cur이니까 ---> acc, function => function(acc)는 결국 (x, f) => f(x)의 형태
//go(x, f1, f2); ---> reduce((x, f) => f(x), fs); ---> (x, f1) => f1(x) ---> (f1(x), f2) => f2(f1(x))
//이전 결과 f1(x)가 다시 인자 자리로 넘어가면서 다음 함수를 순차적으로 실행해준다.

const pipe = (f, ...fs) => (...args) => go(f(...args), ...fs);
// const add = (a, b) => a + b;
// const f = pipe(
//   add,
// )
// console.log(f(0, 1)); // 이때 즉시 평가 됨.
// 위와 같이 함수의 흐름을 묶을 수 있음.
// 즉시 평가가 되지 않고 함수의 흐름을 반환

const L = {};
L.filter = curry(function *(f, iter) {
    for (const item of iter) {
        if(f(item)) yield item;
    }
});
//아주 간단하다. 제너레이터를 생성하는데 순회하면서 조건을 충족하면 yield 시킨다. (Keep!)
//역시너 go, pipe에서 (p) => method(f)(p)에서 method(f)로 축약하기 위해 커링해준다.
//method(f)는 커링에 의해, 인자가 1개 이므로 함수를 반환 ---> (...next) => f(a, ...next);
//(...next) --> preValue
//f(a, ...next) ---> method(f, preValue)의 형태를 가지고 있음. 따라서 go나 pipe가 reduce에 의해 연쇄적으로 f(x)값을 넘길 때,
//해당 값을 인자로 받아서 preValue를 채워줌. 결국 method(f)만 표현해도 go, pipe에서는 제대로 동작해버림!!

L.map = curry(function *(f, iter) {
    for (const item of iter) {
        yield f(item);
    }
});
//더욱 간단하다. f(arg)를 실행시켜서 yield시키면 끝.

//지연 평가되는 filter와 map을 추출하려면, 즉시 평가되는 장치가 있어야 한다.
//마치 array의 slice를 연상 시키는 take 함수를 정의해보자.
const take = curry((l, iter) => {
    let res = [];
    for (const item of iter) {
        res.push(item);
        if (res.length === l) break;
    }
    return res;
});

//간단하게 전체를 꺼내기 위한 아래 함수도 정의해보자.
const takeAll = take(Infinity);

//Generator에 의해 지연 평가할 수 있는 구조를 만들었다면, 그 조합으로 filter와 map은 아주 심플하게 구현할 수 있게 된다.
const filter = curry((f, iter) => go(iter, L.filter(f), takeAll));
const map = curry((f, iter) => go(iter, L.map(f), takeAll));

//마지막으로 모두 조합해서 테스트 해보자.

const users = [
    { name: '김철수', age: 24 },
    { name: '이영희', age: 32 },
    { name: '박민수', age: 28 },
    { name: '최지혜', age: 35 },
    { name: '정도윤', age: 21 }
];

//고객들의 나이 중 30세 이상 고객의 나이를 추출한다면,
go(users,
    L.map(u => u.age),
    L.filter(age => age > 30),
    takeAll,
    console.log
); //[32, 35]
```
