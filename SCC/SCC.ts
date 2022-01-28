import { hashCode, hash, Literal, Queue, Stack } from "./utils"
import { Regex } from "./regex"

export namespace SCC {

class Token {
    type: string
    value: Literal
    raw: string
    constructor(type: string, raw: string, value: Literal) {
        this.type = type
        this.raw = raw
        this.value = value
    }
}

type Rule = {
    regex: Regex.Regex,
    action: (raw: string) => Literal
}

export class Lexer {
    private _charset = new Set<string>()
    private _rules = new Map<string, Rule>()
    private _keywords = new Set<string>()
    private _blanks = new Set<string>()
    private _dfa: DFA
    constructor() { }
    rule(type: string, regex: string,
            action: (raw: string) => Literal = raw => raw): Lexer {
        this._rules.set(type, {
            regex: new Regex.Regex(`(${regex})`, `$\{${type}}`),
            action: action
        })
        return this
    }
    build() {
        let followpos: Map<Regex.Leaf, Set<Regex.Leaf>> = null
        let firstpos: Set<Regex.Leaf> = null
        for (const rule of this._rules.values()) {
            this.update_charset(rule.regex.charset)
            if (firstpos === null && followpos === null) {
                followpos = rule.regex.followpos
                firstpos = rule.regex.firstpos
            } else {
                firstpos = new Set([...firstpos, ...rule.regex.firstpos])
                followpos = new Map([...Array.from(followpos), ...Array.from(rule.regex.followpos)])
            }
        }
        this._dfa = new DFA(firstpos, followpos, this._charset)
    }
    private update_charset(charset: Set<string>) {
        charset.forEach(char => this._charset.add(char))
    }
    parse(src: string): Generator<Token> {
        function* stringstream(text: string) {
            let iter = 0
            while (iter < text.length)
                yield text[iter++]
            yield Regex.END
        }
        const get_token = (state: number, token: string): Token =>  {
            const type = this._dfa.accept(state)
            return type === 'IDENTIFY' && this._keywords.has(token)
                ? new Token('KEYWORD', token, this._rules.get(type).action(token))
                : new Token(type, token, this._rules.get(type).action(token))
        }
        function* next(dfa: DFA, blanks: Set<string>) {
            let state = dfa.start
            let token = ''
            for (const char of stringstream(src)) {
                if (blanks.has(char)) {
                    if (dfa.accept(state)) {
                        yield get_token(state, token)
                        token = ''
                        state = dfa.start
                    } else if(state === dfa.start) {
                        continue
                    } else {
                        throw SyntaxError(`Unrecognized token ${token}, ${state}`)
                    }
                } else {
                    if (dfa.next(state, char)) {
                        state = dfa.next(state, char)
                        token += char
                    } else {
                        if (dfa.accept(state)) {
                            yield get_token(state, token)
                            token = char
                            state = dfa.next(dfa.start, char)
                        } else {
                            throw SyntaxError(`Unrecognized character ${char} at ${src}`)
                        }
                    }
                }
            }
        }
        return next(this._dfa, this._blanks)
    }
    get alphabet() {
        return 'a|b|c|d|e|f|g|h|i|j|k|l|m|n|o|p|q|r|s|t|u|v|w|x|y|z|A|B|C|D|E|F|G|H|I|J|K|L|M|N|O|P|Q|R|S|T|U|V|W|X|Y|Z'
    }
    get digit() {
        return '0|1|2|3|4|5|6|7|8|9'
    }
    get litter() {
        return this.alphabet + '|_'
    }
    get identify() {
        return `(${this.litter})(${this.litter}|${this.digit})*`
    }
    get integer() {
        return `(/-?(1|2|3|4|5|6|7|8|9)(${this.digit})*)|0`
    }
    blanks(chars: string = ' \t\n'): Lexer {
        for (const char of chars) this._blanks.add(char)
        return this
    }
}

class DFA {
    start_state: number
    private tran = new Map<number, Map<string, number>>()
    private _accepts = new Map<number, string>()
    constructor(states: Set<Regex.Leaf>, followpos: Map<Regex.Leaf, Set<Regex.Leaf>>, charset: Set<string>) {
        const q = new Queue<Set<Regex.Leaf>>()
        const checked = new Set<number>()
        this.start_state = hash(states)
        q.push(states)
        while (!q.empty()) {
            const state_set = q.pop()
            const state = hash(state_set)
            this.tran.set(state, new Map<string, number>())
            for (const char of charset) {
                const u = new Set<Regex.Leaf>()
                let acc = false
                let type = ''
                state_set.forEach(leaf => {
                    if (leaf.char === char) {
                        followpos.get(leaf).forEach(ele => {
                            u.add(ele)
                            if (ele.char.startsWith('${') && ele.char.endsWith('}')) {
                                acc = true
                                type = ele.char.slice(2, ele.char.length - 1)
                            }
                        })
                    }
                })
                if (u.size === 0) continue
                const new_state = hash(u)
                this.tran.get(state).set(char, new_state)
                if (acc) {
                    this._accepts.set(new_state, type)
                }
                if (!checked.has(new_state)) {
                    checked.add(new_state)
                    q.push(u)
                }
            }
        }
        console.log(this.tran.size)
        this.minimize()
        console.log(this.tran.size)
    }
    get start() {
        return this.start_state
    }
    accept(state: number) {
        return this._accepts.get(state)
    }
    next(state: number, char: string) {
        return this.tran.get(state)?.get(char)
    }
    private minimize() {
        const hash_state = (arcs, state: number) => {
            const code = `acc=${this._accepts.has(state)},type=${this._accepts.get(state)},next=${Array.from(arcs).sort()}`
            return hashCode(code)
        }
        let size = 0
        do {
            size = this.tran.size
            const hash_table = new Map<number, number>()
            this.tran.forEach((arcs, state) => {
                const state_code = hash_state(arcs, state)
                if (hash_table.has(state_code)) {
                    this.tran.delete(state)
                    this._accepts.delete(state)
                    this.tran.forEach((arcs, vex) => {
                        arcs.forEach((v, char) => {
                            if (v === state) {
                                arcs.delete(char)
                                this.tran.get(vex).set(char, hash_table.get(state_code))
                            }
                        })
                    })
                } else {
                    hash_table.set(state_code, state)
                }
            })
        } while (this.tran.size < size)
    }
}

}