---
type: "content"
domain: "frontend"
category: "typescript"
topic: "module-resolution"
updatedAt: "2025-11-30"

satisfaction:
  score: 60
  reason: "모듈 스펙과 디렉토리 캡슐화 개념을 간략히 정리, 더 깊은 예시 필요"

keywords:
  - "module"
  - "import"
  - "export"
  - "directory-encapsulation"
  - "index.ts"
  - "global-type"

relatedCategories:
  - "javascript"
---

# 파일 분리와 모듈 구조화

TypeScript의 모듈 스펙과 디렉토리 캡슐화를 통해 파일별 책임 범위를 명확히 나누는 방법을 정리한다.  
index.ts를 활용한 export 정리와 전역 타입 정의 방법도 함께 다룬다.

## module spec

- ts는 모듈 스펙을 가지고 있어, import / export 구문을 사용할 수 있다.

## 디렉토리 캡슐화

- 여러 파일들을 하나의 디렉토리로 묶고 해당 디렉토리 내에 index.ts를 구성하여 export를 정리하면, 파일별 책임의 범위를 나눌 수 있게된다.
- export, export { default as View } from 'View'; <-- index.ts의 파일만 import 해오고 View 객체를 바로 불러쓸 수 있다.
- 이때, View 파일은 export default 키워드를 사용해야 한다.

## 절대 쓰면 안되지만, 개념은 알고 있어야 하는 전역 변수 만들기

글로벌 타입을 정의한다. (브라우저에서 클라이언트 레벨이라면 윈도우 객체는 어디서든 불러 쓸 수 있다.)

```ts
declare global {
  interface window {
    myVariable: string;
  }
}

console.log(window.myVariable);
```
