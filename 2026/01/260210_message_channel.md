---
type: "content"
domain: "frontend"
category: "javascript"
topic: "message channel"
updatedAt: "2026-02-10"

satisfaction:
  score: 100
  reason: "이중 rAF의 추정치를 보장으로 만드는 기법!"

keywords:
  - "message channel"

relatedCategories:
  - "javascript"
---

# Message Channel

JS 엔진이 무거운 연산을 수행하기 전, UI 프리징을 막기 위해 이중 rAF를 사용 했었다.  
하지만 이건 그저 추정치일 뿐 실질적인 브라우저 엔진 렌더링 파이프라인의 style -> layout -> paint 순서를 보장하지 않았다. 
수정 전 기존 코드는 아래와 같다.  

```js
export async function waitForPaint() {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

```

근데 코드를 보다 갑자기, 이게 보장이 될까? 라는 의문이 생겼다.  
이것저것 뒤지다가 messageChannel이라는 객체를 사용하여 마치 종이컵으로 서로 소리를 주고 받는 것 처럼,  
port1, port2를 사용하여 서로 소통하는 방식을 이용하면 렌더링 파이프라인의 동작을 제법 보장할 수 있다. (엔지니어링 분야에서 완벽한 보장은 존재할 수 없다...)  

```js
const { port1, port2 } = new MessageChannel();
const pendingResolves: (() => void)[] = [];
port1.onmessage = () => pendingResolves.shift()?.();

export const waitForPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      pendingResolves.push(resolve);
      port2.postMessage(undefined);
    });
  });
```

순서는 다음과 같다.  
1) **waitForPaint()** 를 만나면 JS 엔진이 브라우저에게 **rAF 예약**  
2) 다음 프레임에 **rAF 내부 콜백**이 실행되면서 **postMessage 전달**  
3) **onMessage가 실행될 때 (수신될 때)** **macroTask queue**에 등록 (순서 맨 끝으로 밀림)  
4) **Style/Layout/Paint** 동작 진행, 메인 스레드의 제어권이 브라우저 렌더링 파이프라인으로 넘어감.  
5) 렌더링 완료 후 **macroTask queue**에 등록된 task 진행 (**JS 엔진 제어권 회수**)  

조금 더 정제된 언어로 표현하면 아래와 같다.  
**상세 타임라인 재구성 (UI 프리징이 사라지는 이유)**
1) **예약**: waitForPaint() 호출 시 rAF가 예약됩니다. 이때까지 메인 스레드는 아직 이전 Task를 처리 중입니다.
2) **렌더링 시작 (rAF)**: 브라우저가 새 프레임을 그리기 직전 rAF 콜백을 실행합니다. 여기서 postMessage를 던지면, onmessage 작업은 Task Queue의 맨 끝에 등록됩니다.
3) **브라우저 점유 (Paint)**: rAF 콜백이 끝나자마자 브라우저는 Style -> Layout -> Paint 과정을 수행합니다. 메인 스레드는 이때 브라우저의 렌더링 엔진이 점유하며, 실제 픽셀이 모니터에 출력됩니다. (사용자가 변화를 목격하는 시점)
4) **제어권 반납 (Yield)**: 페인트가 끝나면 메인 스레드가 잠시 자유로워집니다. 이때 사용자 클릭이나 타이핑 같은 급한 이벤트가 있다면 브라우저가 먼저 가로채서 처리할 수 있습니다.
5) **후속 작업 (Resolve)**: 드디어 Task Queue 순서가 되어 onmessage가 실행되고, await가 해제되면서 나머지 JS 코드가 실행됩니다.

