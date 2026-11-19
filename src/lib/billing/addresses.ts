import { and, asc, count, eq } from 'drizzle-orm'

import { dbClient } from '../../db/client.js'
import { billingAddress, user as userTable } from '../../db/schema.js'
import {
  BILLING_ADDRESS_LIMIT,
  BILLING_FIELD_MAX,
  BILLING_REQUIRED_FIELDS,
  type BillingAddressInput,
  type BillingField,
  type BillingLockReason,
  type BillingPermissions,
} from '../../utils/billingAddress.js'
import { evaluateBillingPermissions, loadBillingPolicyContext, type PolicyUser } from './policy.js'

// Codes are sent to the browser as the ActionError message and translated there.
export type BillingErrorCode =
  | 'NOT_FOUND' // missing, or another user's address
  | 'LIMIT_REACHED'
  | 'LOCKED'
  | 'INVALID'

export class BillingError extends Error {
  constructor(
    public code: BillingErrorCode,
    /** For LOCKED: why. For INVALID: the offending field. */
    public detail?: BillingLockReason[] | BillingField
  ) {
    super(code)
  }
}

/** Postgres foreign_key_violation: a registration still references the row. */
const isForeignKeyViolation = (e: unknown) =>
  (e as { code?: string })?.code === '23503' ||
  (e as { cause?: { code?: string } })?.cause?.code === '23503'

export interface BillingAddressView {
  id: string
  name: string
  affiliation: string | null
  address: string
  phone: string
  taxId: string | null
  branch: string | null
  createdAt: Date
  updatedAt: Date
}

export interface BillingAddressWithPermissions extends BillingAddressView {
  permissions: BillingPermissions
}

const viewColumns = {
  id: billingAddress.id,
  name: billingAddress.name,
  affiliation: billingAddress.affiliation,
  address: billingAddress.address,
  phone: billingAddress.phone,
  taxId: billingAddress.taxId,
  branch: billingAddress.branch,
  createdAt: billingAddress.createdAt,
  updatedAt: billingAddress.updatedAt,
}

/** Trim, check lengths/required fields, and turn empty optional fields into null. */
export function cleanBillingInput(input: BillingAddressInput) {
  const out = {} as Record<BillingField, string | null>
  for (const field of Object.keys(BILLING_FIELD_MAX) as BillingField[]) {
    // Keep the address's line breaks; only trim the ends.
    const value = (input[field] ?? '').trim()
    if (value.length > BILLING_FIELD_MAX[field]) throw new BillingError('INVALID', field)
    if (!value && (BILLING_REQUIRED_FIELDS as readonly string[]).includes(field))
      throw new BillingError('INVALID', field)
    out[field] = value || null
  }
  return {
    name: out.name!,
    affiliation: out.affiliation,
    address: out.address!,
    phone: out.phone!,
    taxId: out.taxId,
    branch: out.branch,
  }
}

// ---------------- Reads ----------------

export async function countBillingAddresses(userId: string): Promise<number> {
  const [{ n }] = await dbClient
    .select({ n: count() })
    .from(billingAddress)
    .where(eq(billingAddress.userId, userId))
  return n
}

/** The user's addresses, oldest first, each with what the user may do to it. */
export async function listBillingAddresses(
  user: PolicyUser
): Promise<BillingAddressWithPermissions[]> {
  const rows = await dbClient
    .select(viewColumns)
    .from(billingAddress)
    .where(eq(billingAddress.userId, user.id))
    .orderBy(asc(billingAddress.createdAt))

  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      permissions: evaluateBillingPermissions(
        await loadBillingPolicyContext(dbClient, user, row.id)
      ),
    }))
  )
}

/** One of the user's addresses, or null (also for someone else's). */
export async function getBillingAddress(
  user: PolicyUser,
  addressId: string
): Promise<BillingAddressWithPermissions | null> {
  if (!isUuid(addressId)) return null
  const [row] = await dbClient
    .select(viewColumns)
    .from(billingAddress)
    .where(and(eq(billingAddress.id, addressId), eq(billingAddress.userId, user.id)))
  if (!row) return null
  return {
    ...row,
    permissions: evaluateBillingPermissions(
      await loadBillingPolicyContext(dbClient, user, row.id)
    ),
  }
}

// ---------------- Writes ----------------

export async function createBillingAddress(user: PolicyUser, input: BillingAddressInput) {
  const values = cleanBillingInput(input)
  return dbClient.transaction(async (tx) => {
    // Lock the user row so two creates at once cannot both pass the limit.
    await tx.select({ id: userTable.id }).from(userTable).where(eq(userTable.id, user.id)).for('update')
    const [{ n }] = await tx
      .select({ n: count() })
      .from(billingAddress)
      .where(eq(billingAddress.userId, user.id))
    if (n >= BILLING_ADDRESS_LIMIT) throw new BillingError('LIMIT_REACHED')

    const [row] = await tx
      .insert(billingAddress)
      .values({ ...values, userId: user.id })
      .returning({ id: billingAddress.id })
    return { id: row.id }
  })
}

/**
 * Lock the user's address row and check the policy. FOR UPDATE also blocks
 * a registration from starting to reference the row (its foreign key check
 * takes a KEY SHARE lock) until this transaction ends, so the check holds
 * for the write that follows.
 */
async function lockAndCheck(
  tx: Parameters<Parameters<typeof dbClient.transaction>[0]>[0],
  user: PolicyUser,
  addressId: string,
  action: 'edit' | 'delete'
) {
  if (!isUuid(addressId)) throw new BillingError('NOT_FOUND')
  const [row] = await tx
    .select({ id: billingAddress.id })
    .from(billingAddress)
    .where(and(eq(billingAddress.id, addressId), eq(billingAddress.userId, user.id)))
    .for('update')
  if (!row) throw new BillingError('NOT_FOUND')

  const permissions = evaluateBillingPermissions(
    await loadBillingPolicyContext(tx, user, addressId)
  )
  const allowed = action === 'edit' ? permissions.canEdit : permissions.canDelete
  if (!allowed) throw new BillingError('LOCKED', permissions.reasons)
}

export async function updateBillingAddress(
  user: PolicyUser,
  addressId: string,
  input: BillingAddressInput
) {
  const values = cleanBillingInput(input)
  return dbClient.transaction(async (tx) => {
    await lockAndCheck(tx, user, addressId, 'edit')
    await tx.update(billingAddress).set(values).where(eq(billingAddress.id, addressId))
    return { id: addressId }
  })
}

export async function deleteBillingAddress(user: PolicyUser, addressId: string) {
  try {
    return await dbClient.transaction(async (tx) => {
      await lockAndCheck(tx, user, addressId, 'delete')
      await tx.delete(billingAddress).where(eq(billingAddress.id, addressId))
      return { id: addressId }
    })
  } catch (e) {
    // Backstop: the database refuses to delete a referenced address.
    if (isForeignKeyViolation(e)) throw new BillingError('LOCKED', ['IN_USE'])
    throw e
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
/** Avoid a Postgres cast error for malformed ids in URLs. */
const isUuid = (id: string) => UUID_RE.test(id)
