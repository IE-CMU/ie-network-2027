// Shared constants for participant type change requests
// (`type_change_request` table). Kept free of DB imports so client
// components can use them.
import {
  isBaseType,
  STUDENT_STATUSES,
  type BaseType,
  type ParticipantType,
  type StudentStatus,
} from './participantType.js'

//   pending  – waiting for an admin
//   approved – user.participant_type got the requested student discount
//   rejected – the user may submit a new request
export const TYPE_CHANGE_STATUSES = ['pending', 'approved', 'rejected'] as const

export type TypeChangeStatus = (typeof TYPE_CHANGE_STATUSES)[number]

// What a user can ask for: a student discount on top of their base type
// (participant or author). Approval keeps the base, see withStudentStatus.
export const REQUESTABLE_TYPES = STUDENT_STATUSES

export type RequestableType = StudentStatus

// Which base types may request a student discount. Participants pay one
// rate for now; add 'participant' here to offer them the discount too
// (everything else — types, form, admin review — is already in place).
export const DISCOUNT_ELIGIBLE_BASES: readonly BaseType[] = ['author']

/** May a user of this type request a student discount? Only a base type
 *  (no discount yet) listed in DISCOUNT_ELIGIBLE_BASES. */
export const canRequestDiscount = (t: ParticipantType): boolean =>
  isBaseType(t) && DISCOUNT_ELIGIBLE_BASES.includes(t)

// Why a user cannot request a discount right now (src/lib/typeChange/policy.ts).
//   NOT_ELIGIBLE               – already has a discount, or base not eligible
//   ALREADY_PENDING / _APPROVED – see TYPE_CHANGE_STATUSES
//   NO_BILLING_ADDRESS / TOO_MANY_BILLING_ADDRESSES – the request needs
//     exactly one billing address, so the admin knows which one to check
//     for the student's name (financial regulation).
export const TYPE_CHANGE_BLOCK_REASONS = [
  'NOT_ELIGIBLE',
  'ALREADY_PENDING',
  'ALREADY_APPROVED',
  'NO_BILLING_ADDRESS',
  'TOO_MANY_BILLING_ADDRESSES',
] as const

export type TypeChangeBlockReason = (typeof TYPE_CHANGE_BLOCK_REASONS)[number]

/** Reasons the user can fix on the billing address page. */
export const BILLING_BLOCK_REASONS: readonly TypeChangeBlockReason[] = [
  'NO_BILLING_ADDRESS',
  'TOO_MANY_BILLING_ADDRESSES',
]

export const TYPE_CHANGE_BILLING_MESSAGES = {
  th: {
    NO_BILLING_ADDRESS:
      'ก่อนขอสิทธิ์นักศึกษา กรุณาเพิ่มที่อยู่สำหรับออกใบเสร็จในชื่อของนักศึกษา 1 รายการ',
    TOO_MANY_BILLING_ADDRESSES:
      'ก่อนขอสิทธิ์นักศึกษา คุณต้องมีที่อยู่สำหรับออกใบเสร็จเพียง 1 รายการ (ในชื่อของนักศึกษา) กรุณาลบรายการอื่น',
  },
  en: {
    NO_BILLING_ADDRESS:
      "Before requesting a student discount, please add one billing address in the student's name.",
    TOO_MANY_BILLING_ADDRESSES:
      "To request a student discount you must have exactly one billing address (in the student's name). Please delete the others.",
  },
} as const

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
