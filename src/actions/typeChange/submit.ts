import { submitTypeChangeRequest } from '@/lib/typeChange/requests'
import { REQUESTABLE_TYPES } from '@/utils/typeChangeRequest'
import { z } from 'astro/zod'
import { defineAction } from 'astro:actions'
import { requireUser } from '../_guards'
import { toActionError } from './_errors'

/** User: ask to change their participant type, with an evidence file. */
export const submit = defineAction({
  accept: 'form',
  input: z.object({
    requestedType: z.enum(REQUESTABLE_TYPES),
    file: z.instanceof(File),
    comment: z.string().optional(),
  }),
  handler: async (input, context) => {
    const user = requireUser(context)
    try {
      return await submitTypeChangeRequest(user.id, input)
    } catch (e) {
      toActionError(e, 'Type change submit')
    }
  },
})
