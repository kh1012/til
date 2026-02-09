---
type: "content"
domain: "frontend"
category: "javascript"
topic: "generator"
updatedAt: "2026-02-10"

satisfaction:
  score: 100
  reason: "제너레이터와 yield 오버엔지니어링!"

keywords:
  - "generator"
  - "yield"
  - "iterator"
  - "requestIdleCallback"

relatedCategories:
  - "javascript"
---

# Depth가 깊은 데이터를 쉽게 풀어내는 방법

백앤드로 부터 Depth가 깊은 데이터를 받아왔고, 해당 데이터를 평탄화하여 UI에 표현해야 한다면?  

만약 이런 이슈를 접했다고 가정해보자.  
> 상위 카테고리와 하위 카테고리가 중첩된 트리 구조의 데이터를 받아서,  
> 특정 키워드가 포함된 카테고리만 추출하여 평탄화된 배열(Flat Array)로 반환하는 함수를 작성해야 합니다.

```js
const categories = [
  {
    id: 1,
    name: "의류",
    subCategories: [
      { id: 2, name: "상의", subCategories: [{ id: 3, name: "반팔 티셔츠" }] },
      { id: 4, name: "하의", subCategories: [] }
    ]
  },
  {
    id: 5,
    name: "뷰티",
    subCategories: [{ id: 6, name: "기초화장품" }]
  }
];
```

문제의 Depth를 보면,  
```js
[
  {
    id,
    ...
    subCategories: [
      {},
    ]
  }
]
```

서버로부터 받은 응답 데이터는 배열 / 객체 / 배열 / 객체, subCategories까지 보면 총 3 Depth로 구성되어 있다.  
여기서 요구사항은 `특정 키워드를 포함하는 카테고리만 찾아내서, 계층을 제거한 평탄한 배열로 반환 할 것`이다.  
사용성 관점의 비즈니스 목표는 사용자가 검색창에 입력할 때마다 실시간으로 일치하는 카테고리 목록을 제시해야 할 것 이다.  

단계적으로 접근 해보자.  
브루탈 포스로 생각해보면, `재귀`가 떠오른다.  

## 1단계: 가장 직관적인 해결법, 재귀 (Recursion)

```js
function getFlattenedCategories(data, keyword) {
  let result = [];

  function traverse(items) {
    for (const item of items) {
      if (item.name.includes(keyword)) { // 1 Depth
        result.push({
          id: item.id,
          name: item.name,
        })
      }

      if (item.subCategories?.length > 0) {
        traverse(item.subCategories)
      }
    }
  }

  traverse(data)
  return result;
}
```

기본적인 DFS 구조로 보인다.  
첫번째 item에 접근해서 root, 그리고 subCategories를 접근해서 모든 데이터를 조회하며 Flattened Array를 생성한다.  
어찌보면 가장 무식하지만, 가장 정확한 방법일 수 있다.  
다만 한 번 실행되기 시작하면 결과 배열을 다 만들때까지 멈추지 않는다.  
이는 브라우저 엔진의 메인 스레드를 점유하며 UI 프리징을 결국 만들게 될 것 이다.  

그럼 다른 방법은 없을까?  
조금 더 현대적인 방법을 적용해보면, Generator와 yield를 사용할 수 있다.  

## 2단계: 제어권을 외부로 넘기는 제너레이터 (Generator & yield)

Generator에 의해 호출자에게 "전체 결과가 나올 때 까지 기다려"가 아니라,  
"찾을 때마다 하나씩 yield를 통해 제어권을 살짝 넘겨줄게"라고 이야기 한다면, 어떨까?

```js
function* categoryWalker(nodes) {
  for (const node of nodes) {
    // 현재 노드를 외부로 전달하고 잠시 멈춤
    yield { id: node.id, name: node.name };

    if (node.subCategories?.length > 0) {
      //자식 노드 순회도 제너레이터에게 위임
      yield* categoryWalker(node.subCategories);
    }
  }
}
```

Generator의 yield는 함수의 실행을 일시 정지하고 **제어권을 호출자**에게 넘겨준다.  
이제 우리는 전체를 다 뒤지지 않고도 **결과 5개만 찾고 그만찾아**라는 제어를 할 수 있게 된다.  

