---
type: "skill"
domain: "frontend"
category: "javascript"
topic: "class-vs-prototype"
updatedAt: "2025-11-30"

keywords:
  - "mixin"
  - "class"
  - "extends"
  - "generic"
  - "Constructor"
  - "prototype"
  - "composite-pattern"

relatedCategories:
  - "javascript"
  - "oop"
---

# 믹스인 실무 적용

extends는 단일 계층 상속을 정의하는 반면, 믹스인은 Composite 패턴처럼 기능들을 조립하여 새로운 인스턴스를 생성하는 방식이다.  
실무에서는 applyMixins 헬퍼 없이도 클래스 생성 제네릭을 통해 직관적으로 믹스인을 정의할 수 있다.

# 제네릭 생성자 정의

```ts
type Constructor<T = {}> = new (...args: any[]) => T;
```

Constructor 타입을 정의한다.  
new를 사용하고 여러개의 인자를 받을 수 있음을 선언한다.  
최종적으로 T라는 제네릭 타입을 반환한다.

# 기능 함수 정의

```ts
function TimeStamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timeStamp = Date.now();
  };
}

function Taggable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    tag = "tag";
  };
}
```

# 인스턴스 정의 및 실제 사용

```ts
// 기본 클래스 정의
class Base {
  id: number;
}

// 믹스인 적용
class User extends Taggable(TimeStamped(Base)) {
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  do(): void {
    console.log(`I'm User`);
  }
}

const user: User = new User("kh1012");
console.log(user.timeStamp);
console.log(user.tag);
console.log(user.id);
console.log(user.name);
```
