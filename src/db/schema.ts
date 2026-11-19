import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  customType,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core'

import { PARTICIPANT_TYPES, STUDENT_STATUSES } from '../utils/participantType.js'
import { TYPE_CHANGE_STATUSES } from '../utils/typeChangeRequest.js'

export const participantTypeEnum = pgEnum('participant_type', PARTICIPANT_TYPES)
export const studentStatusEnum = pgEnum('student_status', STUDENT_STATUSES)
export const typeChangeStatusEnum = pgEnum('type_change_request_status', TYPE_CHANGE_STATUSES)

// Below is a schema for better-auth using Drizzle ORM with PostgreSQL.
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  // Declared in better-auth user.additionalFields (src/lib/auth/create.ts).
  // Set from CMT when the paper import creates the account; user-editable.
  affiliation: text('affiliation'),
  // Registration rate category (src/utils/participantType.ts). Also in
  // additionalFields, with input: false so users cannot change it.
  // Self sign-ups get the default; the paper import makes users authors.
  participantType: participantTypeEnum('participant_type')
    .default('participant')
    .notNull(),
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
  billingAddresses: many(billingAddress),
  registrations: many(registration),
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

// ---------------- Billing addresses ----------------
// Addresses a user can bill registration to; up to BILLING_ADDRESS_LIMIT
// per user (src/utils/billingAddress.ts). This row is the single source of
// truth: registrations/receipts reference it, they do not copy it. That is
// why an address is locked (no edit, no delete) once something uses it;
// the rules are in src/lib/billing/policy.ts.
export const billingAddress = pgTable(
  'billing_address',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    affiliation: text('affiliation'),
    address: text('address').notNull(), // multi-line, printed as entered
    phone: text('phone').notNull(),
    // Text, not a number: keeps leading zeros and non-Thai formats.
    taxId: text('tax_id'),
    // Thai tax invoice branch, e.g. "สำนักงานใหญ่" or "00001".
    branch: text('branch'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index('billing_address_user_id_idx').on(table.userId)]
)

export const billingAddressRelations = relations(billingAddress, ({ one, many }) => ({
  user: one(user, { fields: [billingAddress.userId], references: [user.id] }),
  registrations: many(registration),
}))

// ---------------- Registrations (minimal) ----------------
// Placeholder for the registration flow; for now it only links a user to
// the billing address used for reimbursement. Deleting a billing address
// that a registration uses fails in the database (on delete no action),
// as a backstop for the lock in src/lib/billing/policy.ts. "No action"
// rather than "restrict" so deleting a user, which cascades to both
// tables, still works.
export const registration = pgTable(
  'registration',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    billingAddressId: uuid('billing_address_id').references(() => billingAddress.id, {
      onDelete: 'no action',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index('registration_user_id_idx').on(table.userId),
    index('registration_billing_address_id_idx').on(table.billingAddressId),
  ]
)

export const registrationRelations = relations(registration, ({ one }) => ({
  user: one(user, { fields: [registration.userId], references: [user.id] }),
  billingAddress: one(billingAddress, {
    fields: [registration.billingAddressId],
    references: [billingAddress.id],
  }),
}))

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return 'bytea'
  },
})

// ---------------- Participant type change requests ----------------
// A user asks for a student discount on user.participant_type and uploads
// evidence; an admin approves or rejects. Approving keeps the user's base
// (participant/author), e.g. author + ie_student → author_student_ie. Rules (src/lib/typeChange/):
// at most one pending request per user (enforced by the index below),
// no new requests after one is approved, new ones allowed after a rejection.
export const typeChangeRequest = pgTable(
  'type_change_request',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    requesterId: text('requester_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    requestedType: studentStatusEnum('requested_type').notNull(),
    requesterComment: text('requester_comment'),
    status: typeChangeStatusEnum('status').default('pending').notNull(),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    // Admin who approved or rejected; kept as null if that admin is deleted.
    reviewerId: text('reviewer_id').references(() => user.id, { onDelete: 'set null' }),
    reviewerComment: text('reviewer_comment'),
  },
  (table) => [
    index('type_change_request_requester_id_idx').on(table.requesterId),
    index('type_change_request_status_idx').on(table.status),
    uniqueIndex('type_change_request_one_pending_idx')
      .on(table.requesterId)
      .where(sql`${table.status} = 'pending'`),
  ]
)

// Uploaded evidence (ID card, image or PDF), one per request. A separate
// table so listing requests never loads the file bytes. Personal data:
// only served to the requester and admins (src/pages/api/type-change-request/).
export const typeChangeEvidence = pgTable('type_change_evidence', {
  requestId: uuid('request_id')
    .primaryKey()
    .references(() => typeChangeRequest.id, { onDelete: 'cascade' }),
  fileName: text('file_name').notNull(), // original name, for display/download
  mimeType: text('mime_type').notNull(), // detected from the file's bytes
  size: integer('size').notNull(),
  data: bytea('data').notNull(),
})

// ---------------- Facebook post cache ----------------

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
// Replaced by each admin import of the CMT paper list (src/lib/paper/import.ts).

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
// Only the link: author name, email and affiliation come from `user`, so
// changes a user makes to their profile show on their papers.
export const paperUser = pgTable(
  'paper_user',
  {
    paperId: integer('paper_id')
      .notNull()
      .references(() => paper.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    isPrimaryContact: boolean('is_primary_contact').default(false).notNull(),
    authorOrder: integer('author_order').notNull(), // 1-based
  },
  (table) => [
    primaryKey({ columns: [table.paperId, table.userId] }),
    index('paper_user_user_id_idx').on(table.userId),
  ]
)

export const paperRelations = relations(paper, ({ many }) => ({
  authors: many(paperUser),
}))

export const paperUserRelations = relations(paperUser, ({ one }) => ({
  paper: one(paper, { fields: [paperUser.paperId], references: [paper.id] }),
  user: one(user, { fields: [paperUser.userId], references: [user.id] }),
}))
