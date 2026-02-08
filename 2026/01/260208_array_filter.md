---
type: "content"
domain: "frontend"
category: "javascript"
topic: "array"
updatedAt: "2026-02-08"

satisfaction:
  score: 100
  reason: "filter의 동작 원리에 대한 명확한 이해"

keywords:
  - "filter"

relatedCategories:
  - "javascript"
---

# fillter는 "KEEP"이다.

배열 메서드인 filter를 사용할때마다, 왠지 모를 혼란을 겪는다.  
`필터`라는 단어가 가진 중의성 때문인지,  
일상 생활에서의 필터는 불순물을 걸러내는 역할을 한다.
그래서 인지, array.filter를 만날 때 마다,  
true면 걸러지고 나머지 것들을 모으는 함수라는 착각에 종종 빠지곤 한다.  
이 혼란스러움을 끝내려면 결국 filter를 KEEP으로 생각해야한다.  

## filter의 언어적 모순 (나만 그런가?)

일상생활에서 필터는 불순물을 제거하고 깨끗함을 남기는 용어이다.  
하지만 프로그래밍의 filter(callback)는 콜백 함수가 true를 반환하는 요소를 살려둔다.  
즉, 조건에 맞는 것을 버리는 게 아니라 조건에 맞는 것을 보존하는 동작이다.  
- filter(isError) 에러인 것 만 남긴다.
- filter(isActive) 활성 상태인 것만 남긴다.

## KEEP으로의 관점 전환
메서드 이름을 keep이라고 가정하고 코드를 읽어보면,  
로직의 의도가 훨씬 명확해진다.  

```ts
// ❌ "에러인 것만 걸러내" (Filter)
const errors = logs.filter(log => log.level === 'ERROR');

// ✅ "에러인 것만 남겨줘" (Keep)
const errors = logs.keep(log => log.level === 'ERROR');
```

관점의 변화는 특히 부정 조건문을 작성할 때 빛을 발한다.  
filter(!isDeleted)라고 쓰면 무엇을 지우는지 한참 생각해야 하지만,  
keep(!isDeleted)라고 읽으면 삭제되지 않은 것들을 보존한다는 의도가 명확하게 전달되는 듯 하다.  

뭔가 억지스러운 관점의 전환일수도 있겠지만,  
컴퓨터의 언어를 인간이 이해하기 쉽게 번역하는 과정에서 생기는 오해를 줄일 수 있다면,  
이런 관점의 전환도 나쁘지 않은 것 같다.  