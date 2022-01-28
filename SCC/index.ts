import { SCC } from './SCC'

const lex = new SCC.Lexer()
lex.rule('IDENTIFY', lex.identify)
    .rule('INTEGER', lex.integer)
    .blanks()
    .build()

for (const token of lex.parse('19a 100')) {
    console.log(token)
}