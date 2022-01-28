
export type Literal = number | string | boolean

export class Stack<T> {
    private data: Array<T> = []
    constructor() { }
    get size(): number {
        return this.data.length
    }
    empty(): boolean {
        return this.size == 0
    }
    clear() {
        this.data = []
    }
    has(item: T): boolean {
        return this.data.indexOf(item) >= 0
    }
    peek(): T | null {
        return this.empty() ? null : this.data[this.size - 1]
    }
    push(item: T) {
        this.data.push(item)
    }
    pop(): T {
        return this.empty() ? null : this.data.pop()
    }
}

export class Queue<T> {
    private data: Array<T> = []
    constructor() { }
    get size(): number {
        return this.data.length
    }
    empty(): boolean {
        return this.size === 0
    }
    clear() {
        this.data = []
    }
    pop(): T {
        return this.data.shift()
    }
    push(item: T) {
        this.data.push(item)
    }
}

export class Graph<V, E> {
    private graph: Map<V, Map<E, Set<V>>>
    constructor() {
        this.graph = new Map<V, Map<E, Set<V>>>()
    }
    get size() {
        return this.graph.size
    }
    add_vex(vex: V): Graph<V, E> {
        if (!this.graph.has(vex))
            this.graph.set(vex, new Map<E, Set<V>>())
        return this
    }
    add_arc(vex1: V, vex2: V, arc: E) {
        if (!this.graph.has(vex1))
            this.add_vex(vex1)
        if (!this.graph.has(vex2))
            this.add_vex(vex2)
        this.graph.get(vex1).has(arc)
        ? this.graph.get(vex1).get(arc).add(vex2)
        : this.graph.get(vex1).set(arc, new Set([vex2]))
        return this
    }
    remove_vex(vex: V) {
        if (this.graph.has(vex))
            this.graph.delete(vex)
        this.graph.forEach( arcs => arcs.forEach(v => v.delete(vex)))
        return this
    }
    remove_arc(vex1: V, vex2: V, arc: E) {
        if (this.graph.has(vex1) && this.graph.has(vex2))
            this.graph.get(vex1).get(arc)?.delete(vex2)
        return this
    }
    vertices(): IterableIterator<V> {
        return this.graph.keys()
    }
}

export function hashCode(str: string): number {
    const base = 131
    const MOD = 2147483647 // 1 << 31 - 1
    let hash = 5381
    for (let i = 0; i < str.length; i++) {
        hash = (hash * base + str.charCodeAt(i)) % MOD
    }
    return hash
}

export function hash<T>(iter: Iterable<T>): number {
    return hashCode([...iter].sort().toString())
}