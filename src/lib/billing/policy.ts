// What a user may do with their billing addresses.
//
// The one place these rules live. It is used to render the list, new and
// edit pages, and again inside the create/update/delete transactions
// (src/lib/billing/addresses.ts), which is what actually enforces it.
//
// To add a rule: load what it needs in a load* function, decide in the
// matching evaluate* function, and add its reason to src/utils/billingAddress.ts
// with a label.
import { and, count, eq, inArray } from 'drizzle-orm'

import { billingAddress, registration, typeChangeRequest, user } from '../../db/schema.js'
import { hasStudentDiscount, type ParticipantType } from '../../utils/participantType.js'
import {
  BILLING_ADDRESS_LIMIT,
  STUDENT_BILLING_ADDRESS_LIMIT,
  type BillingCreatePermissions,
  type BillingLockReason,
  type BillingPermissions,
} from '../../utils/billingAddress.js'
import type { Db } from '../../db/client.js'

/** The signed-in user, as far as the rules need to know. */
export interface PolicyUser {
  id: string
  role?: string | null
}

// ---------------- Edit / delete one address ----------------

/** Everything the rules decide on, for one address. */
export interface BillingPolicyContext {
  user: PolicyUser
  /** Number of registrations billed to this address. */
  registrationCount: number
  /** Student discount requests that reference this address, by status. */
  hasPendingTypeChange: boolean
  hasApprovedTypeChange: boolean
}

/** Pure decision from the loaded context; no database access. */
export function evaluateBillingPermissions(ctx: BillingPolicyContext): BillingPermissions {
  // Each rule here locks both edit and delete. Keep the two lists apart
  // anyway, so a rule that locks only one of them is a one-line change.
  const editLocks: BillingLockReason[] = []
  const deleteLocks: BillingLockReason[] = []
  const lockBoth = (r: BillingLockReason) => {
    editLocks.push(r)
    deleteLocks.push(r)
  }

  // Registrations reference the address directly (no copy), so changing or
  // removing it would change their billing details. Applies to admins too.
  if (ctx.registrationCount > 0) lockBoth('IN_USE')
  // The admin checks this address for the student's name: keep it as it
  // was while they look, and for good once approved. A rejection unlocks it.
  if (ctx.hasPendingTypeChange) lockBoth('UNDER_REVIEW')
  if (ctx.hasApprovedTypeChange) lockBoth('DISCOUNT_VERIFIED')

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
  const facts = await loadAddressFacts(db, [addressId])
  return { user, ...facts.get(addressId)! }
}

/**
 * Contexts for many addresses at once (the admin list), in two queries.
 * `owners` maps each address id to its owner.
 */
export async function loadBillingPolicyContexts(
  db: Db,
  owners: Map<string, PolicyUser>
): Promise<Map<string, BillingPolicyContext>> {
  const facts = await loadAddressFacts(db, [...owners.keys()])
  return new Map(
    [...owners].map(([id, owner]) => [id, { user: owner, ...facts.get(id)! }])
  )
}

type AddressFacts = Omit<BillingPolicyContext, 'user'>

/** Registration and request usage per address; every id gets an entry. */
async function loadAddressFacts(db: Db, addressIds: string[]): Promise<Map<string, AddressFacts>> {
  const facts = new Map<string, AddressFacts>(
    addressIds.map((id) => [
      id,
      { registrationCount: 0, hasPendingTypeChange: false, hasApprovedTypeChange: false },
    ])
  )
  if (addressIds.length === 0) return facts

  const usage = await db
    .select({ id: registration.billingAddressId, n: count() })
    .from(registration)
    .where(inArray(registration.billingAddressId, addressIds))
    .groupBy(registration.billingAddressId)
  for (const u of usage) if (u.id) facts.get(u.id)!.registrationCount = u.n

  const requests = await db
    .select({ id: typeChangeRequest.billingAddressId, status: typeChangeRequest.status })
    .from(typeChangeRequest)
    .where(
      and(
        inArray(typeChangeRequest.billingAddressId, addressIds),
        inArray(typeChangeRequest.status, ['pending', 'approved'])
      )
    )
  for (const r of requests) {
    const f = facts.get(r.id)!
    if (r.status === 'pending') f.hasPendingTypeChange = true
    if (r.status === 'approved') f.hasApprovedTypeChange = true
  }
  return facts
}

export async function getBillingPermissions(
  db: Db,
  user: PolicyUser,
  addressId: string
): Promise<BillingPermissions> {
  return evaluateBillingPermissions(await loadBillingPolicyContext(db, user, addressId))
}

// ---------------- Add an address ----------------

export interface BillingCreateContext {
  /** Read from the database, not the session, so a just-approved
   *  discount counts straight away. */
  participantType: ParticipantType
  addressCount: number
  hasPendingTypeChange: boolean
}

export function evaluateBillingCreate(ctx: BillingCreateContext): BillingCreatePermissions {
  const student = hasStudentDiscount(ctx.participantType) || ctx.hasPendingTypeChange
  const limit = student ? STUDENT_BILLING_ADDRESS_LIMIT : BILLING_ADDRESS_LIMIT
  const full = ctx.addressCount >= limit
  return {
    canCreate: !full,
    limit,
    count: ctx.addressCount,
    reason: full ? (student ? 'STUDENT_LIMIT' : 'LIMIT_REACHED') : null,
  }
}

/** Null if the user no longer exists. Inside a transaction, lock the user
 *  row first (as createBillingAddress does) so the count stays true. */
export async function loadBillingCreateContext(
  db: Db,
  userId: string
): Promise<BillingCreateContext | null> {
  const [u] = await db
    .select({ participantType: user.participantType })
    .from(user)
    .where(eq(user.id, userId))
  if (!u) return null

  const [{ n }] = await db
    .select({ n: count() })
    .from(billingAddress)
    .where(eq(billingAddress.userId, userId))

  const [pending] = await db
    .select({ id: typeChangeRequest.id })
    .from(typeChangeRequest)
    .where(and(eq(typeChangeRequest.requesterId, userId), eq(typeChangeRequest.status, 'pending')))
    .limit(1)

  return { participantType: u.participantType, addressCount: n, hasPendingTypeChange: !!pending }
}

export async function getBillingCreatePermissions(
  db: Db,
  userId: string
): Promise<BillingCreatePermissions | null> {
  const ctx = await loadBillingCreateContext(db, userId)
  return ctx && evaluateBillingCreate(ctx)
}
