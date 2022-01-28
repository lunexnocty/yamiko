import { Stack } from "./utils"

export namespace Regex {

export enum OP {
    RP, LP, OR, CONCAT, PCLOSURE, EXSIT, CLOSURE
}

export const END = 'END'

export class Regex {
    private _regex: string
    private _end: string
    private _syntax: RegexASTNode
    private _followpos = new Map<Leaf, Set<Leaf>>()
    private _syntax_stk = new Stack<RegexASTNode>()
    private _charset = new Set<string>()
    constructor (regex: string, end=END) {
        this._regex = `(${regex})`
        this._end = end
        this.build()
    }
    get nullable() { return this._syntax.nullable }
    get firstpos() { return this._syntax.firstpos }
    get lastpos() { return this._syntax.lastpos }
    get followpos() { return this._followpos }
    get charset() { return this._charset }
    build() {
        function* stream(regex: string) {
            let index = 0
            let prev: string = null
            while (index < regex.length) {
                const char = regex[index] === '/'
                            ? regex[index++] + regex[index++]
                            : regex[index++]
                switch (char) {
                    case '*': yield OP.CLOSURE; break
                    case '?': yield OP.EXSIT; break
                    case '+': yield OP.PCLOSURE; break
                    case '|': yield OP.OR; break
                    case ')': yield OP.RP; break
                    case '(': {
                        if (prev && prev !== '(' && prev !== '|')
                            yield OP.CONCAT
                        yield OP.LP
                        break
                    }
                    default: {
                        if (prev && prev !== '(' && prev !== '|')
                            yield OP.CONCAT
                        yield char.replace('/', '')
                    }
                }
                prev = char
            }
            yield OP.CONCAT
            yield END
        }
        const op_stk = new Stack<OP>()
        for (const char of stream(this._regex)) {
            if (typeof char === 'string') {
                if (char === END) {
                    this._syntax_stk.push(new RegexASTNode(this._end))
                } else {
                    this._syntax_stk.push(new RegexASTNode(char))
                    this._charset.add(char)
                }
            } else if (char === OP.LP) {
                op_stk.push(char)
            } else if (char === OP.RP) {
                while (op_stk.peek() !== OP.LP) {
                    this.execute(op_stk.pop())
                }
                op_stk.pop()
            } else {
                while (!op_stk.empty()
                        && op_stk.peek() !== OP.LP
                        && op_stk.peek() >= char) {
                    this.execute(op_stk.pop())
                }
                op_stk.push(char)
            }
        }
        while (!op_stk.empty()) this.execute(op_stk.pop())
        this._syntax = this._syntax_stk.pop()
    }
    execute(op: OP) {
        const node = new RegexASTNode(op)
        switch (op) {
            case OP.CLOSURE: {
                const operand = this._syntax_stk.pop()
                node.nullable = true
                node.firstpos = new Set(operand.firstpos)
                node.lastpos = new Set(operand.lastpos)
                node.lastpos.forEach(state => {
                    if (!this._followpos.has(state)) this._followpos.set(state, new Set<Leaf>())
                    node.firstpos.forEach(leaf => {
                        this._followpos.get(state).add(leaf)
                    })
                })
                break
            }
            case OP.CONCAT: {
                const operand_2 = this._syntax_stk.pop()
                const operand_1 = this._syntax_stk.pop()
                node.nullable = operand_1.nullable && operand_2.nullable
                node.firstpos = operand_1.nullable
                                ? new Set([...operand_1.firstpos, ...operand_2.firstpos])
                                : new Set(operand_1.firstpos)
                node.lastpos = operand_2.nullable
                                ? new Set([...operand_1.lastpos, ...operand_2.lastpos])
                                : new Set(operand_2.lastpos)
                operand_1.lastpos.forEach(state => {
                    if (!this._followpos.has(state)) this._followpos.set(state, new Set<Leaf>())
                    operand_2.firstpos.forEach(leaf => {
                        this._followpos.get(state).add(leaf)
                    })
                })
                break
            }
            case OP.OR: {
                const operand_2 = this._syntax_stk.pop()
                const operand_1 = this._syntax_stk.pop()
                node.nullable = operand_1.nullable || operand_2.nullable
                node.firstpos = new Set([...operand_1.firstpos, ...operand_2.firstpos])
                node.lastpos = new Set([...operand_1.lastpos, ...operand_2.lastpos])
                break
            }
            case OP.EXSIT: {
                const operand = this._syntax_stk.pop()
                node.nullable = true
                node.firstpos = new Set(operand.firstpos)
                node.lastpos = new Set(operand.lastpos)
                node.lastpos.forEach(state => {
                    if (!this._followpos.has(state)) this._followpos.set(state, new Set<Leaf>())
                    node.firstpos.forEach(leaf => {
                        this._followpos.get(state).add(leaf)
                    })
                })
                break
            }
            case OP.PCLOSURE: {
                const operand = this._syntax_stk.pop()
                node.nullable = operand.nullable
                node.firstpos = new Set(operand.firstpos)
                node.lastpos = new Set(operand.lastpos)
                node.lastpos.forEach(state => {
                    if (!this._followpos.has(state)) this._followpos.set(state, new Set<Leaf>())
                    node.firstpos.forEach(leaf => {
                        this._followpos.get(state).add(leaf)
                    })
                })
                break
            }
            default: break
        }
        this._syntax_stk.push(node)
    }
}

export class Leaf {
    private static _uuid: number = 1
    private _id: number
    private _char: string
    constructor(char: string) {
        this._char = char
        this._id = Leaf._uuid ++
    }
    get id() {
        return this._id
    }
    get char() {
        return this._char
    }
    toString() {
        return this.id.toString()
    }
}

class RegexASTNode {
    value: string | OP
    leaf?: Leaf
    nullable: boolean | undefined
    firstpos = new Set<Leaf>()
    lastpos = new Set<Leaf>()
    constructor(value: string | OP) {
        this.value = value
        if (typeof value === 'string') {
            this.leaf = new Leaf(value)
            this.nullable = value === END || value.length === 0
            this.firstpos.add(this.leaf)
            this.lastpos.add(this.leaf)
        }
    }
}

}