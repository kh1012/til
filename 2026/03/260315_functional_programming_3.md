---
type: "content"
domain: "frontend"
category: "javascript"
topic: "functional programming (3)"
updatedAt: "2026-03-15"

satisfaction:
  score: 100
  reason: "이제 절반정도 온거 같다."

keywords:
  - "functional programming"

relatedCategories:
  - "javascript"
  - "typescript"
---

# 함수형 프로그래밍 패턴 기본 (마무리)

> 커링, 결과, 합성, Lazy와 Eager, 그 외 유틸리티 성 FP  
> ES6의 특정 자료형에 제한되지 않고, 이터러블/이터레이터 프로토콜을 따른다면,  
> 사용할 수 있는 함수 목록!

```js
const log = console.log.bind(console);

/**
 * Curring function
 */
const curry = f => (a, ..._) => _.length ? f(a, ..._) : (...b) => f(a, ...b);

/**
 * Result functions [take, reduce]
 */
const take = curry((l, iter) => {
    const res = [];
    for (const e of iter) {
        res.push(e);
        if (res.length === l) break;
    }
    return res;
});
const takeAll = take(Infinity);

const reduce = curry((f, acc, iter) => {
    if (!iter) {
        iter = acc[Symbol.iterator]();
        acc = iter.next().value;
    }
    for (const e of iter) {
        acc = f(acc, e);
    }
    return acc;
});

/**
 * Composition functions [go, pipe by reduce]
 */
const go = (...args) => reduce((a, f) => f(a), args);
const pipe = (f, ...fs) => (...as) => go(f(...as), ...fs);

/**
 * Pure Lazy and Eager functions [range, map, filter, entries]
 */
const L = {};
L.range = function *(l) {
    let i = -1;
    while (++i < l) {
        yield i;
    }
}
const range = l => go(L.range(l), takeAll);

L.map = curry(function *(f, iter) {
    for (const e of iter) yield f(e);
});
const map = curry((f, iter) => go(iter, L.map(f), takeAll));

L.filter = curry(function *(f, iter) {
    for (const e of iter) {
        if (f(e)) yield e;
    }
});
const filter = curry((f, iter) => go(iter, L.filter(f), takeAll));

L.entries = function *(obj) {
    for (const k in obj) yield [k, obj[k]];
};
const entries = (obj) => go(obj, L.entries, takeAll);

/**
 * Additional Result functions [find, join]
 */
const find = curry((f, iter) => go(
    iter,
    L.filter(f),
    (([n]) => n)
));

const join = (sep = ", ", iter) => reduce((a, b) => `${a}${sep}${b}`, iter);

/**
 * Utilities functions [flatten, flatMap]
 */
const isIterable = (iter) => iter && iter[Symbol.iterator];
L.flatten = function *(iter) {
    for (const e of iter) {
        if (isIterable(e)) yield *e;
        else yield e;
    }
}
L.deepFlat = function *f(iter) {
    for (const a of iter) {
        if (isIterable(a)) yield *f(a);
        else yield a;
    }
}
const flatten = pipe(L.flatten, takeAll);
const deepFlat = pipe(L.deepFlat, takeAll);

L.flatMap = pipe(L.map, L.flatten);
const flatMap = pipe(L.map, flatten);

```
