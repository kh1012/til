---
type: "content"
domain: "frontend"
category: "javascript"
topic: "bit masking"
updatedAt: "2026-03-04"

satisfaction:
  score: 90
  reason: "오랜만에 비트마스킹, 역시 지구 최강 연산"

keywords:
  - "bit masking"

relatedCategories:
  - "javascript"
  - "typescript"
  - "algorithm"
---

# Bit Masking

> C++ 시절에도 수 많은 클래스에 연산을 담당했던 비트마스킹.  
  
프론트 라이브러리 혹은 프레임워크의 상태관리를 하다보면 크게 쓸일은 없긴한데,  
만약 클라이언트 연산만으로 뭔갈 계산해야 한다면, 가독성을 높여 아주 빠른 연산을 시킬 수 있지 않을까 싶어 다시 공부해봤다.  
0과 1로 스위치를 켜고 끄듯, 플래그를 아주 작은 공간에 표현하는 근사한 기술이다.  

자주 사용하는 건, 좌측 시프트 연산이다. `<<` 목적구를 얼만큼 이동할 것 인가?  
```ts
1 << i // 1을 i만큼 이동시키겠다.

// 2진수의 자릿 수는 우측에서 0부터 시작한다.
1 << 0 // 1 (=== 0001)
1 << 1 // 2 (=== 0010)
1 << 2 // 4 (=== 0100)
1 << 3 // 8 (=== 1000)
```

여기서 약간의 트릭을 넣으면, 해당 비트를 켜고, 끄고, 확인하고, 토글 동작까지 연산자를 통해 구현이 가능하다.  
```ts
class BitMask {
  private _mask: number;
  
  constructor(private _length: number) {
    this._length = _length;
  }

  turnOn(bitPos: number): void { this._mask |= (1 << bitPos); }
  turnOff(bitPos: number): void { this._mask &= ~(1 << bitPos); }
  check(bitPos: number): boolean { return (this._mask &= (1 << bitPos)) === 1 ? true : false; }
  toggle(bitPos: number): void { this._mask ^ (1 << bitPos); }
  
  getCount(): number {
    let count = 0;
    for (let i = 0; i < this._length; ++i) {
      if (this._mask & (1 << i)) ++count;
    }
    return count;
  }
}
```

연산 속도가 굉장히 빠르기 때문에,  
특정 조건을 빠르게 판단하는 로직을 작성한다면 수가 늘어나면 날수록 성능상의 이점을 볼 수 있게 된다.  
예를 들어, 비트마스크 객체를 생성하고, 모두 켜져있는지 체크하는 로직을 작성한다면 아래 처럼 작성할 수 있다.  
```ts
const bitMask = new BitMask(8); //8자리만 쓰겠다.
bitMask.turnOn(0); // 0000 0001 첫째자리를 켬.
bitMask.turnOn(4); // 0001 0001 네번째 자리를 켬.
bitMask.getCount(); // 2개가 켜져있음.
```

일상생활에서 채점을 하던, 펜으로 동그라미를 치던, 동작을 수행한다면,    
```ts
class ScoringMachine extends BitMask {
  constructor(private _submitted: number[], private _answers: number[]) {
    super(_submitted.length);
    this._submitted = _submitted;
    this._answers = _answers;
  }
  
  score() {
    for (let i = 0; i < this._submitted.length; ++i) {
      (this._submitted[i] === this._answers[i]) ?
        super.turnOn(i) : super.turnOff(i);
    }
    
    return super.getCount();
  }
}

const machine = new ScoringMachine(submitted, answers); //제출 답안지, 정답지
const answerCount = machine.score(); //채점 후 정답 갯수 반환
```
