// Shared constants for billing addresses (`billing_address` table). Kept
// free of DB imports so client components can use them.

/** Most addresses one user may keep. */
export const BILLING_ADDRESS_LIMIT = 5
/** Limit for students (approved discount, or a request pending): their one
 *  address is the one the admin checks for the student's name. */
export const STUDENT_BILLING_ADDRESS_LIMIT = 1

// Why a new address cannot be added (src/lib/billing/policy.ts).
export const BILLING_CREATE_BLOCK_REASONS = ['LIMIT_REACHED', 'STUDENT_LIMIT'] as const
export type BillingCreateBlockReason = (typeof BILLING_CREATE_BLOCK_REASONS)[number]

export const BILLING_CREATE_BLOCK_LABELS: Record<
  'th' | 'en',
  Record<BillingCreateBlockReason, string>
> = {
  th: {
    LIMIT_REACHED: 'ครบจำนวนสูงสุดแล้ว ลบที่อยู่ที่ไม่ใช้เพื่อเพิ่มใหม่',
    STUDENT_LIMIT: 'ผู้ที่ขอหรือได้รับสิทธิ์นักศึกษามีที่อยู่สำหรับออกใบเสร็จได้เพียง 1 รายการ',
  },
  en: {
    LIMIT_REACHED: 'Limit reached. Delete an unused address to add a new one.',
    STUDENT_LIMIT:
      'With a student discount (requested or approved) you can keep only one billing address.',
  },
}

export interface BillingCreatePermissions {
  canCreate: boolean
  limit: number
  count: number
  reason: BillingCreateBlockReason | null
}

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
//   IN_USE            – a registration uses it for billing/reimbursement
//   UNDER_REVIEW      – a pending student discount request uses it
//   DISCOUNT_VERIFIED – an approved student discount request used it
//                       (locked for good; a rejection unlocks it)
export const BILLING_LOCK_REASONS = ['IN_USE', 'UNDER_REVIEW', 'DISCOUNT_VERIFIED'] as const

export type BillingLockReason = (typeof BILLING_LOCK_REASONS)[number]

export const BILLING_LOCK_REASON_LABELS: Record<'th' | 'en', Record<BillingLockReason, string>> = {
  th: {
    IN_USE: 'ที่อยู่นี้ถูกใช้ในการลงทะเบียนแล้ว จึงแก้ไขหรือลบไม่ได้',
    UNDER_REVIEW: 'ที่อยู่นี้อยู่ระหว่างการตรวจสอบคำขอสิทธิ์นักศึกษา จึงแก้ไขหรือลบไม่ได้',
    DISCOUNT_VERIFIED: 'ที่อยู่นี้ได้รับการตรวจสอบพร้อมสิทธิ์นักศึกษาแล้ว จึงแก้ไขหรือลบไม่ได้',
  },
  en: {
    IN_USE: 'This address is used by a registration, so it cannot be edited or deleted.',
    UNDER_REVIEW:
      'This address is part of a student discount request under review, so it cannot be edited or deleted.',
    DISCOUNT_VERIFIED:
      'This address was verified with your student discount, so it cannot be edited or deleted.',
  },
}

const LOCKED_FALLBACK = {
  th: 'ที่อยู่นี้ถูกใช้งานอยู่ จึงแก้ไขหรือลบไม่ได้',
  en: 'This address is in use, so it cannot be edited or deleted.',
}

/** Message for a server error `LOCKED` or `LOCKED:<reason>,<reason>`;
 *  null if the error is not a lock. */
export function lockedMessage(locale: 'th' | 'en', message: string | undefined): string | null {
  if (message !== 'LOCKED' && !message?.startsWith('LOCKED:')) return null
  const labels = BILLING_LOCK_REASON_LABELS[locale]
  const reasons = message
    .slice('LOCKED:'.length)
    .split(',')
    .filter((r): r is BillingLockReason => r in labels)
  return reasons.length ? reasons.map((r) => labels[r]).join(' ') : LOCKED_FALLBACK[locale]
}

export interface BillingPermissions {
  canEdit: boolean
  canDelete: boolean
  /** Empty when both are allowed. */
  reasons: BillingLockReason[]
}
