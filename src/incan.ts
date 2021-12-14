import { Session, segment, Random } from "koishi"

enum State {
    IDLE,
    MATCHING,
    EXPLORING
}

enum PlayerState {
    UNDETERMINED,
    FORWARD,
    LEAVE,
    INCAMP
}

class Player {
    uid: string
    state: PlayerState = PlayerState.INCAMP
    rucksack: Map<string, number> = new Map()
    camp: Map<string, number> = new Map()
    value: number = 0
    relic: number = 0
    constructor (uid: string) {
        this.uid = uid
    }
    count(): void {
        this.camp.forEach((amout, name) => {
            switch (name) {
                case 'Turquoise': this.value += amout; break
                case 'Obsidian' : this.value += amout * 5; break
                case 'Gold'     : this.value += amout * 10; break
                default: this.relic += 1
            }
        })
    }
    add_gemstone(name: string, amout: number) {
        this.rucksack.set(name, amout + (this.rucksack.has(name) ? this.rucksack.get(name) : 0))
    }
    back_to_camp() {
        this.state = PlayerState.INCAMP
        this.rucksack.forEach( (amout, name) => {
            this.camp.set(name, amout + (this.camp.has(name) ? this.camp.get(name) : 0))
        })
        this.rucksack.clear()
    }
}

enum CardType {
    GENSTONE,
    CALAMITY,
    RELIC
}
interface Card {
    type: CardType
    name: string
    value: number
    amount: number
    desc: string
}

class Incan {
    static readonly rule: string = [
        '创建一支3~8人的队伍，探索5座神庙，在探索中会发现财宝和神器，也可能遇到不可预知的灾难，你们需要谨慎的决定去留，收获财宝与荣耀！',
        '游戏中共15张财宝卡。5种灾难卡，每种各3张。每座神庙里各有一张神器卡。',
        '如果遇见财宝，在场的玩家都可参与分配，平分财宝，并将不能平分的财宝留在原地。',
        '如果遇见灾难，在第二次或第三次遇见时会被强制驱逐出神殿，并丢失本轮中获得的一切财宝，该张灾难卡被永久移除。',
        '如果遇见神器，当且仅当一个玩家参与分配时获得，如果无人获得神器，它将永久丢失。',
        '向着传说与宝藏！'
    ].join('\n')
    static readonly instruct: string = [
        '[招募] 发布招募公告，创建一支队伍',
        '[加入] 加入已经存在的队伍',
        '[出发] 出发探索神庙',
        '[前进/冲] 继续探索',
        '[回营地/返回] 回到营地',
        '[状态] 查看当前状态',
        '[指令] 查询指令'
    ].join('\n')
    static readonly desc: string = '印加宝藏verion 1.0.0'
    deck: Card[] = []
    relics: Card[] = []
    players: Player[] = []
    leader: string = ''
    state: State = State.IDLE
    session: Session
    round: number = 0
    turn: number = 0
    route: Card[] = []
    calamitys: Map<string, boolean> = new Map()