`여기서 잠깐!`
> yield를 만났을 때 일어나는 일은 마법처럼 제어권이 브라우저로 날아가는 게 아니라,  
> 자바스크립트 엔진이 실행 중인 함수의 스택 프레임(Stack Frame)을 잠시 떼어서 메모리 한구석(Heap)에 저장하고 스택을 비워버리는 것.
> 
> **핵심 동작 원리: "얼음"과 "땡"**  
> **Context Saving (얼음):** 일반 함수는 `return` 하면 내부 변수들이 메모리에서 사라집니다.  
> 하지만 제너레이터는 `yield`를 만나는 순간,  
> 현재 어디까지 실행했는지(Program Counter)와 당시 변수들의 상태를 `Heap` 영역에 고스란히 저장합니다.  
> 
> **Stack Clearing (비우기)**: 엔진은 함수를 끝낸 것처럼 스택에서 해당 프레임을 제거합니다.  
> 자바스크립트 엔진 입장에서 스택이 비어있다는 건 **난 이제 할 일 없으니 브라우저 너 하고 싶은 거 해**라는 신호입니다.
> 
> **Resuming (땡)**: `next()`가 다시 호출되면, Heap에 저장했던 스냅샷을 다시 Call Stack으로 불러옵니다.  
>   함수는 자기가 멈췄다는 사실도 모른 채 yield 바로 다음 줄부터 실행을 재개합니다.

위 내용만으로 이해가 안가니... 더 자세히 정리해보자.   

Generator가 실행되다가 yield를 만나면, 단순히 멈추는 것이 아니라 상태의 이주(migration)이다.  
- 콜스택 관점: yield를 만나는 순간, 해당 함수(Generator)의 실행 프레임은 콜스택에서 제거 된다.  
- 힙(Heap) 관점: Generator 객체는 Iterator 상태를 관리하기 위해 생성될 때부터 Heap 영역에 저장이 된다. yield 시점에 콜스택에 있던 지역 변수, 현재 실행 위치같은 정보들이 이 Heap에 있는 Generator 객체 내부의 [[GeneratorState]]슬롯으로 옮겨져 저장이 된다.
- 일반적인 함수는 실행이 끝나면 스택에서 날아가고 데이터도 사라지지만, 제너레이터는 next()가 호출될 때까지 살아남아야 하므로 영속적인 저장소인 Heap이 필요하다. 임시 거처라기보다 데이터의 생명 주기를 연장하기 위한 설계이다.  
되돌아가는 시점은 명시적으로 해당 이터레이터의 next()가 호출되는 순간이다.  
이벤트 루프는 콜스택이 비어 있을 때 큐에서 다음 테스트(next() 호출이 담긴 테스크)를 거내 스택에 올리고, 그때 Heap에 저장되었던 상태가 다시 스택으로 복원이 된다.  

그럼 결국, Generator 함수 내부의 yield는 Heap의 GeneratorState로 상태를 이주하는 예약어라고 생각하면 될 것 같다.  
그리고 그 상태를 다시 Trigger하는 역할은 next()가 호출되는 순간이다.  

그러면, 명시적으로 next()를 호출하는 것외에 for...of 루프에 Generator를 전달하면 어떻게 될까?  

for...of 루프ㅡㄴ 자바스크립트 엔진이 내부적으로 done: true가 반환 될때까지 next()를 최대한 빠르게 연달아 호출하는 구문이다.  
루프 코드 블록 내부에 별도의 비동기 처리가 없다면, Generator가 yield를 하더라도 곧바로 다음 next()가 호출되므로 브라우저 엔진에 제어권을 넘어갈 틈이 거의 없다.  

단순히 for...of로 돌리면 Generator를 안쓰는 것과 메인 스레드 블로킹 면에서는 큰 이득을 얻을 수 없다.  
yield를 통해 얻은 멈춤의 기회를 우리가 언제 다시 깨울지 직접 결정해야만 브라우저가 숨을 쉴 공간이 생긴다.  

그럼 for...of와는 조합하지 않는게 좋겠다.  
우선 for...of를 조합하여 브라우저 엔진에게 숨쉴틈을 주지 않는 예시는 아래와 같다.  

```js
function* largeTaskGenerator(date) {
  for (const item of data) {
    //무거운 연산
    yield item;
  }
}

// 데이터가 10만 개라면 이 루프가 끝날 때까지 UI 프리징이 발생한다.
for (const result of largeTaskGenerator(hugeData)) {
  console.log(result);
}
```

