---
type: "skill"
domain: "frontend"
category: "javascript"
topic: "async-await"
updatedAt: "2025-11-30"

keywords:
  - "XMLHttpRequest"
  - "fetch"
  - "Promise"
  - "async"
  - "await"
  - "event-loop"
  - "Promise.all"
  - "callback"

relatedCategories:
  - "typescript"
---

# 서론

XHR -> fetch로의 API 변화  
Promise 객체를 통한 체이닝, 그리고 async / await까지의 전반적인 변화를 보고 이해할 필요성이 있어 해당 문서를 작성함.  
먼저 각 개념을 정의하고 XHR(XMLHttpRequest)와 fetch API의 각 정의와 차이를 먼저 이해해보자.

# XHR (XMLHttpRequest)

콜백 기반의 고대 웹 표준 네트워킹 API.  
ajax가 대표적이며, 기본 코드는 아래와 같음.

```ts
const callback = () => {
  if (xhr.readyState === 4 && xhr.status === 200) {
    console.log(xhr.responseText);
  }
};

const xhr = new XMLHttpRequest();
xhr.open("GET", "/api/data"); //보통 세번째인자가 동기, 비동기 처리.
xhr.onreadystatechange = callback;
xhr.send(); //비동기로 네트워크 요청 보내두고, 상태 변경되면 위 콜백이 실행됨.
```

최종 API 요청 코드까지 콜백을 넘겨야 하므로, 한번 꼬이면 최고의 콜백지옥을 맛볼 수 있다하여 콜백헬이라 불릠..

# fetch API

ES6 이후 표준으로 추가된 XHR 현대적 대체제  
Promise 기반으로 체이닝(then, catch)을 이용해 XHR보다 훨씬 간결!

```ts
fetch("/api/data") // 인자 없으면 기본 값 'get'
  .then((response) => {
    if (!response.ok) throw new Error("네트워크 요청 에러");
    return response.json();
  })
  .then((data) => console.log(data))
  .catch((err) => console.error(err));
```

# Promise

비동기 작업의 결과를 표현하는 객체  
세가지의 상태를 가짐.

- pending (결과 대기중)
- fullfilled (성공, resolve)
- rejected (실패, reject)

```ts
const p = new Promise((resolve, reject) => {
  setTimeout(() => resolve("완료"), 1000);
});

p.then((result) => console.log(result)) // '완료'
  .catch((err) => console.error(err));
```

# async / await

Promise를 마치 코드 수준에서 동기적으로 쓰게해주는 키워드  
async 키워드가 붙은 함수는 항상 Promise를 반환  
await Promise가 완료될때까지 기다렸다가 그 값을 반환  
Promise기반이고 표현만 동기적으로 하는것이기에, JS 엔진이 잘 움직일 수 있게 이벤트 루프를 블로킹 하지 않음.

```ts
//Promise 체이닝
fetch("/api/data")
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error(err));

//async, await
try {
  const res = await fetch("/api/data");
  const data = await res.json();
  console.log(data);
} catch (err) {
  console.error(err);
}
```

## 이벤트 루프와 블로킹

자바스크립트는 싱글스레드 기반. 즉, 한 번에 하나의 작업만 수행할 수 있음.  
이벤트 루프를 통해 자원을 최적으로 관리하여 여러 일을 동시에 수행하는 것 처럼 보이는 것!  
근데 만약 이 이벤트 루프를 강제로 막아버린다면..

```ts
console.log("start");

for (let i = 0; i <= ie9; i++) {} // 오래 걸리는 동기 코드 (CPU 점유)

console.log("end");
```

CPU를 점유하는 동기 코드 덕분에(?) 이벤트 루프와 JS 엔진이 블로킹 당하게 된다.  
다른 일 아무것도 못하고 다들 멍하니 저것만 바라보고 있는거지..  
반면에 setTimeout과 같은 비동기 패턴들(async, await)은 이벤트 루프를 블로킹 하지 않고, 다른일을 할 수 있게 등록만 하고 넘어간다.

```ts
console.log("start");

setTimeout(() => console.log("완료"), 1000);

console.log("end");
```

## Promise.all

async, await과 조합하여 여러 기능 함수들이 정의되어 있겠지만, 일괄의 형태인 all을 추가로 한번 봐보자.  
폭포수 네트워크 요청 패턴을 병렬로 변환할 수 있는 마법이긴한데.. 하나 실패하면 모두가 실패해버리는 단점이 있다.

```ts
function sequential(): void {
  const user = await fetch("/api/user").then((res) => res.json());
  const posts = await fetch("/api/posts").then((res) => res.json());

  console.log(user, posts); //user부터 순차적으로 실행 (2)
}

function parallel(): void {
  const [user, posts] = await Promise.all([
    fetch("/api/user").then((res) => res.json()),
    fetch("/api/posts").then((res) => res.json()),
  ]);

  console.log(user, posts); //병렬로 가져와서 실행 (1)
}
```
