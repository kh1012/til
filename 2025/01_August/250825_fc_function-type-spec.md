---
type: "skill"
domain: "frontend"
category: "typescript"
topic: "type-alias"
updatedAt: "2025-11-30"

keywords:
  - "type"
  - "type-intersection"
  - "generic"
  - "type-alias"

relatedCategories:
  - "javascript"
---

# 함수와 타입의 규격 작성

TypeScript에서 type alias와 intersection을 활용하여 데이터 타입을 정의하고, Generic을 사용한 함수 규격 작성법을 정리한다.  
공통 변수를 묶어 재사용성을 높이고, 타입 안전성을 확보하는 방법을 다룬다.

## 타입 정의 예시

```ts
// 공통 변수 묶음
type News = {
  id: number;
  time_ago: string;
  title: string;
  url: string;
  user: string;
  content: string;
};

// type intersection
type NewsFeed = News & {
  comments_count: number;
  points: number;
  read?: boolean;
};

type NewsDetail = News & {
  comments: NewsComment[];
};

type NewsComment = {
  comments: NewsComment[];
  level: number;
};
```

# REST Client

- [테스트 코드 추가](./../codes/hn.http)

# Generic

```ts
function getData<T>(url: string): T {
  ajax.open("GET", url, false);
  ajax.send();

  return JSON.parse(ajax.response);
}
```