이 형태라면 궂이.. Generator + yield를 쓸 필요가 없다.  
그럼 올바른 형태의 템플릿은 무엇일까?  

```js
function* searchGenerator(data, keyword) {
  for (const item of data) {
    if (item.name.includes(keyword)) {
      yield item; //이때 Heap의 GeneratorState로 상태 이주
    }
  }
  //루프가 끝남 -> return undefined -> done: true 반환
}

async function concurrentSearch(data, keyword) {
  const walker = searchGenerator(data, keyword);
  const result = {};

  return new Promise((resolve) => {
    function process() {
      const startTime = performance.now();

      // 16.7ms(60fps 기준 1프레임)의 절반인 8ms 동안만 자바스크립트 실행
      while (performance.now() - startTime < 8) {
        const { value, done } = walker.next();
        if (done) {
          // 끝난다면 해결하고 results 반환
          resolve(results);
          return;
        }
      }

      // 8ms가 지나면 브라우저에게 제어권을 넘기고 다음 유휴 시간에 재개
      requestIdleCallback(process);
    }

    process();
  })

}
```

60fps 기준, 0.5 프레임 안에서만 연산을 수행하고 Generator + yield를 통해 브라우저 엔진에 제어권을 넘긴다.  
while 문 내부는 실제 연산 (8ms만 수행, 넘어가면 곧바로 IdleCallback을 통해 예약 걸어두고 브라우저 엔진에게 제어권을 넘김)  
위 로직의 프로세스를 순서대로 써보면 아래와 같다.  

```
[초기화 단계]
Line 1: walker 객체 생성 (Heap에 상태 저장, 아직 실행 전)
Line 2: results 배열 생성
Line 3: Promise 생성 (비동기 작업의 시작점)

[실행 단계 - Task 1]
Line 4: process() 함수 최초 호출
Line 5: startTime 기록 (현재 시간 예: 0ms)
Line 6: while 문 진입 (현재 0ms < 8ms 이므로 참)
Line 7: walker.next() 호출 -> [JS 엔진] Heap에서 walker 상태를 Stack으로 가져와 실행
        -> 키워드 찾으면 yield -> 다시 Heap에 상태 저장 후 값 반환
Line 8: done이 아니면 results에 push
Line 9: 다시 while 루프 -> [반복] -> 8.1ms가 지남

[제어권 포기 단계]
Line 10: 8.1ms > 8ms 이므로 while 문 탈출
Line 11: requestIdleCallback(process) 호출 -> "브라우저야, 나중에 시간 날 때 process 또 불러줘" 예약
Line 12: process() 함수 종료 -> Call Stack이 텅 비어버림!

[브라우저 타임 (Intermission)]
- 콜스택이 비었으므로 브라우저 엔진이 주도권 획득
- 그동안 쌓인 마우스 클릭 이벤트 처리
- 화면에 새로운 프레임 그리기 (Rendering/Paint)
- (사용자는 이 과정에서 웹사이트가 부드럽다고 느낌)

[재개 단계 - Task 2]
Line 13: 브라우저가 유휴 시간에 도달함 -> 예약된 process() 호출
Line 14: 다시 Line 5부터 실행 (startTime을 새로 기록하여 다시 8ms 타이머 시작)
Line 15: walker.next() -> 아까 멈췄던 그 데이터 순서부터 다시 시작
... [반복] ...

[종료 단계]
Line 16: walker.next()에서 { done: true } 반환 (데이터 끝)
Line 17: resolve(results) 호출 -> 전체 비동기 작업 종료
```

