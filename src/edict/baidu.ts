import axios, { AxiosRequestConfig } from 'axios'

type WordMean = {
    part: string,
    cn?: string,
    en?: string
}

type Word = {
    src: string
    pronunciation: string
    means: WordMean[]
    dictionary: string
    tag?: string[]
}

type TransResult = Word | string

export async function lookup(word: string): Promise<TransResult> {
    try {
        const resp = await axios.post(config.url, data(word), { headers: { Cookie: config.cookie } })
        return parse_result(resp.data)
    } catch (e) {
        return e.toString()
    }
}



const config = {
    url: 'https://fanyi.baidu.com/v2transapi',
    token: '2300e949b63136ab2807dbc36355b778',
    from: 'en',
    to: 'zh',
    transtype: 'translang',
    simple_means_flag: '3',
    cookie: 'BAIDUID=C6C33FAEFCEE9FFBF0D5594668A339C0:FG=1;'
        + 'BAIDUID_BFESS=C6C33FAEFCEE9FFBF0D5594668A339C0:FG=1;'
        + 'BDUSS=d3a1VUbXVseVVXdGxDTUpkUGp-'
        + 'Yks4a1liQmtGeWI3bzNvTjJkak95ZDlBTnhoRVFBQUFBJCQAAAAAAAAAAAEAAAA5UoGF0Me57M7v0-'
        + '8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH1ztGF9c7Rhdn;'
        + 'BDUSS_BFESS=d3a1VUbXVseVVXdGxDTUpkUGp-'
        + 'Yks4a1liQmtGeWI3bzNvTjJkak95ZDlBTnhoRVFBQUFBJCQAAAAAAAAAAAEAAAA5UoGF0Me57M7v0-'
        + '8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAH1ztGF9c7Rhdn;'
        + '__yjs_duid=1_00da16475969bff972ee3654403c7f401639217351912;'
        + 'Hm_lvt_64ecd82404c51e03dc91cb9e8c025574=1638949358,1638961120,1639208090,1639217353;'
        + 'Hm_lpvt_64ecd82404c51e03dc91cb9e8c025574=1639217353;'
        + 'REALTIME_TRANS_SWITCH=1;'
        + 'HISTORY_SWITCH=1;'
        + 'FANYI_WORD_SWITCH=1;'
        + 'SOUND_SPD_SWITCH=1;'
        + 'SOUND_PREFER_SWITCH=1;'
        + '__yjs_st=2_ODZiZDYzMmY5MGU1NzI1ZGVjOGE3ZWJlNTQxMmFlYzI1ZDlmOWM0MjBiMDU4MzZmZWQ3MTFlZDhlOTIy'
        + 'MzVjMTZhNTU4ODAzNGQ3NzdkNTgzNDBhY2E0ZjU1YThhZGI5M2MwMmM2YzE2ZTRmZDc1OGZjZGU1ZjQ4MTlkMzE1Yzk4'
        + 'YzFmM2NlMDk2MDIwZGJiN2IyNWViMDhjMGY2OTlkOWZmZTEzMTAyZThiMzFlOWViNzAzNDMxYzhkNGQ2ZjY3OWY1ZmYx'
        + 'NzJjZWM1NWNmNmE1MGRiMjQxNzJjMzllYTA4YzgzM2ZmZTEzOTg1NmM4YTFkYzBiZjA5MzhjNjg3N183XzAwNzQ4MDZk'
}

function data(word: string): Record<string, string> {
        return {
            from: 'en',
            to: 'zh',
            query: word,
            transtype: 'translang',
            simple_means_flag: '3',
            sign: sign(word),
            token: config.token,
            domain: 'commom'
        }
    }

