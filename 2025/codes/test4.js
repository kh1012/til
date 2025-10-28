function solution(tickets) {
    const graph = {};
    tickets.forEach((path) => {
        const [st, ed] = path;

        if (!(st in graph)) graph[st] = [];
        if (!(ed in graph)) graph[ed] = [];

        if (graph[st].length !== 0) {
            graph[st].push(ed);
        } else {
            graph[st] = [ ed ];
        }
    });

    const reverseGraph = {};
    for (const [k ,v] of Object.entries(graph)) {
        reverseGraph[k] = v.reverse();
    }

    const x = "ICN";
    var answer = [ x ];

    function dfs(path, visited = new Set()) {
        if (visited.has(path)) return;
        visited.add(path);

        const x2 = path.split("-")[1];
        answer.push(x2);

        while (reverseGraph[x2].length !== 0) {
            const x3 = reverseGraph[x2].pop();
            dfs(`${x2}-${x3}`, visited);
        }
    }

    dfs(`${x}-${reverseGraph[x].pop()}`);

    return answer;
}

solution([["ICN", "SFO"], ["ICN", "ATL"], ["SFO", "ATL"], ["ATL", "ICN"], ["ATL","SFO"]])
