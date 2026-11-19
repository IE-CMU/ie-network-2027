// Admin, read-only: every billing address with its owner and lock state.
// Admins never change billing data; a wrong address on a request is fixed
// by rejecting it, which unlocks the address for its owner.
import { asc, desc, eq } from 'drizzle-orm'

import { dbClient } from '../../db/client.js'
import { billingAddress, typeChangeRequest, user } from '../../db/schema.js'
import type { BillingLockReason } from '../../utils/billingAddress.js'
import type { ParticipantType } from '../../utils/participantType.js'
import type { RequestableType, TypeChangeStatus } from '../../utils/typeChangeRequest.js'
import { evaluateBillingPermissions, loadBillingPolicyContexts, type PolicyUser } from './policy.js'

/** One row of the admin billing address list (see BillingAddressTable.vue). */
export interface AdminBillingAddressRow {
  id: string
  owner: { id: string; name: string; email: string; participantType: ParticipantType }
  name: string
  affiliation: string | null
  address: string
  phone: string
  taxId: string | null
  branch: string | null
  createdAt: string // ISO
  updatedAt: string // ISO
  /** Why the owner cannot edit/delete it (src/lib/billing/policy.ts); empty if unlocked. */
  lockReasons: BillingLockReason[]
  registrationCount: number
  /** Most recent student discount request that refers to this address. */
  latestRequest: { status: TypeChangeStatus; requestedType: RequestableType; submittedAt: string } | null
}

/** All addresses, owners A–Z then oldest first (the table sorts/filters on the client). */
export async function loadAdminBillingAddresses(): Promise<AdminBillingAddressRow[]> {
  const rows = await dbClient
    .select({
      id: billingAddress.id,
      name: billingAddress.name,
      affiliation: billingAddress.affiliation,
      address: billingAddress.address,
      phone: billingAddress.phone,
      taxId: billingAddress.taxId,
      branch: billingAddress.branch,
      createdAt: billingAddress.createdAt,
      updatedAt: billingAddress.updatedAt,
      owner: {
        id: user.id,
        name: user.name,
        email: user.email,
        participantType: user.participantType,
        role: user.role,
      },
    })
    .from(billingAddress)
    .innerJoin(user, eq(user.id, billingAddress.userId))
    .orderBy(asc(user.name), asc(billingAddress.createdAt))

  const owners = new Map<string, PolicyUser>(
    rows.map((r) => [r.id, { id: r.owner.id, role: r.owner.role }])
  )
  const contexts = await loadBillingPolicyContexts(dbClient, owners)

  // Newest request per address (first one seen, given the order).
  const requests = await dbClient
    .select({
      billingAddressId: typeChangeRequest.billingAddressId,
      status: typeChangeRequest.status,
      requestedType: typeChangeRequest.requestedType,
      submittedAt: typeChangeRequest.submittedAt,
    })
    .from(typeChangeRequest)
    .orderBy(desc(typeChangeRequest.submittedAt))
  const latestRequest = new Map<string, AdminBillingAddressRow['latestRequest']>()
  for (const r of requests) {
    if (latestRequest.has(r.billingAddressId)) continue
    latestRequest.set(r.billingAddressId, {
      status: r.status,
      requestedType: r.requestedType,
      submittedAt: r.submittedAt.toISOString(),
    })
  }

  return rows.map(({ owner: { role: _role, ...owner }, ...r }) => {
    const ctx = contexts.get(r.id)!
    return {
      ...r,
      owner,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      lockReasons: evaluateBillingPermissions(ctx).reasons,
      registrationCount: ctx.registrationCount,
      latestRequest: latestRequest.get(r.id) ?? null,
    }
  })
}