[![](https://mermaid.ink/img/pako:eNptVFtPE0EU_ivHeTDbpKztdnthH0goYqNRIBZftDwMu0O76Xamzk65SEi4VALSxEsQ0RTSB5SQ-NAEVPhL7fQ_ONsFqaHzMJnZ_b5zzvfNmVlFNnMIspBPXtcItclDFxc5rhQoqFHFXLi2W8VUwHQesA8vfMLhgdrcBWSD_1nOlgLIM-xSmC1xgp27yFyAzBFKOBaMwyz2ywUawqaYIMAWVYSsBa-myBI8UtUQyAvFnwMtntJTFR9m3QrhkZASztP5kbExxYnr8JhWawImFwkVPmgTnmuXo5C3OfO8yJAs8ltb1ltypymbdei01-Xxd-huf5JHjcH42TC8ocOTPEwuE7smXEZB61fiR2GGs4rrEz8yhJTQgY8_Ao0HHvtinLoVHLD70oaV1Pu63z27gM6fy-6Pn53LNsjTDdmqgzz-KL-8HZLB1OEpXmFK9n2YUdaLoTr35XYDlEp5dQid87rcbEO3_R7k1q68ag1G5cQWwIvzmpGIRcFIJtWUiF1XeidwUlnueARmCHeZA5pstnrNC5B7zU67rjI05dbRvQFyUHPOgms3AuoE9rx5bJcV56R3sAuao_rGcykB2Wp2zn8NkG9XHmNVuAHqQp3Dc1JR2l1a1CIwBrFbaDByYdYl7JUJ1ylZFgoV5vsf2NfG3WJJAFsARem9C44BelsflFN9x3qf6716u3u6ccsk1BlWZG4kPCClQx5cdH43FP-wu3kG2opLPOdaWJ887AKEzT9JnTno7p2oloTefr3b2pHHytjGumoNFEVF7jrIErxGokg1o_JAbdFqEK-ARIlUSAFZaumQBVzzRAEV6Jqiqav4krHKDZOzWrGErAXs-WpXqzpY3DwG_75yVSjhE6xGBbISCaMfBFmraBlZcdPUE7F43MikzZSZTiSjaAVZSUNPpTLxTMw0kkbMMNNrUfSmnzWmpzNpwxwdTWaMdDyRNNb-AhPSmKg?type=png)](https://mermaid.live/edit#pako:eNptVFtPE0EU_ivHeTDbpKztdnthH0goYqNRIBZftDwMu0O76Xamzk65SEi4VALSxEsQ0RTSB5SQ-NAEVPhL7fQ_ONsFqaHzMJnZ_b5zzvfNmVlFNnMIspBPXtcItclDFxc5rhQoqFHFXLi2W8VUwHQesA8vfMLhgdrcBWSD_1nOlgLIM-xSmC1xgp27yFyAzBFKOBaMwyz2ywUawqaYIMAWVYSsBa-myBI8UtUQyAvFnwMtntJTFR9m3QrhkZASztP5kbExxYnr8JhWawImFwkVPmgTnmuXo5C3OfO8yJAs8ltb1ltypymbdei01-Xxd-huf5JHjcH42TC8ocOTPEwuE7smXEZB61fiR2GGs4rrEz8yhJTQgY8_Ao0HHvtinLoVHLD70oaV1Pu63z27gM6fy-6Pn53LNsjTDdmqgzz-KL-8HZLB1OEpXmFK9n2YUdaLoTr35XYDlEp5dQid87rcbEO3_R7k1q68ag1G5cQWwIvzmpGIRcFIJtWUiF1XeidwUlnueARmCHeZA5pstnrNC5B7zU67rjI05dbRvQFyUHPOgms3AuoE9rx5bJcV56R3sAuao_rGcykB2Wp2zn8NkG9XHmNVuAHqQp3Dc1JR2l1a1CIwBrFbaDByYdYl7JUJ1ylZFgoV5vsf2NfG3WJJAFsARem9C44BelsflFN9x3qf6716u3u6ccsk1BlWZG4kPCClQx5cdH43FP-wu3kG2opLPOdaWJ887AKEzT9JnTno7p2oloTefr3b2pHHytjGumoNFEVF7jrIErxGokg1o_JAbdFqEK-ARIlUSAFZaumQBVzzRAEV6Jqiqav4krHKDZOzWrGErAXs-WpXqzpY3DwG_75yVSjhE6xGBbISCaMfBFmraBlZcdPUE7F43MikzZSZTiSjaAVZSUNPpTLxTMw0kkbMMNNrUfSmnzWmpzNpwxwdTWaMdDyRNNb-AhPSmKg)

프레임 단위의 시간을 개발자가 직접 조절하며,  
사용자가 불편함을 느끼지 않는 걸 직접 제어할 수 있다는 점이 아주 매력적인 코드인 것 같다.  
일반적인 상황에서는 크게 사용할일이 없을 것 같은데,  
중첩 데이터 혹은 방대한 데이터를 불가피하게 클라이언트 레벨에서 처리를 해야 한다면,  
반드시 고려해야 할 최적화 부분이라고 생각이 든다.  

자 이제, Generator, yield, requestIdleCallback에 대한 기본 개념은 이해했다.  
근데 yield*는 무엇일까? 포인터인가? 저건 왜 const나 let의 위치에 있는걸까?  
`다른 이터러블의 모든 값을 순회하며 반환 함` 이라고 한다.  
역시 말은 한 번에 받아 들이기 쉽지 않다.  
예제로 보면, 조금 이해가 된다.  

```js
function* generator1() {
  yield 1;
  yield 2;
}

function* generator2() {
  yield 3;
  yield 4;
}

function* mainGenerator() {
  yield 0;
  yield* generator1(); // generator1의 모든 값을 순회
  yield* generator2(); // generator2의 모든 값을 순회
  yield 5;
}

// mainGenerator를 순회하면 0, 1, 2, 3, 4, 5가 순서대로 나옴
for (const value of mainGenerator()) {
  console.log(value);
}
```

위 예제에서 `yield* generator1()`은 `generator1`이 반환하는 모든 값을 하나씩 꺼내서 `mainGenerator`의 값으로 내보내는 역할을 한다.  
마치 `generator1`을 `mainGenerator` 안으로 복사해서 붙여넣기 한 것과 같다.  
이것이 바로 `yield*`의 역할이다.  

## 3단계: 작업 취소(Abort) 기능 보완

Class 구조로 설계 하면서, abort 기능을 추가해보자.  

```js
class CategorySearchSystem {
  constructor(data) {
    // 원본 데이터를 프리징하여 속성 추가/삭제 방지
    this.data = Object.freeze([...data]);

    // 현재 실행중인 검색 작업의 상태를 저장하는 변수
    this.currentTask = null;
  }

  async search(keyword) {
    // 새로운 작업이 시작되면 이전 작업을 즉시 취소 합니다.
    // 검색 첫 실행에는 currentTask가 없으므로 아무일도 일어나지 않고,
    // 만약 두번째 실행이 시작되었는데, 첫번째 비동기 함수가 아직 끝나지 않았다면,
    // 첫번째 this.currentTask의 cancel을 true로 변경하며, 
    // 비동기 함수 내에서 취소를 감지하여 작업을 중단시킵니다!
    if (this.currentTask) this.currentTask.cancel = true;

    // 지역변수 형태로 참조 객체를 생성 합니다.
    const taskStatus = { cancel: true };
    // 참조 객체를 this.currentTask이 참조하게 합니다.
    this.currentTask = taskStatus;

    // 제너레이터를 호출하여 이터레이터를 얻습니다.
    const iterator = categoryIterator(this.data);
    const results = [];

    //비동기로 동작하기 위해 Promise를 반환 합니다.
    return new Promise((resolve, reject) => {
      //브라우저 유후시간에 동작할 재귀 함수를 정의 합니다.
      const run = () => {
        //브라우저에게 "너 한가할 때 이 함수를 실행해줘"라고 에약 합니다.
        requestIdleCallback((deadline) => {
          //만약 새로운 검색이 시작된다면 즉시 중단 합니다.
          if (taskStatus.cancel) return reject(new Error('Cancelled!'));

          //브라우저가 준 여유 시간 (timeRemaining)이 0보다 큰 경우 루프를 실행 합니다.
          while (deadline.timeRemaining() > 0) {
            //Generator의 next를 호출하여,
            //힙에 저장된 상태를 불러와 딱 한 걸음만 더 탐색 합니다.
            const { value, done } = iterator.next();

            //더 이상 탐색할 데이터가 없다면 결과배열을 반환하고 종료 합니다.
            if (done) return resolve(results);

            //현재 카테고리에 이름 키워드가 포함되어 있다면, 결과 배열에 담슴니다.
            if (value.name.includes(keyword)) results.push(value);
          }

          //브라우저가 준 시간이 다 소모되었다면,
          //다음번 유휴시간에 이어서 작업하도록 다시 자신을 예약 합니다.
          run();
        });
      };

      //초기 실행을 위해 run을 호출 합니다.
      run();
    });
  }
}
```

실제 실무에 적용할 일이 뭐가 있을까 싶긴하지만,  
만약 적용한다면 이 글을 다시 읽고 AI와 함께 신나게 만들어봐야겠다.  