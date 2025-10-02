const tree = {
    value: 1,
    children: [
        { value: 2, children: [{ value: 4, children: [] }, { value: 5, children: []}]},
        { value: 3, children: [{ value: 6, children: [] }, { value: 7, children: []}]},
    ]
}

function dfs(node) {
    // if (!node) return;
    console.log(node.value);

    for (const child of node.children) {
        dfs(child);
    }
}

dfs(tree);
