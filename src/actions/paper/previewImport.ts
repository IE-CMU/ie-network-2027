import { planImport } from '@/lib/papers/import'
import { defineAction } from 'astro:actions'
import { requireAdmin } from '../_guards'
import { paperListInput, parsePaperList } from './_cmtUpload'

/** Admin: parse a CMT paper list and report what an import would change. */
export const previewImport = defineAction({
  accept: 'form',
  input: paperListInput,
  handler: async ({ file }, context) => {
    requireAdmin(context)
    return await planImport(await parsePaperList(file))
  },
})