    constructor (session: Session) {
        this.session = session
        this.reset_deck()
    }
    reset_deck(): void {
        this.relics.push({ type: CardType.RELIC, name: 'Faith', value: 0, amount: 1, desc: '信仰是精神的支柱！' })
        this.relics.push({ type: CardType.RELIC, name: 'Knowledge', value: 0, amount: 1, desc: '知识就是力量！' })
        this.relics.push({ type: CardType.RELIC, name: 'Insist', value: 0, amount: 1, desc: '坚持不会背叛！' })
        this.relics.push({ type: CardType.RELIC, name: 'Sword', value: 0, amount: 1, desc: '无坚不摧的剑！' })
        this.relics.push({ type: CardType.RELIC, name: 'Shield', value: 0, amount: 1, desc: '卧槽！盾！' })
        for (let i = 0; i < 3; i++) {
            this.deck.push({ type: CardType.CALAMITY, name: 'Viper', value: 0, amount: 1, desc: '大概是有毒的蛇' })
            this.deck.push({ type: CardType.CALAMITY, name: 'Spider', value: 0, amount: 1, desc: '大概是有毒的蜘蛛' })
            this.deck.push({ type: CardType.CALAMITY, name: 'Mummy', value: 0, amount: 1, desc: '木乃伊？' })
            this.deck.push({ type: CardType.CALAMITY, name: 'Flame', value: 0, amount: 1, desc: '烈焰怪是个什么鬼？' })
            this.deck.push({ type: CardType.CALAMITY, name: 'Collapse', value: 0, amount: 1, desc: '地震！！？' })
        }
        this.deck.push({ type: CardType.GENSTONE, name: 'Turquoise', value: 1, amount: 7, desc: '少量绿松石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Turquoise', value: 1, amount: 9, desc: '少量绿松石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Turquoise', value: 1, amount: 12, desc: '还算可以绿松石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Turquoise', value: 1, amount: 15, desc: '大量绿松石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Turquoise', value: 1, amount: 17, desc: '大量绿松石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Obsidian', value: 5, amount: 3, desc: '少量黑曜石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Obsidian', value: 5, amount: 5, desc: '少量黑曜石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Obsidian', value: 5, amount: 6, desc: '黑曜石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Obsidian', value: 5, amount: 7, desc: '黑曜石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Obsidian', value: 5, amount: 9, desc: '大量黑曜石' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Gold', value: 10, amount: 3, desc: '少量黄金' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Gold', value: 10, amount: 3, desc: '少量黄金' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Gold', value: 10, amount: 4, desc: '卧槽！黄金' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Gold', value: 10, amount: 5, desc: '数量可观的黄金' })
        this.deck.push({ type: CardType.GENSTONE, name: 'Gold', value: 10, amount: 5, desc: '数量可观黄金' })
    }
    forward(uid: string) {
        if (this.state != State.EXPLORING) return
        let player = this.players.find(pl => pl.uid == uid && pl.state != PlayerState.INCAMP)
        if (player && player.state != PlayerState.INCAMP) {
            player.state = PlayerState.FORWARD
            this.update()
        }
    }
    leave(uid: string) {
        if (this.state != State.EXPLORING) return
        let player = this.players.find(pl => pl.uid == uid && pl.state != PlayerState.INCAMP)
        if (player && player.state != PlayerState.INCAMP) {
            player.state = PlayerState.LEAVE
            this.update()
        }
    }
    status(): void {
        switch (this.state) {
            case State.EXPLORING:
                let names = []
                this.calamitys.forEach((v, name) => {
                    if (v) names.push(name)
                })
                let msg: string[] = [names.length ? `目前收到的警告：${names.join('、')}` : '没有收到警告']
                names = []
                this.players.filter(pl => pl.state == PlayerState.UNDETERMINED).forEach( pl => names.push(`${segment('at', { id: pl.uid })} `))
                msg.push(`还在考虑的人：${names.join('、')}`)
                this.session.sendQueued(msg.join('\n'))
                break
            case State.MATCHING:
                this.session.sendQueued(`正在组队...组队进度：${this.players.length}/3`)
                break
            case State.IDLE:
                this.session.sendQueued(`当前没有队伍在探索`)
                break
        }
    }
    recruit(uid: string): void {
        switch (this.state) {
            case State.IDLE:
                this.session.sendQueued(`${segment('at', { id: uid })} 你成功发布了招募公告！`)
                this.leader = uid
                this.state = State.MATCHING
                this.add_player(uid)
                break
            case State.MATCHING:
                this.session.sendQueued(`${segment('at', { id: this.leader })} 已经发布了招募公告，输入[加入]加入队伍`)
                break
            case State.EXPLORING:
                this.session.sendQueued(`${segment('at', { id: this.leader })} 的队伍已经在探索神庙中，请勿同时探索神庙`)
                break
        }
    }
    quit(): void {
        this.session.sendQueued('游戏结束')
    }
    update(): void {
        for (let player of this.players.values()) {
            if (player.state == PlayerState.UNDETERMINED) return
        }
        this.next_turn()
    }
    next_turn(): void {
        let players_leave = this.players.filter(pl => pl.state == PlayerState.LEAVE)
        if (players_leave.length > 0) {
            this.route.forEach(card => {
                switch (card.type) {
                    case CardType.GENSTONE:
                        players_leave.forEach(pl => pl.add_gemstone(card.name, Math.floor(card.amount / players_leave.length)))
                        card.amount %= players_leave.length
                        break
                    case CardType.RELIC:
                        if (players_leave.length == 1) {
                            players_leave.at(0).rucksack.set(card.name, 1)
                        }
                        break
                    default:
                        break
                }
            })
            let msg: string[] = []
            players_leave.forEach(pl => {
                pl.back_to_camp()
                msg.push(`${segment('at', { id: pl.uid })} 决定返回营地。`)
            })
            this.session.sendQueued(msg.join('\n'))
        }
        let players_forward = this.players.filter(pl => pl.state == PlayerState.FORWARD)
        if (players_forward.length > 0) {
            let card = this.deck.splice(Random.int(this.deck.length), 1).at(0)
            this.route.push(card)
            let message: string[] = []
            players_forward.forEach( pl => {
                message.push(`${segment('at', { id: pl.uid})} `)
            })
            this.session.sendQueued(message.join('、') + '决定继续前进')
            switch (card.type) {
                case CardType.GENSTONE:
                    message.push(`你们发现了${card.name}共${card.amount}个，平分了宝藏`)
                    players_forward.forEach(pl => { pl.add_gemstone(card.name, Math.floor(card.amount / players_forward.length)) })
                    card.amount %= players_forward.length
                    message.push(`${card.name}：${card.desc}`)
                    this.session.sendQueued(message.join('\n'))
                    break
                case CardType.CALAMITY:
                    if (this.calamitys.get(card.name)) {
                        message.push(`被${card.name}驱逐出神殿，什么也没得到`)
                        message.push(`${card.name}：${card.desc}`)
                        this.session.sendQueued(message.join('\n'))
                        this.next_round(true)
                    } else {
                        message.push(`收到来自${card.name}的警告`)
                        message.push(`${card.name}：${card.desc}`)
                        this.session.sendQueued(message.join('\n'))
                        this.calamitys.set(card.name, true)
                    }
                    break
                case CardType.RELIC:
                    message.push(`你们发现了${card.name}！但不知道有什么用，于是放着了。`)
                    message.push(`${card.name}：${card.desc}`)
                    this.session.sendQueued(message.join('\n'))
                    break
            }
            players_forward.forEach(pl => pl.state = PlayerState.UNDETERMINED)
        } else {
            this.next_round()
        }
        this.turn ++
    }
    next_round(expel:boolean=false): void {
        if (this.round == 5) {
            this.statistics()
            return
        }
        let msg: string[] = []
        if (this.round > 0) msg.push(`你们结束了第${this.round}个遗迹的探索`)
        msg.push(`开始探索第${this.round + 1}个遗迹`)
        this.session.sendQueued(msg.join('\n'))
        this.players.forEach(pl => { pl.state = PlayerState.FORWARD })
        this.reset_deck()
        if (expel) {
            console.log(this.route, this.route.at(this.route.length - 1))
            let index = this.deck.findIndex( card => card.name === this.route.pop().name)
            if (index != -1) this.deck.splice(index, 1)
        }
        this.route.forEach(card => {
            if (card.type == CardType.RELIC) {
                let index = this.deck.findIndex( ele => ele.name === card.name)
                if (index != -1) this.deck.splice(index, 1)
            }
        })
        this.route = []
        this.deck.push(this.relics.at(this.round))
        this.deck = Random.shuffle(this.deck)
        this.calamitys = new Map([ ['Viper', false], ['Spider', false], ['Mummy', false], ['Flame', false], ['Collapse', false] ])
        this.round ++
        this.turn = 0
        this.next_turn()
    }
    statistics(): void {
        this.state = State.IDLE
        let msg: string[] = []
        this.players.sort((p1, p2) => {
            if (p1.value == p2.value) return p1.relic - p2.relic
            return p1.value - p2.value
        })
        let i = 0
        this.players.forEach(pl => {
            let total = `第${++i}名为：`
            total += segment('at', { id: pl.uid }) + ' 收获了：'
            let harvest: string[] = []
            pl.camp.forEach((amout, name) => {
                harvest.push(`${name}：${amout}个`)
            })
            total += harvest.join('、')
            msg.push(total)
        })
        this.session.sendQueued(msg.join('\n'))
    }
    setout(uid: string): void {
        if (this.players.findIndex( pl => pl.uid === uid) == -1) return
        if (this.state == State.MATCHING) {
            if (this.players.length < 3) {
                this.session.sendQueued('队伍人数不得少于3人')
            } else {
                this.state = State.EXPLORING
                let msg = ['开始探索！', '输入[前进]以寻找更多的宝物', '输入[回营地]返回营地']
                this.session.sendQueued(msg.join('\n'))
                this.next_round()
            }
        } else if (this.state == State.IDLE) {
            this.session.sendQueued('请先加入队伍')
        }
    }
    add_player(uid: string): void {
        if (this.state == State.IDLE) {
            this.session.sendQueued('队伍不存在，请先发布招募公告')
        } else if (this.state == State.EXPLORING) {
            this.session.sendQueued('队伍已经出发，下次来早点')
        } else {
            if (this.players.findIndex( pl => pl.uid === uid) != -1) {
                this.session.sendQueued(segment('at', { id: uid }) + ' 你已经在队伍里了，请勿重复加入')
                return
            }
            this.players.push(new Player(uid))
            if (this.players.length < 3) {
                this.session.sendQueued(`${segment('at', { id: uid })} 加入队伍，组队进度：${this.players.length}/3`)
            } else if (this.players.length < 8) {
                let msg = [`${segment('at', { id: uid })} 加入队伍，已完成组队，当前队伍人数：${this.players.length}`]
                msg.push('可以继续组队，最多8人，也可使用指令[出发]立即开始探索')
                this.session.sendQueued(msg.join('\n'))
            } else {
                this.session.sendQueued('队伍人数已达上限，立即开始探索')
                this.setout(uid)
            }
        }
    }
}

