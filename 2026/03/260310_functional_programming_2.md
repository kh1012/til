---
type: "content"
domain: "frontend"
category: "javascript"
topic: "functional programming (2)"
updatedAt: "2026-03-10"

satisfaction:
  score: 100
  reason: "완벽하진 않아도 2차로 함수형에 대해 익숙해졌다."

keywords:
  - "functional programming"

relatedCategories:
  - "javascript"
  - "typescript"
---

# 함수형 프로그래밍 패턴 기본 (queryString)

> 어제 익힌 내용 다시 타이핑해보고, 준 실무 기준 queryString 추출 과정을 익혀본다.  
> 어제 밤에 쓰고 오늘 점심시간에 다시 써봐도, 아직도 익숙치 않다.  

```js
const log = console.log.bind(console);
const curry = f => (a, ..._) => _.length ? f(a, ..._) : (..._) => f(a, ..._);
const reduce = curry((f, acc, iter) => {
    if (!iter) {
        iter = acc[Symbol.iterator]();
        acc = iter.next().value;
    }
    for (const elem of iter) {
        acc = f(acc, elem);
    }
    return acc;
});
const take = curry((l, iter) => {
    let res = [];
    for (const elem of iter) {
        res.push(elem);
        if (res.length === l) break;
    }
    return res;
})
const takeAll = take(Infinity);
const go = (...fs) => reduce((a, f) => f(a), fs);
const pipe = (f, ...fs) => (...as) => go(f(...as), ...fs);
const L = {};
L.map = curry(function *(f, iter) {
    for (const elem of iter) {
        yield f(elem);
    }
});
const map = curry((f, iter) => go(L.map(f, iter), takeAll));

//[main]
//서버에서 받은 object를 queryString으로 변경하는 코드는 아래와 같다.
//함수형 프로그래밍 패턴은 다시 구현해도 멈칫멈칫한다. 기계처럼 동작할때까지!
const queryStrGo = obj => go(
    obj,
    Object.entries,
    map(([k, v]) => `${k}&${v}`),
    reduce((a, b) => a + b),
);

const queryStrPipe = pipe(
    Object.entries,
    map(([k, v]) => `${k}&${v}`),
    reduce((a, b) => a + b),
);

log(queryStrGo({ limit: 10, time: 10, type: 'notice' }));
log(queryStrPipe({ limit: 10, time: 10, type: 'notice' }));

//결국 (...as) => go(f(...as), ...fs) 구조가 곧 pipe 이므로, 함수를 정의한다면 pipe, 
//즉시 평가를 원한다면 go를 쓰면 되겠군!
```
