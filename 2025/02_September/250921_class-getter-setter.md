---
type: "skill"
domain: "frontend"
category: "javascript"
topic: "class-vs-prototype"
updatedAt: "2025-11-30"

keywords:
  - "class"
  - "getter"
  - "setter"
  - "implements"
  - "interface"
  - "mixin"
  - "abstract"
  - "encapsulation"

relatedCategories:
  - "javascript"
  - "oop"
---

# 클래스의 getter, setter와 implements

TypeScript 클래스에서 getter/setter를 활용한 캡슐화 패턴과 implements 키워드의 사용법을 정리한다.  
변수처럼 사용할 수 있는 getter/setter 패턴은 유효성 검사나 디버깅 포인트를 잡기에 유용하다.

# getter, setter

```ts
class Store {
  private _currentPage: number;

  constructor() { ... }

  get currentPage(): number {
    return this._currentPage;
  }

  set currentPage(pageNumber: number): void {
    this._currentPage = pageNumber;
  }
}
```

클래스 내 변수에 바로 접근을 막고, 유효성 검사나 새로운 조합에 대한 기능을 일괄로 제공할 때에 적합해보인다.  
그리고 디버깅 포인트를 한번에 잡아 문제를 수정하기에도 역시 유용해보인다.  
위와 같은 패턴을 적극적으로 사용해야겠다.

# implements

interface와 조합해서 사용하는게 일반적.  
interface는 타입스크립트에서 형태만 정의하는 것.
여기서 class와 implements를 통해 관계를 가지게 되면, 해당 형태를 가지고 구현했어 라는 선언.  
좀 모호한게, 여기서 implements와 믹스인의 개념이 조금 혼용된다.  
다시 생각해보면, mixins는 이미 기능이 구현되어 있고 조립하는 Composite의 형태.  
implements는 말 그대로 interface만 넘겨주고 변수 및 함수의 클래스 시그니쳐만 강제하는 형태.  
implements는 껍데기만 제공하는 걸로 볼 수 있다.

```ts
interface Animal {
  name: string;
  makeSound(): void;
}

class Dog implements Animal {
  private _name: string;

  constructor(name: string) {
    this._name = name;
  }

  makeSound() {
    console.log("왈왈");
  }

  get name(): string {
    // implements 키워드를 통해 name을 반드시 추가해야하지만, getter도 인정함.
    return this._name;
  }
}
```

mixin의 경우에는 아래와 같음.

```ts
//추상화된 동물 클래스가 있다.
//강아지 클래스는 동물 클래스의 기본 형태를 모두 상속받는다.
//믹스인을 통해 기본 움직임 동작에 대해 정의가 되어야 한다.

//베이스 클래스 정의
interface IAnimal {
  name: string;
  makeSound(): void;
}

abstract class Animal implements IAnimal {
  private _name: string;

  constructor(name: string) {
    this._name = name;
  }

  get name(): string {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }

  abstract makeSound(): void;
}

// 믹스인 사용위한 제네릭
type Constructor<T = {}> = new (...args: any[]) => T;

//기능 클래스 정의
function Move<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    move() {
      console.log("moving!!");
    }
  };
}

//강아지 클래스 정의: 동물 추상 클래스 기본 상속
class Dog extends Animal {
  constructor() {
    super("강아지");
  }

  makeSound(): void {
    console.log("wahhhhh");
  }
}

//강아지 클래스 정의: 무빙 기능 추가 (믹스인)
class AdvancedDog extends Move(Dog) {}

//사용예시
const dog = new Dog();
dog.makeSound(); // OK: "wahhhhh"
// dog.move();        // 컴파일 에러: Dog에는 move가 없음

const advancedDog = new AdvancedDog();
advancedDog.makeSound(); // OK: "wahhhhh"
advancedDog.move(); // OK: "moving!!"
```
