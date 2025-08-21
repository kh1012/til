# Closure (클로저)

```ts
function createClosure() {
    let count = 0;
    
    function closureFunction() {
        return ++counter;
    }

    return closureFunction;
};

const c1 = createClosure();
const c2 = createClosure();

console.log(c1()); // 1
console.log(c1()); // 2
console.log(c2()); // 1
console.log(c2()); // 2
```

- 클래스가 나오기 전, 내부 변수의 독립성, '은닉'을 위한 기법이었음.
- 스코프 체인 (closureFunction -> createClosure -> global) 내에 있는 변수를 모두 기억하며 생성됨.
- 클로저를 생성하여 c1, c2와 같은 변수에 참조하면 해당 변수가 가비지 컬렉터에 의해 해제되기 전까지 살아있게 됨.