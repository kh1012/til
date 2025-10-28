const graph = {
    A: ["B", "C"],
    B: ["D", "E"],
    C: ["F", "G"],
    D: [],
    E: [],
    F: [],
    G: [],
};

function dfs(node, visited = new Set()) {
    if (visited.has(node)) return;
    console.log(node);
    visited.add(node);

    for (const neighbor of graph[node]) {
        dfs(neighbor, visited);
    }
}

dfs("A");
