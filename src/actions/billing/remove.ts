import { deleteBillingAddress } from '@/lib/billing/addresses'
import { z } from 'astro/zod'
import { defineAction } from 'astro:actions'
import { requireUser } from '../_guards'
import { toActionError } from './_errors'

/** User: delete one of their addresses, if the policy allows it. */
export const remove = defineAction({
  input: z.object({ id: z.string() }),
  handler: async ({ id }, context) => {
    const user = requireUser(context)
    try {
      return await deleteBillingAddress(user, id)
    } catch (e) {
      toActionError(e, 'Billing address delete')
    }
  },
})
