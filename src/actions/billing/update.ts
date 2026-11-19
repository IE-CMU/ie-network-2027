import { updateBillingAddress } from '@/lib/billing/addresses'
import { z } from 'astro/zod'
import { defineAction } from 'astro:actions'
import { requireUser } from '../_guards'
import { toActionError } from './_errors'
import { billingAddressInput } from './_input'

/** User: change one of their addresses, if the policy allows it. */
export const update = defineAction({
  input: billingAddressInput.extend({ id: z.string() }),
  handler: async ({ id, ...input }, context) => {
    const user = requireUser(context)
    try {
      return await updateBillingAddress(user, id, input)
    } catch (e) {
      toActionError(e, 'Billing address update')
    }
  },
})
