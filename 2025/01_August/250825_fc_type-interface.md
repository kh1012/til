---
type: "content"
domain: "frontend"
category: "typescript"
topic: "interface"
updatedAt: "2025-11-30"

keywords:
  - "interface"
  - "type-alias"
  - "extends"
  - "readonly"

relatedCategories:
  - "javascript"
---

# 타입과 인터페이스

TypeScript에서 interface와 type alias의 차이점과 사용 시점을 정리한다.  
상속관계를 표현할 때는 interface의 extends가 더 명확하며, 코드 일관성 유지가 중요하다.

## interface 특징

- type alias와 조금 차이난다.
- 개발에서는 일관성이 있어야 한다.
- 코드를 읽는다의 관점에서 사용한다.
- 상속관계를 만들때에는 표현한다.

```ts
interface News {
  ...
}

interface NewsFeed extends News {
  readonly id: number;
  ...
}
```