import { Context } from "koishi"

const states: Map<string, Incan> = new Map()

export default function apply(ctx: Context) {
    let app = ctx.command('incan', Incan.desc)
        .alias('印加宝藏')
        .action( _ => {
            return Incan.rule
        })
    app.subcommand('.begin', '开始游戏')
        .alias('来一局印加宝藏')
        .action(({ session }) => {
            const { cid } = session
            if (session.subtype != 'group') {
                return '该游戏为团队游戏，请在群聊里开始游戏'
            } else if (states.get(cid)) {
                return '游戏已存在'
            } else {
                states.set(cid, new Incan(session))
                return Incan.instruct
            }
        })

    app.subcommand('.quit', '结束游戏', { hidden: true })
        .alias('退出', '结束')
        .action( ({ session }) => {
            const { cid } = session
            if (!states.get(cid)) return
            states.get(cid).quit()
            states.delete(cid)
        })
    app.subcommand('.rule', '查询指令', { hidden: true })
        .alias('指令')
        .action( ({ session }) => {
            const { cid } = session
            if (!states.get(cid)) return
            return Incan.instruct
        })
    app.subcommand('.recruit', '招募队友', { hidden: true })
        .alias('招募')
        .action( ({ session }) => {
            const { cid, userId } = session
            if (!states.get(cid)) return
            states.get(cid).recruit(userId) 
        })
    app.subcommand('.status', '查询队伍状态', { hidden: true })
        .alias('状态')
        .action(({ session }) => {
            const { cid } = session
            if (!states.get(cid)) return
            states.get(cid).status()
        })
    app.subcommand('.join 加入已经存在的队伍', { hidden: true })
        .alias('加入')
        .action(({ session }) => {
            const { cid, userId } = session
            if (!states.get(cid)) return
            states.get(cid).add_player(userId)
        })
    app.subcommand('.setout 出发', { hidden: true })
        .alias('出发')
        .action(({ session }) => {
            const { cid, userId } = session
            if (!states.get(cid)) return
            states.get(cid).setout(userId)
        })
    app.subcommand('.forward 前进', { hidden: true })
        .alias('前进', '冲')
        .action(({ session }) => {
            const { userId } = session
            for (let incan of states.values()) {
                incan.forward(userId)
            }
        })
    app.subcommand('.leave 回营地', { hidden: true })
        .alias('回营地', '返回')
        .action(({ session }) => {
            const { userId } = session
            for (let incan of states.values()) {
                incan.leave(userId)
            }
        })
}