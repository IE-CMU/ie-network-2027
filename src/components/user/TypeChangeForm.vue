<script setup lang="ts">
import { PARTICIPANT_TYPE_LABELS } from '@utils/participantType'
import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_MIME_TYPES,
  REQUESTABLE_TYPES,
  REQUESTER_COMMENT_MAX,
  type RequestableType,
} from '@utils/typeChangeRequest'
import { actions } from 'astro:actions'
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

const requestedType = ref<RequestableType | ''>('')
const file = ref<File | null>(null)
const comment = ref('')
const loading = ref(false)
const errorMessage = ref('')

const ACCEPT = EVIDENCE_MIME_TYPES.join(',')

function onFileChange(e: Event) {
  errorMessage.value = ''
  const input = e.target as HTMLInputElement
  const f = input.files?.[0] ?? null
  file.value = f
  if (!f) return
  // Quick checks for a friendlier message; the server checks the bytes.
  if (!(EVIDENCE_MIME_TYPES as readonly string[]).includes(f.type)) {
    errorMessage.value = t.value.errors.FILE_TYPE
  } else if (f.size > EVIDENCE_MAX_BYTES) {
    errorMessage.value = t.value.errors.FILE_TOO_LARGE
  }
}

function errorFor(code?: string, message?: string): string {
  if (code === 'UNAUTHORIZED') return t.value.errors.session
  if (code === 'PAYLOAD_TOO_LARGE' || code === 'CONTENT_TOO_LARGE') return t.value.errors.FILE_TOO_LARGE
  const e = t.value.errors as Record<string, string>
  return (message && e[message]) || t.value.errors.unexpected
}

async function handleSubmit() {
  if (loading.value) return
  errorMessage.value = ''
  if (!requestedType.value) {
    errorMessage.value = t.value.errors.noType
    return
  }
  if (!file.value) {
    errorMessage.value = t.value.errors.noFile
    return
  }
  if (file.value.size > EVIDENCE_MAX_BYTES) {
    errorMessage.value = t.value.errors.FILE_TOO_LARGE
    return
  }
  if (comment.value.length > REQUESTER_COMMENT_MAX) {
    errorMessage.value = t.value.errors.COMMENT_TOO_LONG
    return
  }

  loading.value = true
  try {
    const form = new FormData()
    form.append('requestedType', requestedType.value)
    form.append('file', file.value)
    form.append('comment', comment.value)
    const { error } = await actions.typeChange.submit(form)
    if (error) {
      console.error('Type change submit error:', error)
      errorMessage.value = errorFor(error.code, error.message)
      loading.value = false
      return
    }
    // The account page shows the new pending request.
    window.location.assign(props.detailsUrl)
  } catch (e) {
    console.error('Type change submit failed:', e)
    errorMessage.value = t.value.errors.unexpected
    loading.value = false
  }
}
</script>

<template>
  <form class="flex flex-col gap-5" novalidate @submit.prevent="handleSubmit">
    <p class="text-sm text-base-content/70">{{ t.intro }}</p>

    <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
      <span>{{ errorMessage }}</span>
    </div>

    <fieldset class="fieldset gap-2 p-0">
      <legend class="fieldset-legend pb-1 text-sm">{{ t.type }}</legend>
      <label
        v-for="pt in REQUESTABLE_TYPES"
        :key="pt"
        class="flex items-start gap-3 rounded-box border border-base-300 p-3 cursor-pointer has-[:checked]:border-[#9E76B4] has-[:checked]:bg-[#F3E5F5]/50"
      >
        <input
          v-model="requestedType"
          type="radio"
          name="requestedType"
          :value="pt"
          class="radio radio-sm mt-0.5"
          :disabled="loading"
        />
        <span class="flex flex-col">
          <span class="font-semibold text-base-content">{{ typeLabels[pt] }}</span>
          <span class="text-xs text-base-content/70">{{ t.typeHints[pt] }}</span>
        </span>
      </label>
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="tc-file" class="fieldset-legend pb-1 text-sm">{{ t.file }}</label>
      <input
        id="tc-file"
        type="file"
        :accept="ACCEPT"
        class="file-input w-full"
        :disabled="loading"
        @change="onFileChange"
      />
      <p class="label text-xs">{{ t.fileHint }}</p>
      <p class="label text-xs">{{ t.privacy }}</p>
    </fieldset>

    <fieldset class="fieldset gap-1 p-0">
      <label for="tc-comment" class="fieldset-legend pb-1 text-sm">{{ t.comment }}</label>
      <textarea
        id="tc-comment"
        v-model="comment"
        rows="3"
        :maxlength="REQUESTER_COMMENT_MAX"
        class="textarea w-full"
        :disabled="loading"
      />
      <p class="label text-xs">{{ t.commentHint(comment.length) }}</p>
    </fieldset>

    <div>
      <button
        type="submit"
        class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
        :disabled="loading"
      >
        <span v-if="loading" class="loading loading-spinner loading-sm" />
        {{ loading ? t.sending : t.submit }}
      </button>
    </div>
  </form>
</template>
