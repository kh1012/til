const fibo = (idx: number, memo: { [key: number]: number } = {}): number => {
    if (idx <= 2) return 1;
    if (idx in memo) return memo[idx];
    memo[idx] = fibo(idx - 1, memo) + fibo(idx - 2, memo);
    return memo[idx];
}

const ret = fibo(10);
console.log(ret);
