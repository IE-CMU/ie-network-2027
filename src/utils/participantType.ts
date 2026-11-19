// Registration rate category of a user (`user.participant_type`).
// Kept free of DB imports so client components can use it.
//
// Two parts: a base and an optional student discount.
//   base     participant – signed up themselves (magic link), not on a paper
//            author      – on an accepted paper (set by the CMT import)
//   discount student     – student rate
//            student_ie  – CMU IE student rate (special quota)
// The base is set by sign-up / import. The discount is granted by an
// approved type change request (type_change_request), keeping the base.
export const PARTICIPANT_TYPES = [
  'participant',
  'participant_student',
  'participant_student_ie',
  'author',
  'author_student',
  'author_student_ie',
] as const

export type ParticipantType = (typeof PARTICIPANT_TYPES)[number]

export const isParticipantType = (v: unknown): v is ParticipantType =>
  PARTICIPANT_TYPES.includes(v as ParticipantType)

export const BASE_TYPES = ['participant', 'author'] as const
export type BaseType = (typeof BASE_TYPES)[number]

/** Student discounts a user can request (`type_change_request.requested_type`). */
export const STUDENT_STATUSES = ['student', 'ie_student'] as const
export type StudentStatus = (typeof STUDENT_STATUSES)[number]

/** Base types have no discount yet, so only they may request one. */
export const isBaseType = (t: ParticipantType): t is BaseType =>
  (BASE_TYPES as readonly string[]).includes(t)

/** Has a student discount (approved type change request). */
export const hasStudentDiscount = (t: ParticipantType): boolean => !isBaseType(t)

export const baseOf =(t: ParticipantType): BaseType =>
  t.startsWith('author') ? 'author' : 'participant'

/** Same base, with the given discount. e.g. ('author', 'ie_student') → 'author_student_ie'. */
export const withStudentStatus = (t: ParticipantType, s: StudentStatus): ParticipantType =>
  `${baseOf(t)}_${s === 'student' ? 'student' : 'student_ie'}`

export const PARTICIPANT_TYPE_LABELS = {
  th: {
    participant: 'ผู้เข้าร่วมงาน',
    participant_student: 'ผู้เข้าร่วมงาน (นักศึกษา)',
    participant_student_ie: 'ผู้เข้าร่วมงาน (นักศึกษา IE มช.)',
    author: 'ผู้แต่งบทความ',
    author_student: 'ผู้แต่งบทความ (นักศึกษา)',
    author_student_ie: 'ผู้แต่งบทความ (นักศึกษา IE มช.)',
  },
  en: {
    participant: 'Participant',
    participant_student: 'Participant (Student)',
    participant_student_ie: 'Participant (CMU IE student)',
    author: 'Author',
    author_student: 'Author (Student)',
    author_student_ie: 'Author (CMU IE student)',
  },
} as const satisfies Record<'th' | 'en', Record<ParticipantType, string>>

export const STUDENT_STATUS_LABELS = {
  th: { student: 'นักศึกษา', ie_student: 'นักศึกษา IE มช.' },
  en: { student: 'Student', ie_student: 'CMU IE student' },
} as const satisfies Record<'th' | 'en', Record<StudentStatus, string>>
