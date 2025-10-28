let q = [3,6,1,2,4,5,9,8,7];
const t = 4;

const bs = (arr: number[], target: number) => {
    arr.sort((a, b) => a - b);

    let ct = 1;
    let lo = 0;
    let hi = arr.length - 1;

    if (target < arr[lo] || target > arr[hi]) {
        console.log('값이 범위에 없음')
        return false;
    }

    while (lo <= hi) {
        console.log(`${ct++}회차 try`)
        const mid = Math.floor((hi + lo) / 2);
        if (arr[mid] === target) {
            console.log(`[${mid}] 인덱스 발견!`, arr[mid]);
            return true;
        } else if (arr[mid] > target) {
            hi = mid - 1;
        } else {
            lo = mid + 1;
        }
    }

    console.log('못찾음');
    return false;
}

bs(q, t);
