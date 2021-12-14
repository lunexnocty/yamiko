import { Context, Random, segment } from "koishi";
import axios from 'axios';

import { lookup } from "./baidu";


type Vocabulary = {
    total: number,
    list: string[]
}

type Word = {
    word: string,
    accent: string,
    mean_cn: string,
    mean_en: string,
    sentence: string,
    sentence_trans: string
}

let words: string[] = []

export default function apply(ctx: Context) {
    ctx.command('recite')
        .option('random', '-r')
        .option('search', '-s [word:text]')
        .option('timeout', '-t <time:number>', { fallback: 180 })
        .shortcut('随机单词', { options: { random: true }})
        .shortcut(/^查单词([a-zA-Z ]*)$/g, { options: { search: '$1'.trim() } })
        .action(async ({ session, options }) => {
            try {
                if (options.random) {
                    if (words.length == 0) {
                        const resp = await axios.get<Vocabulary>('https://cdn.jsdelivr.net/gh/lyc8503/baicizhan-word-meaning-API/data/list.json')
                        words = resp.data.list.filter(word => word.search(' ') == -1)
                    }
                    while (words.length > 0) {
                        let quit = false
                        const word = Random.pick(words).toLowerCase()
                        if (!word) return '失败'
                        const resp = await axios.get<Word>(`https://cdn.jsdelivr.net/gh/lyc8503/baicizhan-word-meaning-API/data/words/${word}.json`)
                        await session.sendQueued(resp.data.mean_cn)
                        while (true) {
                            const answer = await session.prompt(options.timeout * 1000)
                            if (answer == '' || answer == '退出') {
                                quit = true
                                break
                            } else if (answer.toLowerCase() === word) {
                                await session.sendQueued('Congratulations！\n' + segment('image', { url: `http://a60.one:404/?bytes=true&__timestamp__=${Date.now()}`, cache: false }))
                                break
                            } else if (answer === '不知道') {
                                await session.sendQueued([
                                    '那这次先放过你，下次要自己背哦！',
                                    `【${resp.data.word}】(${resp.data.accent})`,
                                    `释义：${resp.data.mean_cn}`,
                                    `英文释义：${resp.data.mean_en}`,
                                    `例句：${resp.data.sentence}`,
                                    `翻译：${resp.data.sentence_trans}`,
                                    segment('image', { url: `http://a60.one:404/?bytes=true&__timestamp__=${Date.now()}`, cache: false })
                                ].join('\n'))
                                break
                            } else {
                                await session.sendQueued('答案错误，请重试')
                            }
                        }
                        if (quit) {
                            return '结束背单词'
                        }
                    }
                } else if (options.search) {
                    const word = await lookup(options.search)
                    if (typeof word === 'string') {
                        return `${word}\n${segment('image', { url: `http://a60.one:404/?bytes=true&__timestamp__=${Date.now()}`, cache: false })}`
                    } else {
                        return [
                            `【${word.src}】(${word.pronunciation})`,
                            (_ => {
                                const trans:string[] = []
                                word.means.forEach(mean => {
                                    trans.push(mean.part + '  ' + (mean.cn || ''))
                                    mean.en && trans.push('    ' + mean.en)
                                })
                                return trans.join('\n')
                            })(),
                            `来源: ${word.dictionary}`,
                            `标签: ${word.tag.join('、')}`,
                            segment('image', { url: `http://a60.one:404/?bytes=true&__timestamp__=${Date.now()}`, cache: false })
                        ].join('\n')
                    }
                }
            } catch {
                return '网络请求失败，等待维护'
            }
        })
}