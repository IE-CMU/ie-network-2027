// Who may edit or delete a billing address, and when.
//
// The one place these rules live. It is used to render the list and edit
// pages, and again inside the update/delete transactions
// (src/lib/billing/addresses.ts), which is what actually enforces it.
//
// To add a rule: load what it needs in loadBillingPolicyContext, decide in
// evaluateBillingPermissions, and add its reason to BILLING_LOCK_REASONS
// (src/utils/billingAddress.ts) with a label.
import { count, eq } from 'drizzle-orm'

import { registration } from '../../db/schema.js'
import type {
  BillingLockReason,
  BillingPermissions,
} from '../../utils/billingAddress.js'
import type { Db } from './db.js'

/** The signed-in user, as far as the rules need to know. */
export interface PolicyUser {
  id: string
  role?: string | null
  participantType?: string | null
}

/** Everything the rules decide on, for one address. */
export interface BillingPolicyContext {
  user: PolicyUser
  /** Number of registrations billed to this address. */
  registrationCount: number
}

/** Pure decision from the loaded context; no database access. */
export function evaluateBillingPermissions(ctx: BillingPolicyContext): BillingPermissions {
  const editLocks: BillingLockReason[] = []
  const deleteLocks: BillingLockReason[] = []

  // Registrations reference the address directly (no copy), so changing or
  // removing it would change their billing details. Applies to admins too.
  if (ctx.registrationCount > 0) {
    editLocks.push('IN_USE')
    deleteLocks.push('IN_USE')
  }

  return {
    canEdit: editLocks.length === 0,
    canDelete: deleteLocks.length === 0,
    reasons: [...new Set([...editLocks, ...deleteLocks])],
  }
}

/**
 * Load the facts the rules need for one address. The caller has already
 * checked that the address belongs to the user. Pass a transaction to see
 * the same snapshot as the write that follows.
 */
export async function loadBillingPolicyContext(
  db: Db,
  user: PolicyUser,
  addressId: string
): Promise<BillingPolicyContext> {
  const [usage] = await db
    .select({ n: count() })
    .from(registration)
    .where(eq(registration.billingAddressId, addressId))
  return { user, registrationCount: usage?.n ?? 0 }
}

export async function getBillingPermissions(
  db: Db,
  user: PolicyUser,
  addressId: string
): Promise<BillingPermissions> {
  return evaluateBillingPermissions(await loadBillingPolicyContext(db, user, addressId))
}
