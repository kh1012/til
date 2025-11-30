---
type: "skill"
domain: "frontend"
category: "typescript"
topic: "type-alias-guard"
updatedAt: "2025-11-30"

keywords:
  - "type"
  - "type-alias"
  - "type-guard"
  - "primitive"
  - "object-type"

relatedCategories:
  - "javascript"
---

# 변수에 타입 작성하기

TypeScript에서 type alias와 type guard를 활용하여 변수에 타입을 지정하는 방법을 정리한다.  
primitive 타입과 object 타입을 구분하고, 안전한 코드 작성을 위한 타입 가드 패턴을 익힌다.

## type 분류

- primitive (string, number, boolean ...)
- object (객체 타입)

## type alias

```ts
type Store = {
  currentPage: number;
  feeds: NeedsFeed[];
};

type NewsFeed = {
  id: number;
  comments_count: number;
  url: string;
  user: string;
  time_ago: string;
  points: number;
  title: string;
  read?: boolean;
};

const store: Store = {
  currentPage: 1,
  feeds: [];
}
```

# type guard

```ts
if (container) {
  container.innerHtml = "xxx";
}

function updateView(html: string) {
  if (container) {
    container.innerHTML = html;
  } else {
    console.error("최상위 컨테이너가 없어 진행할 수 없습니다");
  }
}
```
