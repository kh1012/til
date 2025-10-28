const graph = {
    A: ["B", "C"],
    B: ["D", "E"],
    C: ["F", "G"],
    D: [],
    E: [],
    F: [],
    G: [],
};

function bfs(start, goal) {
    const visited = new Set([start]); //중복검사를 위한 변수
    const targets = [start]; //탐색순서를 기록하기 위한 변수
    let frontIndex = 0; //탐색할 지점을 표시하기 위한 index

    const dist = new Map([[start, 0]]);
    const prev = new Map();

    while (frontIndex < targets.length) {
        const target = targets[frontIndex];
        if (target === goal) break;

        for (const neighbor of graph[target]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                targets.push(neighbor);

                dist.set(neighbor, dist.get(target) + 1);
                prev.set(neighbor, target);
            }
        }

        frontIndex++;
    }

    const path = [];
    for (let cur = goal; cur !== undefined; cur = prev.get(cur)) {
        path.push(cur);
        if (cur === start) break;
    }
    path.reverse();

    return {
        distance: dist.get(goal),
        path,
    }
}


const { distance, path } = bfs("A", "G");

console.log(distance);
console.log(path);
