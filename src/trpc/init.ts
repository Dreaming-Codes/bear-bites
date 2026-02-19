import { initTRPC, TRPCError } from '@trpc/server'

export interface TRPCContext {
  userId?: string
}

const t = initTRPC.context<TRPCContext>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const createCallerFactory = t.createCallerFactory

const isAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }
  return next({
    ctx: { userId: ctx.userId },
  })
})

export const protectedProcedure = t.procedure.use(isAuthed)
