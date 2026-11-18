import { reviewTypeChangeRequest } from '@/lib/typeChange/requests'
import { z } from 'astro/zod'
import { defineAction } from 'astro:actions'
import { requireAdmin } from '../_guards'
import { toActionError } from './_errors'

/** Admin: approve or reject a pending type change request. */
export const review = defineAction({
  input: z.object({
    id: z.string().uuid(),
    decision: z.enum(['approved', 'rejected']),
    comment: z.string().optional(),
  }),
  handler: async ({ id, decision, comment }, context) => {
    const admin = requireAdmin(context)
    try {
      const result = await reviewTypeChangeRequest(admin.id, id, decision, comment)
      console.log(`Type change request ${id} ${decision} by ${admin.email}`)
      return { ...result, reviewer: { name: admin.name, email: admin.email } }
    } catch (e) {
      toActionError(e, 'Type change review')
    }
  },
})
