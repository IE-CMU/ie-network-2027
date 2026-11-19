import { and, desc, eq, getTableColumns } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { dbClient } from '../../db/client.js'
import { typeChangeEvidence, typeChangeRequest, user } from '../../db/schema.js'
import {
  isBaseType,
  withStudentStatus,
  type ParticipantType,
} from '../../utils/participantType.js'
import {
  EVIDENCE_MAX_BYTES,
  REQUESTER_COMMENT_MAX,
  REVIEWER_COMMENT_MAX,
  type RequestableType,
  type TypeChangeStatus,
} from '../../utils/typeChangeRequest.js'
import { cleanFileName, detectEvidenceType } from './evidence.js'

// Codes are sent to the browser as the ActionError message and translated there.
export type TypeChangeErrorCode =
  | 'NOT_ELIGIBLE' // user already has a student discount
  | 'ALREADY_PENDING'
  | 'ALREADY_APPROVED'
  | 'FILE_EMPTY'
  | 'FILE_TOO_LARGE'
  | 'FILE_TYPE'
  | 'COMMENT_TOO_LONG'
  | 'COMMENT_REQUIRED' // rejecting needs a reason
  | 'NOT_FOUND'
  | 'NOT_PENDING' // already reviewed (e.g. by another admin)

export class TypeChangeError extends Error {
  constructor(public code: TypeChangeErrorCode) {
    super(code)
  }
}

/** Postgres unique_violation: the one-pending-request-per-user index. */
const isUniqueViolation = (e: unknown) =>
  (e as { code?: string })?.code === '23505' ||
  (e as { cause?: { code?: string } })?.cause?.code === '23505'

const cleanComment = (comment: string | null | undefined, max: number) => {
  const c = comment?.trim() ?? ''
  if (c.length > max) throw new TypeChangeError('COMMENT_TOO_LONG')
  return c || null
}

// ---------------- User side ----------------

export interface TypeChangeRequestSummary {
  id: string
  requestedType: RequestableType
  status: TypeChangeStatus
  requesterComment: string | null
  reviewerComment: string | null
  submittedAt: Date
  statusChangedAt: Date
  hasEvidence: boolean
}

export interface TypeChangeState {
  participantType: ParticipantType
  /** Most recent request. Pending/approved ones are always the latest,
   *  since no request can be made after them. */
  latest: TypeChangeRequestSummary | null
  canRequest: boolean
}

/** What /user/details and /user/change-type need to know about a user. */
export async function getTypeChangeState(userId: string): Promise<TypeChangeState | null> {
  const [u] = await dbClient
    .select({ participantType: user.participantType })
    .from(user)
    .where(eq(user.id, userId))
  if (!u) return null

  const [latest] = await dbClient
    .select({
      id: typeChangeRequest.id,
      requestedType: typeChangeRequest.requestedType,
      status: typeChangeRequest.status,
      requesterComment: typeChangeRequest.requesterComment,
      reviewerComment: typeChangeRequest.reviewerComment,
      submittedAt: typeChangeRequest.submittedAt,
      statusChangedAt: typeChangeRequest.statusChangedAt,
      evidenceId: typeChangeEvidence.requestId,
    })
    .from(typeChangeRequest)
    .leftJoin(typeChangeEvidence, eq(typeChangeEvidence.requestId, typeChangeRequest.id))
    .where(eq(typeChangeRequest.requesterId, userId))
    .orderBy(desc(typeChangeRequest.submittedAt))
    .limit(1)

  let summary: TypeChangeRequestSummary | null = null
  if (latest) {
    const { evidenceId, ...rest } = latest
    summary = { ...rest, hasEvidence: evidenceId !== null }
  }

  return {
    participantType: u.participantType,
    latest: summary,
    canRequest:
      isBaseType(u.participantType) &&
      summary?.status !== 'pending' &&
      summary?.status !== 'approved',
  }
}

export interface SubmitTypeChangeInput {
  requestedType: RequestableType
  file: File
  comment?: string | null
}

/** Create a pending request with its evidence file. */
export async function submitTypeChangeRequest(userId: string, input: SubmitTypeChangeInput) {
  const comment = cleanComment(input.comment, REQUESTER_COMMENT_MAX)
  if (input.file.size === 0) throw new TypeChangeError('FILE_EMPTY')
  if (input.file.size > EVIDENCE_MAX_BYTES) throw new TypeChangeError('FILE_TOO_LARGE')
  const data = Buffer.from(await input.file.arrayBuffer())
  const mimeType = detectEvidenceType(data)
  if (!mimeType) throw new TypeChangeError('FILE_TYPE')

  try {
    return await dbClient.transaction(async (tx) => {
      // Lock the user row so concurrent submits/reviews for this user run one
      // at a time; the checks below then see each other's results.
      const [u] = await tx
        .select({ participantType: user.participantType })
        .from(user)
        .where(eq(user.id, userId))
        .for('update')
      if (!u || !isBaseType(u.participantType)) throw new TypeChangeError('NOT_ELIGIBLE')

      const [latest] = await tx
        .select({ status: typeChangeRequest.status })
        .from(typeChangeRequest)
        .where(eq(typeChangeRequest.requesterId, userId))
        .orderBy(desc(typeChangeRequest.submittedAt))
        .limit(1)
      if (latest?.status === 'pending') throw new TypeChangeError('ALREADY_PENDING')
      if (latest?.status === 'approved') throw new TypeChangeError('ALREADY_APPROVED')

      const [request] = await tx
        .insert(typeChangeRequest)
        .values({ requesterId: userId, requestedType: input.requestedType, requesterComment: comment })
        .returning({ id: typeChangeRequest.id })
      await tx.insert(typeChangeEvidence).values({
        requestId: request.id,
        fileName: cleanFileName(input.file.name),
        mimeType,
        size: data.length,
        data,
      })
      return { id: request.id }
    })
  } catch (e) {
    if (isUniqueViolation(e)) throw new TypeChangeError('ALREADY_PENDING')
    throw e
  }
}

