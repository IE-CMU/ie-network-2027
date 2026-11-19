// Shared constants for participant type change requests
// (`type_change_request` table). Kept free of DB imports so client
// components can use them.
import { STUDENT_STATUSES, type StudentStatus } from './participantType.js'

//   pending  – waiting for an admin
//   approved – user.participant_type got the requested student discount
//   rejected – the user may submit a new request
export const TYPE_CHANGE_STATUSES = ['pending', 'approved', 'rejected'] as const

export type TypeChangeStatus = (typeof TYPE_CHANGE_STATUSES)[number]

// What a user can ask for: a student discount on top of their base type
// (participant or author). Approval keeps the base, see withStudentStatus.
export const REQUESTABLE_TYPES = STUDENT_STATUSES

export type RequestableType = StudentStatus

// Evidence upload (ID card etc.). The server checks the file's first bytes,
// not just the type the browser reports.
export const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024 // 10 MB
export const EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const
export type EvidenceMimeType = (typeof EVIDENCE_MIME_TYPES)[number]

export const REQUESTER_COMMENT_MAX = 1000
export const REVIEWER_COMMENT_MAX = 1000