function sign(word: string): string {
    var i = '320305.131321201'
    var a;
    var n = (r, o) => {
        for (var t = 0; t < o.length - 2; t += 3) {
            a = o.charAt(t + 2);
            a = a >= "a" ? a.charCodeAt(0) - 87 : Number(a), a = "+" === o.charAt(t + 1) ? r >>> a : r << a, r = "+" === o.charAt(t) ? r + a & 4294967295 : r ^ a
        }
        return r
    }
    var o = word.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g);
    if (null === o) {
        var t = word.length;
        t > 30 && (word = "" + word.substr(0, 10) + word.substr(Math.floor(t / 2) - 5, 10) + word.substr(-10, 10))
    } else {
        for (var e = word.split(/[\uD800-\uDBFF][\uDC00-\uDFFF]/), C = 0, h = e.length, f = []; h > C; C++) "" !== e[C] && f.push.apply(f, a(e[C].split(""))), C !== h - 1 && f.push(o[C]);
        var g = f.length;
        g > 30 && (word = f.slice(0, 10).join("") + f.slice(Math.floor(g / 2) - 5, Math.floor(g / 2) + 5).join("") + f.slice(-10).join(""))
    }
    var u = void 0, l = "" + String.fromCharCode(103) + String.fromCharCode(116) + String.fromCharCode(107);
    u = null !== i ? i : (i = window[l] || "") || "";
    for (var d = u.split("."), m = Number(d[0]) || 0, s = Number(d[1]) || 0, S = [], c = 0, v = 0; v < word.length; v++) {
        var A = word.charCodeAt(v);
        128 > A ? S[c++] = A : (2048 > A ? S[c++] = A >> 6 | 192 : (55296 === (64512 & A) && v + 1 < word.length && 56320 === (64512 & word.charCodeAt(v + 1)) ? (A = 65536 + ((1023 & A) << 10) + (1023 & word.charCodeAt(++v)), S[c++] = A >> 18 | 240, S[c++] = A >> 12 & 63 | 128) : S[c++] = A >> 12 | 224, S[c++] = A >> 6 & 63 | 128), S[c++] = 63 & A | 128)
    }
    for (var p = m, F = "" + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(97) + ("" + String.fromCharCode(94) + String.fromCharCode(43) + String.fromCharCode(54)), D = "" + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(51) + ("" + String.fromCharCode(94) + String.fromCharCode(43) + String.fromCharCode(98)) + ("" + String.fromCharCode(43) + String.fromCharCode(45) + String.fromCharCode(102)), b = 0; b < S.length; b++) p += S[b], p = n(p, F);
    return p = n(p, D), p ^= s, 0 > p && (p = (2147483647 & p) + 2147483648), p %= 1e6, p.toString() + "." + (p ^ m)
}

function parse_result(data: any): TransResult {
    return data.dict_result
        ? parse_dict_result(data.dict_result)
        : parse_trans_result(data.trans_result)
}

function parse_dict_result(data: any): Word {
    let means: WordMean[]
    let dictionary: string
    if (data.oxford) {
        means = parse_oxford(data.oxford)
        dictionary = 'oxford'
    } else if (data.collins) {
        means = parse_collins(data.collins)
        dictionary = 'collins'
    } else {
        means = parse_simple_means(data.simple_means)
        dictionary = 'baidu'
    }
    return {
        src: data.simple_means.word_name,
        pronunciation: data.simple_means.symbols[0].ph_am,
        means: means,
        dictionary: dictionary,
        tag: data.simple_means.tags?.core
    }
}

function parse_simple_means(data: any): WordMean[] {
    const means: WordMean[] = []
    for (const part of data.symbols[0].parts) {
        for (const mean of part.means as string[]) {
            means.push({
                part: part?.part,
                cn: mean
            })
        }
    }
    return means
}

function parse_oxford(data: any): WordMean[] {
    const means: WordMean[] = []
    type Node = {
        tag: string
        data?: Node[]
        chText?: string
        enText?: string
        p_text?: string
    }
    let cur_p = 'none'
    const foreach_node = (nodes: Node[]) => {
        nodes.forEach(node => {
            if (node.tag.endsWith('g') && node.data) {
                foreach_node(node.data)
            } else {
                switch (node.tag) {
                    case 'p':
                        cur_p = node.p_text
                        break
                    case 'd':
                        means.push({
                            part: cur_p,
                            cn: node.chText,
                            en: node.enText
                        })
                        break
                    default: break
                }
            }
        })
    }
    foreach_node(data.entry[0].data as Node[])
    return means
}

function parse_collins(data: any): WordMean[] {
    const means: WordMean[] = []
    type V = {
        def?: string,
        tran?: string,
        posp: { label: string }[]
    }

    for (const mean of data.entry) {
        if (mean.type === 'mean') {
            const v = mean.value[0] as V
            means.push({
                part: v.posp[0].label,
                cn: v.tran,
                en: v.def
            })
        }
    }
    return means
}

function parse_trans_result(data: any): string {
    return data.data[0].dst
}
