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
        if (isInsideRect(x, y, rect)) {
            onInside = true;
            break;
        }
        onEdge = isOnOutlineRect(x, y, rect);
    }

    return onEdge && !onInside;
}

function solution(rectangle, characterX, characterY, itemX, itemY) {
    var answer = 0;

    const DIR = [
        [1, 0], [-1, 0], [0, -1], [0, 1] //동, 서, 남, 북 dx, dy
    ];

    let queue = [ [characterX, characterY, 0] ];
    let head = 0;

    while ( head < queue.length ) {
        const [x, y, dist] = queue[head++];

        if (x === itemX && y === itemY) return dist;

        for (const vector of DIR) {
            const [dx, dy] = vector;

            const nx = x + dx;
            const ny = y + dy;

            console.log(`현재 ${x}, ${y} -> ${nx}, ${ny}`);

            if (isOnOutline(nx, ny, rectangle)) {
                queue.push([nx, ny, dist + 1]);
            }
        }
    }

    return answer;
}

const rectangles = [[1,1,7,4],[3,2,5,5],[4,3,6,9],[2,6,8,8]];
solution(rectangles, 1, 3, 7, 8);

