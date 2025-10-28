function solution(citations) {
    citations.sort((a, b) => b - a);
    let res = 0;
    for (const h of citations) {
        const reports = citations.filter((citation) => citation >= h);
        if (reports.length >= h) {
            res = h;
            break;
        }
    }
    return res;
}

console.log(solution([0,0,1,2,2]));
