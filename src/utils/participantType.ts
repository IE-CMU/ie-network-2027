// Registration rate category of a user (`user.participant_type`).
// Kept free of DB imports so client components can use it.
//   general    – standard rate (default)
//   student    – student rate
//   ie_student – CMU IE student rate (special quota)
// Set only by admins; users cannot change it themselves.
export const PARTICIPANT_TYPES = ['general', 'student', 'ie_student'] as const

export type ParticipantType = (typeof PARTICIPANT_TYPES)[number]

export const isParticipantType = (v: unknown): v is ParticipantType =>
  PARTICIPANT_TYPES.includes(v as ParticipantType)
