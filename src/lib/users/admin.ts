import { and, eq, sql } from 'drizzle-orm'

import { dbClient } from '../../db/client.js'
import { account, paper, paperUser, user } from '../../db/schema.js'
import { getRoles } from '../../utils/role.js'

/** One row of the admin user table (see UserTable.vue). */
export interface AdminUserRow {
  id: string
  name: string
  email: string
  roles: string[]
  emailVerified: boolean
  banned: boolean
  hasPassword: boolean
  paperCount: number
  createdAt: string // ISO
}

/** Load all users for the admin user list, ordered by name. */
export async function loadAdminUserList(): Promise<AdminUserRow[]> {
  // Active papers per user (deactivated papers are not counted).
  const paperCounts = dbClient
    .select({
      userId: paperUser.userId,
      count: sql<number>`count(*)::int`.as('count'),
    })
    .from(paperUser)
    .innerJoin(paper, and(eq(paper.id, paperUser.paperId), eq(paper.isActive, true)))
    .groupBy(paperUser.userId)
    .as('paper_counts')

  const rows = await dbClient
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
      banned: user.banned,
      createdAt: user.createdAt,
      paperCount: sql<number>`coalesce(${paperCounts.count}, 0)`,
      // A 'credential' account means the user has set a password.
      hasPassword: sql<boolean>`exists (
        select 1 from ${account}
        where ${account.userId} = ${user.id} and ${account.providerId} = 'credential'
      )`,
    })
    .from(user)
    .leftJoin(paperCounts, eq(paperCounts.userId, user.id))
    .orderBy(user.name)

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    roles: getRoles(r),
    emailVerified: r.emailVerified,
    banned: r.banned ?? false,
    hasPassword: r.hasPassword,
    paperCount: r.paperCount,
    createdAt: r.createdAt.toISOString(),
  }))
}
