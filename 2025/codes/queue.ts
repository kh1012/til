class Queue {
    private _data: number[];
    private front: number;

    constructor(arr: number[] = []) {
        this._data = arr;
        this.front = 0;
    }

    enqueue(value: number) {
        this._data.push(value);
    }

    dequeue(): number {
        if (this.isEmpty()) return null;
        return this._data[this.front++];
    }

    isEmpty() {
        return this._data.length - this.front === 0;
    }

    get data() {
        return this._data.slice(this.front);
    }
}

const q = new Queue([1,2,3,4,5]);

q.enqueue(6);
q.dequeue();
q.dequeue();
q.dequeue();
console.log(q.data);
