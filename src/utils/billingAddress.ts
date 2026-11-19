// Shared constants for billing addresses (`billing_address` table). Kept
// free of DB imports so client components can use them.

/** Most addresses one user may keep. */
export const BILLING_ADDRESS_LIMIT = 5

/** Max lengths, checked in the form and again on the server. */
export const BILLING_FIELD_MAX = {
  name: 200,
  affiliation: 300,
  address: 1000,
  phone: 50,
  taxId: 50,
  branch: 100,
} as const

export type BillingField = keyof typeof BILLING_FIELD_MAX

/** Fields that must not be empty. Tax ID and branch are optional and not
 *  validated: getting them right is the user's responsibility. */
export const BILLING_REQUIRED_FIELDS = ['name', 'address', 'phone'] as const

/** The editable values of an address, as sent by the form. */
export interface BillingAddressInput {
  name: string
  affiliation: string
  address: string
  phone: string
  taxId: string
  branch: string
}

// Why an address cannot be edited or deleted (src/lib/billing/policy.ts).
// Add new reasons here and give them a label below.
//   IN_USE – a registration uses it for billing/reimbursement
export const BILLING_LOCK_REASONS = ['IN_USE'] as const

export type BillingLockReason = (typeof BILLING_LOCK_REASONS)[number]

export const BILLING_LOCK_REASON_LABELS: Record<'th' | 'en', Record<BillingLockReason, string>> = {
  th: {
    IN_USE: 'ที่อยู่นี้ถูกใช้ในการลงทะเบียนแล้ว จึงแก้ไขหรือลบไม่ได้',
  },
  en: {
    IN_USE: 'This address is used by a registration, so it cannot be edited or deleted.',
  },
}

export interface BillingPermissions {
  canEdit: boolean
  canDelete: boolean
  /** Empty when both are allowed. */
  reasons: BillingLockReason[]
}
