---
type: "skill" 
domain: "frontend" 
category: "javascript" 
topic: "callback" 
updatedAt: "2025-12-04"

satisfaction:
  score: 80
  reason: 콜백이 담고 있는 본질에 대한 이해를 한층 올린거 같았음.

keywords: 
- "callback" 
- "제어권" 
- "실행-시점" 
- "매개변수-전달" 
- "this-바인딩" 
- "event-loop" 
- "bind" 
- "async-model" 
- "call-site" 
- "higher-order-function"

relatedCategories:
- "javascript"
---

# 콜백 함수 (Callback)

콜백은 **함수의 실행 제어권을 호출자에게 넘기는 패턴**이다.  
즉, "언제 실행할지 / 어떤 인자를 넘길지 / 어떤 this로 실행할지"를 스스로  
결정하지 않고 **호출하는 쪽이 전부 관리**한다.  
이 제어권 이동이 JS 비동기 모델의 기반이며, 이벤트·타이머·반복 구조 등  
거의 모든 런타임 동작이 이 원리로 움직인다.  

## 개념 정리 - 콜백의 본질은 "제어권 위임"

콜백은 아래 세 요소가 모두 호출자에게 넘어간다.

### 1) 실행 시점 제어권

``` js
setInterval(function () {
  console.log("1초마다 실행");
}, 1000);
```

### 2) 매개변수 전달 제어권

``` js
arr.forEach(callback, thisArg);
```

### 3) this 바인딩 제어권

``` js
document.body.innerHTML = '<div id="a">abc</div>';
const cbFunc = function (x) {
    console.log(this, x);
}

const obj = { a: 1 };
document
    .getElementById('a')
    .addEventListener('click', cbFunc);
    //이때의 this = <div id="a">abc</div>
    //x는 PointerEvent (이벤트 객체)
    
document
    .getElementById('a')
    .addEventListener('click', cbFunc.bind(obj));
    //이때의 this { a: 1 }
    //x는 PointerEvent (이벤트 객체)

```

## JS 비동기 모델과 콜백의 관계

JS는 싱글 스레드지만,  
**이벤트 루프가 콜백을 큐에 쌓아 두었다가 적절한 타이밍에 실행**하는 방식으로 비동기성을 구현한다.

## 실무에서 왜 중요한가?

-   this 바인딩 실수는 즉각적인 버그로 이어진다.
-   Promise, async/await도 결국 콜백 기반이다.
-   제어권 이동을 이해해야 코드 해석이 정확해진다.

## 주의 사항

```js
const arr = [0, 1, 2];
const obj = {
    vals: [1, 2, 3],
    doFunc: function () {
        console.log(this.vals);
    }
}

obj.doFunc(); //1, 2, 3
arr.forEach(obj.doFunc); //undeifined
arr.forEach(obj.doFunc, obj); //1, 2, 3
```
