import { Context } from 'koishi'

export function apply(ctx: Context) {
  ctx.middleware(async (session, next) => {
    if (session.content === 'echo') {
      session.send('闇子だよ～')
    } else {
      return next()
    }
  })
}
