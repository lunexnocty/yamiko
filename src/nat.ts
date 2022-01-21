import { Context, Session } from "koishi";

enum VarType {
    Nan,
    Proposition
}

type Item = {
    name: string
    value?: string
    type: VarType
}
class Goal {
    private items: Item[] = []
    private err: string | null
    constructor(items: Item[]) {
        this.items = items
    }
    str(): string {
        const out: string[] = []
        this.items.forEach(item => {
            if (item.name == 'goal') {
                out.push(`⊩: ${item.value}`)
            } else {
                out.push(`${item.name}: ${item.value ? item.value : item.type.toString()}`)
            }
        })
        return out.join('\n')
    }
    complete(): boolean {
        return this.items.length == 0
    }
    reflexivity(): void {
        const values = this.items[this.items.length - 1].value.split('=', 2)
        if (values[0] === values[1]) {
            this.items.pop()
            while (this.items.length > 0 && this.items[this.items.length - 1]?.name != 'goal') {
                this.items.pop()
            }
        } else {
            this.error('不满足自反性')
        }
    }
    rewrite(proposition: string): void {
        if (!proposition) {
            this.error('rewrite需要一个命题作为参数')
            return
        }
        const prop = this.items.find(item => item.name == proposition)
        console.log(prop)
        if (prop.type != VarType.Proposition) {
            this.error('rewrite的参数只能是命题')
        } else {
            const values = prop.value.split('=', 2)
            console.log(values)
            this.items[this.items.length - 1].value = this.items[this.items.length - 1].value.replaceAll(values[0], `(${values[1]})`)
        }
    }
    induction(variable: string, name: string): void {
        if (!variable || !name) {
            this.error('归纳需要被归纳的变量和一个新的标识符作为参数')
            return
        }
        const goal = this.items[this.items.length - 1]
        if (goal.value.search(variable) == -1) {
            this.error(`${variable} 不存在，只能对goal中存在的自然数进行归纳`)
        } else if (this.items.find(item => item.name == variable)?.type != VarType.Nan) {
            this.error(`${variable} 不是自然数，只能对goal中存在的自然数进行归纳`)
        } else if (this.items.find(item => item.name == name)) {
            this.error(`${name} 已存在，请换一个不存在的标识符`)
        } else {
            this.items.pop()
            this.items.push({ name: 'goal', type: VarType.Proposition, value: goal.value.replaceAll(variable, '0') })
            this.items.push({ name: name, type: VarType.Proposition, value: goal.value })
            this.items.push({ name: 'goal', type: VarType.Proposition, value: goal.value.replaceAll(variable, `succ(${variable})`) })
        }
    }
    error(message: string): void
    error(session: Session): void
    error(arg: string | Session): void {
        if (typeof arg == 'string') {
            this.err = arg
        } else {
            if (this.err) {
                arg.sendQueued(this.err)
                this.err = null
            }
        }
    }
}

class Nat {
    static readonly usage: string = ''
    private level = 0
    private goal: Goal | null
    private levels: Goal[] = [
        new Goal([
            { name: 'x', type: VarType.Nan },
            { name: 'goal', type: VarType.Proposition, value: 'x=x' }
        ]),
        new Goal([
            { name: 'x', type: VarType.Nan },
            { name: 'y', type: VarType.Nan },
            { name: 'h', type: VarType.Proposition, value: 'y=x+7' },
            { name: 'goal', type: VarType.Proposition, value: '2*y=2*(x+7)' }
        ]),
        new Goal([
            { name: 'a', type: VarType.Nan },
            { name: 'b', type: VarType.Nan },
            { name: 'h', type: VarType.Proposition, value: 'succ(a)=b' },
            { name: 'goal', type: VarType.Proposition, value: 'succ(succ(a))=succ(b)' }
        ])
    ]
    constructor() {
        this.goal = this.levels[0]
    }
    async begin(session: Session, action: string, params: string[]) {
        console.log(action, params)
        switch (action) {
            case 'reflexivity': this.goal.reflexivity(); break
            case 'rewrite': this.goal.rewrite(params[0]); break
            case 'induction': this.goal.induction(params[0], params[1]); break
            default: break
        }
        this.goal.error(session)
        if (this.goal.complete()) {
            await session.sendQueued(`QED.`)
            this.level ++
            if (this.level == this.levels.length) {
                session.sendQueued('已通关')
                this.goal = null
            } else {
                this.goal = this.levels[this.level]
            }
        }
        this.state(session)
    }
    state(session: Session): void {
        if (this.goal) {
            session.sendQueued(`level: ${this.level}\ngoals:\n${this.goal.str()}`)
        } else {
            session.sendQueued('No Data')
        }
    }
}

const states: Map<string, Nat> = new Map()

export default function apply(ctx: Context) {
    const app = ctx.command('nat')
        .usage(Nat.usage)
        .action( ({ session }) => {
            session.execute('help math')
        })
    app.subcommand('.begin <action:text> [...params]', '开始游戏')
        .shortcut('reflexivity', { args: ['reflexivity'] })
        .shortcut('rewrite', { args: ['rewrite', ], fuzzy: true })
        .shortcut('induction', { args: ['induction'], fuzzy: true })
        .action(async ({ session }, action, ...params) => {
            const uid = session.userId
            if (!states.has(uid)) {
                session.sendQueued('还没有记录，使用[math.new]创建新存档')
                return
            }
            await states.get(uid).begin(session, action, params)
        })
    app.subcommand('.new', '新游戏')
        .option('reset', '--reset')
        .action(({ session, options }) => {
            const uid = session.userId
            if (states.has(uid) && !options.reset) {
                session.sendQueued('存档已存在，使用 --reset 重置存档')
                return
            }
            states.set(uid, new Nat())
            session.sendQueued('存档创建成功')
        })
    app.subcommand('.state', '当前状态')
        .action(({ session }) => {
            const uid = session.userId
            if (!states.has(uid)) {
                session.sendQueued('还没有记录，使用[math.new]创建新存档')
                return
            }
            states.get(uid).state(session)
        })
}