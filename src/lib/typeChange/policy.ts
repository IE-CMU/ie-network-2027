// May a user request a student discount right now?
//
// The one place these rules live. Used by the account and change-type pages
// (via getTypeChangeState) and again inside submitTypeChangeRequest, which
// is what actually enforces it. Mirrors src/lib/billing/policy.ts.
//
// To add a rule: load what it needs in loadTypeChangePolicyContext, decide
// in evaluateTypeChangePermissions, and add its reason to
// TYPE_CHANGE_BLOCK_REASONS (src/utils/typeChangeRequest.ts).
import { asc, desc, eq } from 'drizzle-orm'

import { billingAddress, typeChangeRequest, user } from '../../db/schema.js'
import type { ParticipantType } from '../../utils/participantType.js'
import {
  canRequestDiscount,
  type TypeChangeBlockReason,
  type TypeChangeStatus,
} from '../../utils/typeChangeRequest.js'
import type { Db } from '../../db/client.js'

export interface TypeChangePolicyContext {
  participantType: ParticipantType
  /** Status of the user's most recent request, if any. */
  latestStatus: TypeChangeStatus | null
  billingAddressIds: string[]
}

export interface TypeChangePermissions {
  canRequest: boolean
  /** Empty when canRequest. */
  reasons: TypeChangeBlockReason[]
  /** The address a request would be about: set only when there is exactly one. */
  billingAddressId: string | null
}

/** Pure decision from the loaded context; no database access. */
export function evaluateTypeChangePermissions(ctx: TypeChangePolicyContext): TypeChangePermissions {
  const reasons: TypeChangeBlockReason[] = []

  if (!canRequestDiscount(ctx.participantType)) reasons.push('NOT_ELIGIBLE')
  if (ctx.latestStatus === 'pending') reasons.push('ALREADY_PENDING')
  if (ctx.latestStatus === 'approved') reasons.push('ALREADY_APPROVED')
  // Exactly one address, so the admin knows which one must carry the
  // student's name (financial regulation).
  if (ctx.billingAddressIds.length === 0) reasons.push('NO_BILLING_ADDRESS')
  if (ctx.billingAddressIds.length > 1) reasons.push('TOO_MANY_BILLING_ADDRESSES')

  return {
    canRequest: reasons.length === 0,
    reasons,
    billingAddressId: ctx.billingAddressIds.length === 1 ? ctx.billingAddressIds[0] : null,
  }
}

/**
 * Load the facts the rules need. Null if the user no longer exists.
 *
 * With `lock` (inside the submit transaction): locks the user row, which
 * billing address creation also locks, and takes FOR SHARE on the user's
 * addresses, so none can be added, edited or deleted until the request is
 * committed. After that the billing policy sees the pending request and
 * locks the address.
 */
export async function loadTypeChangePolicyContext(
  db: Db,
  userId: string,
  { lock = false } = {}
): Promise<TypeChangePolicyContext | null> {
  const userQuery = db
    .select({ participantType: user.participantType })
    .from(user)
    .where(eq(user.id, userId))
  const [u] = lock ? await userQuery.for('update') : await userQuery
  if (!u) return null

  const [latest] = await db
    .select({ status: typeChangeRequest.status })
    .from(typeChangeRequest)
    .where(eq(typeChangeRequest.requesterId, userId))
    .orderBy(desc(typeChangeRequest.submittedAt))
    .limit(1)

  const addressQuery = db
    .select({ id: billingAddress.id })
    .from(billingAddress)
    .where(eq(billingAddress.userId, userId))
    .orderBy(asc(billingAddress.createdAt))
  const addresses = lock ? await addressQuery.for('share') : await addressQuery

  return {
    participantType: u.participantType,
    latestStatus: latest?.status ?? null,
    billingAddressIds: addresses.map((a) => a.id),
  }
}

export async function getTypeChangePermissions(
  db: Db,
  userId: string
): Promise<TypeChangePermissions | null> {
  const ctx = await loadTypeChangePolicyContext(db, userId)
  return ctx && evaluateTypeChangePermissions(ctx)
}
