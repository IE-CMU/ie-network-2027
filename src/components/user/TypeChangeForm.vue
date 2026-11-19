<script setup lang="ts">
import { toTypedSchema } from '@lib/forms/standardSchema'
import { PARTICIPANT_TYPE_LABELS } from '@utils/participantType'
import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME_TYPES,
  REQUESTABLE_TYPES,
  REQUESTER_COMMENT_MAX,
  type RequestableType,
} from '@utils/typeChangeRequest'
import { z } from 'astro/zod'
import { actions } from 'astro:actions'
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'

interface Props {
  locale: 'th' | 'en'
  /** Where to go after submitting; that page shows the request status. */
  detailsUrl: string
}
const props = defineProps<Props>()

const MAX_MB = EVIDENCE_MAX_BYTES / (1024 * 1024)

const text = {
  th: {
    intro:
      'อัปโหลดหลักฐาน เช่น บัตรนักศึกษาหรือหนังสือรับรองการเป็นนักศึกษา ผู้ดูแลระบบจะตรวจสอบและแจ้งผลในหน้าบัญชีของคุณ',
    type: 'ประเภทที่ต้องการ',
    typeHints: {
      student: 'นักศึกษาที่กำลังศึกษาอยู่',
      ie_student: 'นักศึกษาภาควิชาวิศวกรรมอุตสาหการ มหาวิทยาลัยเชียงใหม่',
    } satisfies Record<RequestableType, string>,
    file: 'ไฟล์หลักฐาน',
    fileHint: `JPG, PNG, WebP หรือ PDF ขนาดไม่เกิน ${MAX_MB} MB`,
    comment: 'หมายเหตุ (ไม่บังคับ)',
    commentHint: (n: number) => `${n}/${REQUESTER_COMMENT_MAX} ตัวอักษร`,
    privacy: 'ไฟล์นี้จะเห็นได้เฉพาะคุณและผู้ดูแลระบบเท่านั้น',
    submit: 'ส่งคำขอ',
    sending: 'กำลังส่ง...',
    errors: {
      noType: 'กรุณาเลือกประเภทที่ต้องการ',
      noFile: 'กรุณาเลือกไฟล์หลักฐาน',
      FILE_EMPTY: 'ไฟล์ว่างเปล่า',
      FILE_TOO_LARGE: `ไฟล์ต้องมีขนาดไม่เกิน ${MAX_MB} MB`,
      FILE_TYPE: 'รองรับเฉพาะไฟล์ JPG, PNG, WebP หรือ PDF',
      COMMENT_TOO_LONG: `หมายเหตุต้องไม่เกิน ${REQUESTER_COMMENT_MAX} ตัวอักษร`,
      NOT_GENERAL: 'ประเภทผู้เข้าร่วมของคุณถูกเปลี่ยนแล้ว กรุณาตรวจสอบที่หน้าบัญชีของคุณ',
      ALREADY_PENDING: 'คุณมีคำขอที่รอการตรวจสอบอยู่แล้ว',
      ALREADY_APPROVED: 'คำขอของคุณได้รับการอนุมัติแล้ว',
      session: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
      unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    },
  },
  en: {
    intro:
      'Upload evidence such as your student ID card or a certificate of enrolment. An administrator will review it, and the result will show on your account page.',
    type: 'Requested type',
    typeHints: {
      student: 'Currently enrolled student',
      ie_student: 'Student of the Department of Industrial Engineering, Chiang Mai University',
    } satisfies Record<RequestableType, string>,
    file: 'Evidence file',
    fileHint: `JPG, PNG, WebP or PDF, up to ${MAX_MB} MB`,
    comment: 'Comment (optional)',
    commentHint: (n: number) => `${n}/${REQUESTER_COMMENT_MAX} characters`,
    privacy: 'Only you and the administrators can see this file.',
    submit: 'Submit request',
    sending: 'Submitting...',
    errors: {
      noType: 'Please choose the type you are requesting.',
      noFile: 'Please choose an evidence file.',
      FILE_EMPTY: 'The file is empty.',
      FILE_TOO_LARGE: `The file must be ${MAX_MB} MB or smaller.`,
      FILE_TYPE: 'Only JPG, PNG, WebP or PDF files are accepted.',
      COMMENT_TOO_LONG: `The comment must be at most ${REQUESTER_COMMENT_MAX} characters.`,
      NOT_GENERAL: 'Your participant type has already been changed. Please check your account page.',
      ALREADY_PENDING: 'You already have a request waiting for review.',
      ALREADY_APPROVED: 'Your request has already been approved.',
      session: 'Your session has expired. Please sign in again.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[props.locale])
const typeLabels = computed(() => PARTICIPANT_TYPE_LABELS[props.locale])

const ACCEPT = EVIDENCE_MIME_TYPES.join(',')
const FILE_ERROR_CODES = ['FILE_EMPTY', 'FILE_TOO_LARGE', 'FILE_TYPE'] as const

// Banner for server/session errors. Field errors live in vee-validate.
const errorMessage = ref('')
// Stays true after a successful submit until the page navigates away.
const redirecting = ref(false)

// Rebuilt when the locale (messages) changes. The browser-reported type and
// size are quick checks for a friendlier message; the server checks the bytes.
const schema = computed(() => {
  const e = t.value.errors
  return toTypedSchema(
    z.object({
      requestedType: z.enum(REQUESTABLE_TYPES, { error: e.noType }),
      file: z
        .custom<File | null>()
        .superRefine((f, ctx) => {
          if (!f) ctx.addIssue({ code: 'custom', message: e.noFile })
          else if (!(EVIDENCE_MIME_TYPES as readonly string[]).includes(f.type))
            ctx.addIssue({ code: 'custom', message: e.FILE_TYPE })
          else if (f.size === 0)
            ctx.addIssue({ code: 'custom', message: e.FILE_EMPTY })
          else if (f.size > EVIDENCE_MAX_BYTES)
            ctx.addIssue({ code: 'custom', message: e.FILE_TOO_LARGE })
        })
        .transform((f) => f as File),
      comment: z.string().max(REQUESTER_COMMENT_MAX, e.COMMENT_TOO_LONG),
    })
  )
})

const { defineField, handleSubmit, errors, isSubmitting, submitCount, setFieldError } =
  useForm({
    validationSchema: schema,
    initialValues: { file: null, comment: '' },
  })

// Lazy until the first submit attempt, then validate as the user changes a field.
const fieldConfig = () => {
  const eager = submitCount.value > 0
  return {
    validateOnModelUpdate: eager,
    validateOnBlur: eager,
    validateOnChange: eager,
  }
}
const [requestedType, requestedTypeAttrs] = defineField('requestedType', fieldConfig)
const [comment, commentAttrs] = defineField('comment', fieldConfig)
// Check the file as soon as it is picked, so a wrong type/size shows right away.
const [file] = defineField('file', { validateOnModelUpdate: true })

const busy = computed(() => isSubmitting.value || redirecting.value)

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  file.value = input.files?.[0] ?? null
}

function errorFor(code?: string, message?: string): string {
  if (code === 'UNAUTHORIZED') return t.value.errors.session
  if (code === 'PAYLOAD_TOO_LARGE' || code === 'CONTENT_TOO_LARGE') return t.value.errors.FILE_TOO_LARGE
  const e = t.value.errors as Record<string, string>
  return (message && e[message]) || t.value.errors.unexpected
}

/** Show a server error on the relevant field when there is one, otherwise in the banner. */
function showServerError(code?: string, message?: string) {
  const msg = errorFor(code, message)
  if (
    code === 'PAYLOAD_TOO_LARGE' ||
    code === 'CONTENT_TOO_LARGE' ||
    (FILE_ERROR_CODES as readonly (string | undefined)[]).includes(message)
  )
    setFieldError('file', msg)
  else if (message === 'COMMENT_TOO_LONG') setFieldError('comment', msg)
  else errorMessage.value = msg
}

const onSubmit = handleSubmit(
  async (values) => {
    if (redirecting.value) return
    errorMessage.value = ''
    try {
      const form = new FormData()
      form.append('requestedType', values.requestedType)
      form.append('file', values.file)
      form.append('comment', values.comment)
      const { error } = await actions.typeChange.submit(form)
      if (error) {
        console.error('Type change submit error:', error)
        showServerError(error.code, error.message)
        return
      }
      redirecting.value = true
      // The account page shows the new pending request.
      window.location.assign(props.detailsUrl)
    } catch (e) {
      console.error('Type change submit failed:', e)
      errorMessage.value = t.value.errors.unexpected
    }
  },
  () => {
    // Clear a stale server error when the user retries with invalid input.
    errorMessage.value = ''
  }
)
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit="onSubmit">
    <p class="text-sm text-base-content/70">{{ t.intro }}</p>

    <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
      <span>{{ errorMessage }}</span>
    </div>

    <fieldset
      class="fieldset gap-2 p-0"
      :aria-invalid="!!errors.requestedType"
      :aria-describedby="errors.requestedType ? 'tc-type-error' : undefined"
    >
      <legend class="fieldset-legend pb-1 text-sm">{{ t.type }}</legend>
      <label
        v-for="pt in REQUESTABLE_TYPES"
        :key="pt"
        class="flex items-start gap-3 rounded-box border p-3 cursor-pointer has-[:checked]:border-[#9E76B4] has-[:checked]:bg-[#F3E5F5]/50"
        :class="errors.requestedType ? 'border-error' : 'border-base-300'"
      >
        <input
          v-model="requestedType"
          v-bind="requestedTypeAttrs"
          type="radio"
          name="requestedType"
          :value="pt"
          class="radio radio-sm mt-0.5"
          :disabled="busy"
        />
        <span class="flex flex-col">
          <span class="font-semibold text-base-content">{{ typeLabels[pt] }}</span>
          <span class="text-xs text-base-content/70">{{ t.typeHints[pt] }}</span>
        </span>
      </label>
      <p v-if="errors.requestedType" id="tc-type-error" class="label text-xs text-error">
        {{ errors.requestedType }}
      </p>
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="tc-file" class="fieldset-legend pb-1 text-sm">{{ t.file }}</label>
      <input
        id="tc-file"
        type="file"
        name="file"
        :accept="ACCEPT"
        class="file-input w-full"
        :class="{ 'file-input-error': errors.file }"
        :aria-invalid="!!errors.file"
        :aria-describedby="errors.file ? 'tc-file-error' : 'tc-file-hint'"
        :disabled="busy"
        @change="onFileChange"
      />
      <p v-if="errors.file" id="tc-file-error" class="label text-xs text-error">
        {{ errors.file }}
      </p>
      <p v-else id="tc-file-hint" class="label text-xs">{{ t.fileHint }}</p>
      <p class="label text-xs">{{ t.privacy }}</p>
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="tc-comment" class="fieldset-legend pb-1 text-sm">{{ t.comment }}</label>
      <textarea
        id="tc-comment"
        v-model="comment"
        v-bind="commentAttrs"
        name="comment"
        rows="3"
        :maxlength="REQUESTER_COMMENT_MAX"
        class="textarea w-full"
        :class="{ 'textarea-error': errors.comment }"
        :aria-invalid="!!errors.comment"
        :aria-describedby="errors.comment ? 'tc-comment-error' : 'tc-comment-hint'"
        :disabled="busy"
      />
      <p v-if="errors.comment" id="tc-comment-error" class="label text-xs text-error">
        {{ errors.comment }}
      </p>
      <p v-else id="tc-comment-hint" class="label text-xs">
        {{ t.commentHint(comment?.length ?? 0) }}
      </p>
    </fieldset>

    <div>
      <button
        type="submit"
        class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
        :disabled="busy"
      >
        <span v-if="busy" class="loading loading-spinner loading-sm" />
        {{ busy ? t.sending : t.submit }}
      </button>
    </div>
  </form>
</template>
