function solution(game_board, table) {
    var answer = -1;

    function normalize(blocks) {
        const minR = Math.min(...blocks.map((r, c) => r));
        const minC = Math.min(...blocks.map((r, c) => c));
        const normalized = blocks.map((r, c) => [r - minR, c - minC]);
        normalized.sort();
        return normalized;
    }

    function extractBlankBlocks(board) {
        const target = 0;
        const n = board.length;
        const m = board[0].length;

        const visited = Array.from({ length: n }, () => Array(m).fill(false));
        const isInside = (r, c) => r >= 0 && r < n && c >= 0 && c < m;
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];

        const blocks = [];
        for (let r = 0; r < n; r++) {
            for (let c = 0; c < m; c++) {
                //시작점을 선정! 방문 안했고 '0'인놈들
                if (visited[r][c] || board[r][c] !== target) continue;

                let head = 0;
                const queue = [[r, c]];
                visited[r][c] = true;

                const cells = [];
                while (head < queue.length) {
                    const [sr, sc] = queue[head++];
                    cells.push([sr, sc]);

                    for (const dir of dirs) {
                        const [dr, dc] = dir;
                        const nr = sr + dr;
                        const nc = sc + dc;

                        //안에 있니? 0이니? 방문했던 곳이니?
                        if (!isInside(nr, nc)) continue;
                        if (board[nr][nc] !== target) continue;
                        if (visited[nr][nc]) continue;

                        queue.push([nr, nc]);
                        visited[nr][nc] = true;
                    }
                }

                blocks.push(cells);
            }
        }

        return blocks;
    }

    const blankBlocks = extractBlankBlocks(game_board);

    return {
        answer,
        temp: blankBlocks
    }
}

const temp = solution([[1, 1, 0, 0, 1, 0], [0, 0, 1, 0, 1, 0], [0, 1, 1, 0, 0, 1], [1, 1, 0, 1, 1, 1], [1, 0, 0, 0, 1, 0], [0, 1, 1, 1, 0, 0]], [[1, 0, 0, 1, 1, 0], [1, 0, 1, 0, 1, 0], [0, 1, 1, 0, 1, 1], [0, 0, 1, 0, 0, 0], [1, 1, 0, 1, 1, 0], [0, 1, 0, 0, 0, 0]]).temp;
console.log(temp);

