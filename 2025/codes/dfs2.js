const graph = {
    1: [2, 3],
    2: [4],
    3: [4, 5],
    4: [],
    5: [],
}

const dfs = (here, visited = new Set()) => {
    if (visited.has(here)) return;
    visited.add(here);
    console.log(here);
    graph[here].forEach((node) => dfs(node, visited));
}

dfs(3);
