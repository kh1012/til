---
type: "content"
domain: "frontend"
category: "javascript"
topic: "async"
updatedAt: "2025-11-30"

satisfaction:
  score: 65
  reason: "for await...of 문법과 AsyncIterable 개념을 예시와 함께 정리"

keywords:
  - "for-await-of"
  - "AsyncIterable"
  - "AsyncGenerator"
  - "Promise"
  - "streaming"

relatedCategories:
  - "typescript"
---

# for await...of 문

비동기 iterable(AsyncIterable) 객체의 값을 순차적으로 처리하는 for await...of 반복문을 정리한다.  
네트워크 요청, 파일 읽기, 데이터 스트리밍 등 비동기 데이터 소스를 단계별로 안전하게 처리할 수 있다.

## 정의

- **비동기 iterable(AsyncIterable)** 객체의 값을 순차적으로 처리하는 반복문
- 각 반복 단계에서 `await`를 수행해 **Promise가 resolve될 때까지 대기** 후 값을 반환

---

## 필요성

- `for...of`는 **동기 iterable**만 처리 가능
- 네트워크 요청, 파일 읽기, 데이터 스트리밍 등 **비동기 데이터 소스**를 단계별로 안전하게 처리 가능

---

## 동작 방식

1. AsyncIterable 또는 AsyncGenerator 제공
2. 각 반복에서 `await`로 Promise 결과 대기
3. 모든 값이 처리될 때까지 반복

---

## 예시 1: AsyncGenerator 사용

```javascript
async function* asyncGen() {
  yield Promise.resolve(1);
  yield Promise.resolve(2);
  yield Promise.resolve(3);
}

(async () => {
  for await (const num of asyncGen()) {
    console.log(num); // 1, 2, 3
  }
})();
```

## 예시 2: API 데이터 순차 처리

```javascript
async function* fetchData() {
  const urls = ["https://api.example.com/a", "https://api.example.com/b"];

  for (const url of urls) {
    const res = await fetch(url);
    yield res.json(); // 각 URL 응답 JSON 반환
  }
}

(async () => {
  for await (const data of fetchData()) {
    console.log("받은 데이터:", data);
  }
})();
```
