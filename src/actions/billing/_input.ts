import { BILLING_FIELD_MAX } from '@/utils/billingAddress'
import { z } from 'astro/zod'

// Shape only; trimming, required fields and lengths are checked in
// cleanBillingInput (src/lib/billing/addresses.ts) so the codes match.
// The .max() here just rejects absurd payloads early.
const field = (max: number) => z.string().max(max * 2).default('')

export const billingAddressInput = z.object({
  name: field(BILLING_FIELD_MAX.name),
  affiliation: field(BILLING_FIELD_MAX.affiliation),
  address: field(BILLING_FIELD_MAX.address),
  phone: field(BILLING_FIELD_MAX.phone),
  taxId: field(BILLING_FIELD_MAX.taxId),
  branch: field(BILLING_FIELD_MAX.branch),
})
