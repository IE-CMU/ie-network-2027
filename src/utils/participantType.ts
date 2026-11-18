// Registration rate category of a user (`user.participant_type`).
// Kept free of DB imports so client components can use it.
//   general    – standard rate (default)
//   student    – student rate
//   ie_student – CMU IE student rate (special quota)
// Set by admins, or by an approved type change request (type_change_request).
export const PARTICIPANT_TYPES = ['general', 'student', 'ie_student'] as const

export type ParticipantType = (typeof PARTICIPANT_TYPES)[number]

export const isParticipantType = (v: unknown): v is ParticipantType =>
  PARTICIPANT_TYPES.includes(v as ParticipantType)

export const PARTICIPANT_TYPE_LABELS = {
  th: {
    general: 'บุคคลทั่วไป',
    student: 'นักศึกษา',
    ie_student: 'นักศึกษา IE มช.',
  },
  en: {
    general: 'General',
    student: 'Student',
    ie_student: 'CMU IE student',
  },
} as const satisfies Record<'th' | 'en', Record<ParticipantType, string>>