// ---------------- Admin side ----------------

/** One row of the admin request list (see TypeChangeRequestTable.vue). */
export interface AdminTypeChangeRow {
  id: string
  requester: { id: string; name: string; email: string; participantType: ParticipantType }
  requestedType: RequestableType
  requesterComment: string | null
  status: TypeChangeStatus
  submittedAt: string // ISO
  statusChangedAt: string // ISO
  reviewer: { name: string; email: string } | null
  reviewerComment: string | null
  evidence: { fileName: string; mimeType: string; size: number } | null
}

/** All requests, newest first (the table sorts/filters on the client). */
export async function loadAdminTypeChangeRequests(): Promise<AdminTypeChangeRow[]> {
  const reviewer = alias(user, 'reviewer')
  const rows = await dbClient
    .select({
      ...getTableColumns(typeChangeRequest),
      requesterName: user.name,
      requesterEmail: user.email,
      requesterType: user.participantType,
      reviewerName: reviewer.name,
      reviewerEmail: reviewer.email,
      // Metadata only; the file bytes stay in the database.
      fileName: typeChangeEvidence.fileName,
      mimeType: typeChangeEvidence.mimeType,
      size: typeChangeEvidence.size,
    })
    .from(typeChangeRequest)
    .innerJoin(user, eq(user.id, typeChangeRequest.requesterId))
    .leftJoin(reviewer, eq(reviewer.id, typeChangeRequest.reviewerId))
    .leftJoin(typeChangeEvidence, eq(typeChangeEvidence.requestId, typeChangeRequest.id))
    .orderBy(desc(typeChangeRequest.submittedAt))

  return rows.map((r) => ({
    id: r.id,
    requester: {
      id: r.requesterId,
      name: r.requesterName,
      email: r.requesterEmail,
      participantType: r.requesterType,
    },
    requestedType: r.requestedType,
    requesterComment: r.requesterComment,
    status: r.status,
    submittedAt: r.submittedAt.toISOString(),
    statusChangedAt: r.statusChangedAt.toISOString(),
    reviewer:
      r.reviewerName !== null && r.reviewerEmail !== null
        ? { name: r.reviewerName, email: r.reviewerEmail }
        : null,
    reviewerComment: r.reviewerComment,
    evidence:
      r.fileName !== null && r.mimeType !== null && r.size !== null
        ? { fileName: r.fileName, mimeType: r.mimeType, size: r.size }
        : null,
  }))
}

export type ReviewDecision = 'approved' | 'rejected'

/**
 * Approve or reject a pending request. Approving also adds the student
 * discount to the user's participant type, in the same transaction. The
 * base is read at approval time, so a participant who became an author
 * (paper import) while the request was pending ends up author_student*.
 */
export async function reviewTypeChangeRequest(
  reviewerId: string,
  requestId: string,
  decision: ReviewDecision,
  comment?: string | null
) {
  const reviewerComment = cleanComment(comment, REVIEWER_COMMENT_MAX)
  if (decision === 'rejected' && !reviewerComment) throw new TypeChangeError('COMMENT_REQUIRED')

  return await dbClient.transaction(async (tx) => {
    // Only a pending request can be reviewed; if two admins click at once,
    // the second update matches nothing.
    const [updated] = await tx
      .update(typeChangeRequest)
      .set({ status: decision, reviewerId, reviewerComment, statusChangedAt: new Date() })
      .where(and(eq(typeChangeRequest.id, requestId), eq(typeChangeRequest.status, 'pending')))
      .returning({
        requesterId: typeChangeRequest.requesterId,
        requestedType: typeChangeRequest.requestedType,
        statusChangedAt: typeChangeRequest.statusChangedAt,
      })

    if (!updated) {
      const [exists] = await tx
        .select({ id: typeChangeRequest.id })
        .from(typeChangeRequest)
        .where(eq(typeChangeRequest.id, requestId))
      throw new TypeChangeError(exists ? 'NOT_PENDING' : 'NOT_FOUND')
    }

    if (decision === 'approved') {
      const [u] = await tx
        .select({ participantType: user.participantType })
        .from(user)
        .where(eq(user.id, updated.requesterId))
        .for('update')
      if (u) {
        await tx
          .update(user)
          .set({ participantType: withStudentStatus(u.participantType, updated.requestedType) })
          .where(eq(user.id, updated.requesterId))
      }
    }

    return {
      status: decision,
      reviewerComment,
      statusChangedAt: updated.statusChangedAt.toISOString(),
    }
  })
}

/** Evidence file for the download route. */
export async function getTypeChangeEvidence(requestId: string) {
  const [row] = await dbClient
    .select({
      requesterId: typeChangeRequest.requesterId,
      fileName: typeChangeEvidence.fileName,
      mimeType: typeChangeEvidence.mimeType,
      data: typeChangeEvidence.data,
    })
    .from(typeChangeEvidence)
    .innerJoin(typeChangeRequest, eq(typeChangeRequest.id, typeChangeEvidence.requestId))
    .where(eq(typeChangeEvidence.requestId, requestId))
  return row ?? null
}
