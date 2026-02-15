---
type: "content"
domain: "frontend"
category: "technical"
topic: "serialization"
updatedAt: "2026-02-15"

satisfaction:
  score: 100
  reason: "직렬화/역직렬화 자주 쓰던 단어에 대한 이해"

keywords:
  - "serialization"

relatedCategories:
  - "javascript"
---

# Serialization

직렬화(Serialization)는 객체(Object)나 데이터 구조를 바이트 스트림(Byte Stream) 형태로 변환하는 과정이다.  
이 과정은 데이터를 파일로 저장하거나 네트워크를 통해 전송할 때 필수적이다.  
반대로 역직렬화(Deserialization)는 이 바이트 스트림을 다시 원래의 객체 형태로 복원하는 과정이다.  

별 생각없이 해당 용어를 쓰다가,  
갑작스레 궁금해졌다. 왜 JSON.stringify()를 직렬화라고 부를까?  
파편화 되어 있는 메모리상의 다양한 데이터들을 네트워크에 실어보내기 위해,  
연속적인 바이트 스트림으로 변환하는 과정이 마치 일렬과 같은 줄을 세우는 것 같아서 직렬화라고 부른다고 하는 거 같다.  
이걸 이해하면 반대 개념은 아주 쉽다.  
그럼 다시 네트워크에서 받은 바이트 스트림을 각자의 메모리상에 저장하기 위해 변환하는 것이, 역직렬화이다.  

`object` -> `string` 직렬화  
`string` -> `object` 역직렬화

