import { relations } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

// Below is a schema for better-auth using Drizzle ORM with PostgreSQL.
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  role: text('role'),
  banned: boolean('banned').default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires'),
})

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    impersonatedBy: text('impersonated_by'),
  },
  (table) => [index('session_userId_idx').on(table.userId)]
)

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('account_userId_idx').on(table.userId)]
)

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)]
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  papers: many(paperUser),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))

// ---------------- Facebook post cache ----------------
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

// Latest posts from the Facebook page, kept in sync by the worker.
export const facebookPost = pgTable(
  'facebook_post',
  {
    id: text('id').primaryKey(), // Graph API post id
    createdTime: timestamp('created_time', { withTimezone: true }).notNull(),
    message: text('message'),
    permalinkUrl: text('permalink_url').notNull(),
    // Stable id of the picture (attachment target id). The CDN URL changes on
    // every request, so this is what decides whether to download it again.
    imageKey: text('image_key'),
    image: bytea('image'),
    imageMime: text('image_mime'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index('facebook_post_created_time_idx').on(table.createdTime)]
)

// ---------------- Accepted papers (imported from CMT) ----------------
// Replaced by each admin import of the CMT paper list (src/lib/papers/import.ts).

/** One author in paper.authorList. No email, so it is safe to show publicly. */
export interface PaperAuthor {
  order: number // 1-based
  name: string
  affiliation: string | null
  isPrimaryContact: boolean
}

export const paper = pgTable(
  'paper',
  {
    // CMT "Paper ID": stable across re-imports, so not auto-generated.
    id: integer('id').primaryKey(),
    title: text('title').notNull(),
    abstract: text('abstract'),
    primarySubjectArea: text('primary_subject_area'),
    secondarySubjectAreas: text('secondary_subject_areas'),
    trackName: text('track_name'),
    status: text('status').notNull(), // CMT status, e.g. "Accept with Revision"
    // Every author from the CMT "Authors" column, in order. Unlike paper_user,
    // this also keeps authors whose email was missing or invalid.
    authorList: jsonb('author_list').$type<PaperAuthor[]>().notNull().default([]),
    cmtCreatedAt: timestamp('cmt_created_at', { withTimezone: true }),
    cmtModifiedAt: timestamp('cmt_modified_at', { withTimezone: true }),
    // false once a paper is no longer accepted in the latest import.
    // Soft, so data linked to papers later is not lost.
    isActive: boolean('is_active').default(true).notNull(),
    importedAt: timestamp('imported_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('paper_is_active_idx').on(table.isActive)]
)

// Authors of a paper. Rows are rewritten for every paper in each import.
export const paperUser = pgTable(
  'paper_user',
  {
    paperId: integer('paper_id')
      .notNull()
      .references(() => paper.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    email: text('email').notNull(), // = user.email (lowercased), for easy queries
    isPrimaryContact: boolean('is_primary_contact').default(false).notNull(),
    authorOrder: integer('author_order').notNull(), // 1-based
    authorName: text('author_name').notNull(), // as written in CMT
    affiliation: text('affiliation'),
  },
  (table) => [
    primaryKey({ columns: [table.paperId, table.email] }),
    index('paper_user_user_id_idx').on(table.userId),
    index('paper_user_email_idx').on(table.email),
  ]
)

export const paperRelations = relations(paper, ({ many }) => ({
  authors: many(paperUser),
}))

export const paperUserRelations = relations(paperUser, ({ one }) => ({
  paper: one(paper, { fields: [paperUser.paperId], references: [paper.id] }),
  user: one(user, { fields: [paperUser.userId], references: [user.id] }),
}))
