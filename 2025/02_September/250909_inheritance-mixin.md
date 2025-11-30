---
type: "skill"
domain: "frontend"
category: "javascript"
topic: "class-vs-prototype"
updatedAt: "2025-11-30"

keywords:
  - "class"
  - "extends"
  - "inheritance"
  - "mixin"
  - "access-modifier"
  - "public"
  - "private"
  - "protected"
  - "readonly"

relatedCategories:
  - "javascript"
  - "oop"
---

# 상속과 믹스인

클래스 상속의 기본 개념, 접근지정자(public, private, protected, readonly), 그리고 TypeScript에서 제안하는 믹스인 패턴에 대해 다룬다.  
코드 베이스가 커지면 공통 부분을 추상화하고 재사용성을 고려해야 하는데, 이때 OOP의 상속과 믹스인이 유용하다.

# 상속

뭐, 간단하다.  
상위의 변수와 함수를 물려받는다.

```ts
class Parent {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  greet() {
    console.log(`Hello, I'm ${this.name}`);
  }
}

class Child extends Parent {
  want() {
    console.log("게임을 하고싶다.");
  }
}

const parent = new Parent("엄마");
const child = new Child("학생");

parent.greet(); // Hello, I'm 엄마
parent.want(); // ❎
child.greet(); // Hello, I'm 학생
child.want(); // 게임을 하고 싶다.
```

# 접근지정자

```ts
class Person {
  public name: string; //기본 값
  readonly id: number; //읽기전용
  protected type: string; //상속된 클래스에서만 사용
  private: sn: number; //자기 자신만 사용
  #ssn: number; //ECMAScript Private, 런타임에서도 접근 불가
}
```

# 믹스인

다중상속과 비슷하지만, 다이아몬드 상속은 아니고 한 단계 위의 다중상속개념.  
만약 변수나 함수가 겹치면 최종 값으로 Override됨.  
타입스크립트는 믹스인을 통해 클래스가 확장되었다는 사실을 인지하지 못해서,  
interface를 별도로 정의하여 클래스 간의 상속관계를 선언해줌.  
무조건 쓰지는 않지만, 코드 수준의 응집도에 따라 사용될 수 있음.

```ts
function applyMixins(targetClass: any, baseClasses: any) {
  return baseClasses.forEach((baseClass) => {
    Object.getOwnPropertyNames(baseClass.prototype).forEach((name) => {
      Object.defineProperty(
        targetClass.prototype,
        name,
        Object.getOwnPropertyDescriptor(baseClass.prototype, name) ||
          Object.create(null)
      );
    });
  });
}

class Person {
  greet() {
    console.log(`Hi, I'm Person`);
  }
}

class Student {
  speak() {
    this.greet();
  }
}

interface Student extends Person {}

applyMixins(Student, [Person]);

const student = new Student();
student.speak(); // Hi, I'm Person
```