[![](https://mermaid.ink/img/pako:eNp9VNFKG0EU_ZXLPG0gLslm18R9EMRWUGqJSXxoycs0mayLm510dtbWilAhFIspCFWrNimRSrXQh0iD-FB_KDv5h84kpqY1dB8uO8O5955zz93dQiVaJshGAXkZEr9EHrnYYbha9EE-Ncy4W3Jr2OewlAccqPjYd1yfgDaPPQ_yHJfWYw_RhRWFLuBgHVZCEkr4Mi4xyuXFBHQuq9A54pcJc30Hsm6NeLLJQ-TqokKuBoTBos8Jq-CSrJ0vMUJ8WXiY8JRyAnRDYpbyNiR1eIVdvkBZFrs-12LQP74R180hdik_NTuby9rA1AACPue7Vcxd6i_IKRCNzS3EQBzvisPbIX4YGSlxYM4LzTATcRiF2L_tVV1Dh2jvXLQa0D-oR-1d8aUO2r3U3k2nf9q4y8xlJRnFWbYFcduMOlcg9s77R-_HyBZWbKhRxg29RgO-TIIAO0Sq0qhfHR7uCI_TYa6zxoFWQGWn9HFnootLiHZa4tM-RB-vorPWME0yHM3zXm1qINSSwbImqjWl2ptG1PolTjui_RZEe18026ANRi8Hcdn7WR8Xq3LyfNMjMDULT_AmDbl6G8DHYKuLNvRPDqLvXeh1rsReG8RJPframKRQYeWaqGl_-yEuDqF_2BXtphxkU7L5j7j_WqlcsXSppymOur1r6eZpQ-weg_bMJV5ZOdn_PFJWWLmzccyRgYugMRJQb4NMLI_VmoJodWUlVU28-wDRWVNc7Py1BJI7iiOHuWVkcxaSOKoSVsXqiLYUpIj4GqmSIrLla5lUcOjxIir62zJNfkTPKa2OMhkNnTVkV7AXyFNYK2M--gP8uWWDXZ2noc-RPTMogewt9BrZSdPUU4lk0sikzWkznbLiaBPZlqFPT2eSmYRpWEbCMNPbcfRm0DOhpzNpw5yZyRgpK50wrOT2b39ioP4?type=png)](https://mermaid.live/edit#pako:eNp9VNFKG0EU_ZXLPG0gLslm18R9EMRWUGqJSXxoycs0mayLm510dtbWilAhFIspCFWrNimRSrXQh0iD-FB_KDv5h84kpqY1dB8uO8O5955zz93dQiVaJshGAXkZEr9EHrnYYbha9EE-Ncy4W3Jr2OewlAccqPjYd1yfgDaPPQ_yHJfWYw_RhRWFLuBgHVZCEkr4Mi4xyuXFBHQuq9A54pcJc30Hsm6NeLLJQ-TqokKuBoTBos8Jq-CSrJ0vMUJ8WXiY8JRyAnRDYpbyNiR1eIVdvkBZFrs-12LQP74R180hdik_NTuby9rA1AACPue7Vcxd6i_IKRCNzS3EQBzvisPbIX4YGSlxYM4LzTATcRiF2L_tVV1Dh2jvXLQa0D-oR-1d8aUO2r3U3k2nf9q4y8xlJRnFWbYFcduMOlcg9s77R-_HyBZWbKhRxg29RgO-TIIAO0Sq0qhfHR7uCI_TYa6zxoFWQGWn9HFnootLiHZa4tM-RB-vorPWME0yHM3zXm1qINSSwbImqjWl2ptG1PolTjui_RZEe18026ANRi8Hcdn7WR8Xq3LyfNMjMDULT_AmDbl6G8DHYKuLNvRPDqLvXeh1rsReG8RJPframKRQYeWaqGl_-yEuDqF_2BXtphxkU7L5j7j_WqlcsXSppymOur1r6eZpQ-weg_bMJV5ZOdn_PFJWWLmzccyRgYugMRJQb4NMLI_VmoJodWUlVU28-wDRWVNc7Py1BJI7iiOHuWVkcxaSOKoSVsXqiLYUpIj4GqmSIrLla5lUcOjxIir62zJNfkTPKa2OMhkNnTVkV7AXyFNYK2M--gP8uWWDXZ2noc-RPTMogewt9BrZSdPUU4lk0sikzWkznbLiaBPZlqFPT2eSmYRpWEbCMNPbcfRm0DOhpzNpw5yZyRgpK50wrOT2b39ioP4)