import { dbClient } from '@/db/client'
import { user } from '@/db/schema'
import { PARTICIPANT_TYPES } from '@/utils/participantType'
import { z } from 'astro/zod'
import { ActionError, defineAction } from 'astro:actions'
import { eq } from 'drizzle-orm'
import { requireAdmin } from '../_guards'

/**
 * Admin-only: set a user's registration rate category (general / student /
 * ie_student). Users cannot change this themselves (input: false in the
 * better-auth config), so this is the only way it changes.
 */
export const setParticipantType = defineAction({
  input: z.object({
    userId: z.string().min(1),
    participantType: z.enum(PARTICIPANT_TYPES),
  }),
  handler: async ({ userId, participantType }, context) => {
    requireAdmin(context)
    const updated = await dbClient
      .update(user)
      .set({ participantType })
      .where(eq(user.id, userId))
      .returning({ id: user.id })
    if (updated.length === 0) {
      throw new ActionError({ code: 'NOT_FOUND', message: 'USER_NOT_FOUND' })
    }
    return { ok: true, participantType }
  },
})
