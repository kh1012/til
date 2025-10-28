function solution(rectangle, characterX, characterY, itemX, itemY) {
    function isOnOutlineRect(x, y, rect) {
        const [x1, y1, x2, y2] = rect;
        const onXEdge = (x === x1 || x === x2) && y >= y1 && y <= y2;
        const onYEdge = (y === y1 || y === y2) && x >= x1 && x <= x2;
        return onXEdge || onYEdge;
    }

    function isInsideRect(x, y, rect) {
        const [x1, y1, x2, y2] = rect;
        return x > x1 && x < x2 && y > y1 && y < y2;
    }

    function isOnOutline(x, y, rects) {
        let onEdge = false;
        let onInside = false;

        for (const rect of rects) {
            if (isOnOutlineRect(x, y, rect)) onEdge = true;
            if (isInsideRect(x, y, rect)) onInside = true;
        }

        return onEdge && !onInside;
    }

    function isOnSameOutline(x1, y1, x2, y2, rects) {
        let onEdge = false;

        for (const rect of rects) {
            if (isOnOutlineRect(x1, y1, rect) && isOnOutlineRect(x2, y2, rect)) {
                onEdge = true;
                break;
            }
        }

        return onEdge;
    }

    const DIR = [
        [1, 0], [-1, 0], [0, -1], [0, 1] //동, 서, 남, 북 dx, dy
    ];

    const visited = new Set([`${characterX}${characterY}`]);
    let queue = [ [characterX, characterY, 0] ];
    let head = 0;

    const parent = {
        [`${characterX}${characterY}`]: 'root'
    }

    while ( head < queue.length ) {
        const [x1, y1, dist] = queue[head++];

        if (x1 === itemX && y1 === itemY) {
            return dist;
        }

        for (const vector of DIR) {
            const [dx, dy] = vector;

            const x2 = x1 + dx;
            const y2 = y1 + dy;

            const str1 = `${x1}${x2}`;
            const str2 = `${y1}${y2}`;

            if (!isOnOutline(x2, y2, rectangle)) continue;
            if (visited.has(`${str1}-${str2}`)) continue;
            visited.add(`${str1}-${str2}`);
            if (!isOnSameOutline(x1, y1, x2, y2, rectangle)) continue;

            queue.push([x2, y2, dist + 1]);
            parent[`${x2}${y2}`] = `${x1}${y1}`;
        }
    }

    return -1;
}

const ret = solution(		[[2, 2, 5, 5], [1, 3, 6, 4], [3, 1, 4, 6]], 1, 4, 6, 3);
console.log(ret);
