import { createBillingAddress } from '@/lib/billing/addresses'
import { defineAction } from 'astro:actions'
import { requireUser } from '../_guards'
import { toActionError } from './_errors'
import { billingAddressInput } from './_input'

/** User: add a billing address (up to BILLING_ADDRESS_LIMIT). */
export const create = defineAction({
  input: billingAddressInput,
  handler: async (input, context) => {
    const user = requireUser(context)
    try {
      return await createBillingAddress(user, input)
    } catch (e) {
      toActionError(e, 'Billing address create')
    }
  },
})
