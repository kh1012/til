function createPriorityQueue(compareFn = (a, b) => a - b) {
    const heap = [];
    const size = () => heap.length;
    const isEmpty = () => heap.length === 0;
    const peek = () => isEmpty() ? null : heap[0];
    const clear = () => heap.length = 0;
    const replaceHeap = (arr) => {
        clear();
        for (let i = 0; i < arr.length; i++) heap[i] = arr[i];
    }
    const parent = (i) => (i - 1) >> 1;
    const left = (i) => (i << 1) + 1;
    const right = (i) => (i << 1) + 2;
    const swap = (i, j) => [heap[i], heap[j]] = [heap[j], heap[i]];

    const up = (i) => {
        while (i > 0 && compareFn(heap[i], heap[parent(i)]) < 0) {
            swap(i, parent(i));
            i = parent(i);
        }
    }

    const down = (i) => {
        while (true) {
            let best = i;
            const l = left(i);
            const r = right(i);

            if (l < size() && compareFn(heap[l], heap[best]) < 0) best = l;
            if (r < size() && compareFn(heap[r], heap[best]) < 0) best = r;
            if (i === best) break;

            swap(i, best);
            i = best;
        }
    }

    return {
        push: (v) => {
            heap.push(v);
            up(size() - 1);
        },
        pop: (v) => {
            if (isEmpty()) return null;
            if (size() === 1) return heap.pop();

            const top = heap[0];
            heap[0] = heap.pop();
            down(0);
            return top;
        },
        heapify: (arr) => {
            replaceHeap(arr);
            for (let i = parent(size() - 1); i >= 0; i--) down(i);
        },
        peek,
        size,
        isEmpty,
        print: () => {
            for (let i = 0; i < size(); i++) {
                const l = left(i);
                const r = right(i);
                console.log(`[${i}] ${heap[i]} / l: ${heap[l]} r: ${heap[r]}`);
            }
        }
    }
}

const pq = createPriorityQueue((a, b) => b - a);
pq.heapify([5,2,3,4,1,6,9,8,7]);
pq.print();
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
console.log(pq.pop());
