<script setup lang="ts">
import { actions } from 'astro:actions'
import { computed, ref } from 'vue'

interface Props {
  locale: 'th' | 'en'
  papersUrl: string
}
const props = defineProps<Props>()

type Summary = {
  totalRows: number
  accepted: number
  newPapers: number[]
  updatedPapers: number[]
  reactivatedPapers: number[]
  unchangedPapers: number
  deactivatedPapers: { id: number; title: string }[]
  newUsers: { email: string; name: string }[]
  authorLinks: number
  warnings: string[]
}

const text = {
  th: {
    title: 'นำเข้ารายการบทความจาก CMT',
    intro:
      'อัปโหลดไฟล์ Paper List ที่ส่งออกจาก CMT (.xls) ระบบจะนำเข้าเฉพาะบทความที่สถานะมีคำว่า "accept" และสร้างบัญชีผู้ใช้ให้ผู้แต่งที่ยังไม่มีบัญชี',
    file: 'ไฟล์จาก CMT',
    preview: 'ตรวจสอบ',
    checking: 'กำลังตรวจสอบ...',
    confirm: 'ยืนยันการนำเข้า',
    importing: 'กำลังนำเข้า...',
    cancel: 'ยกเลิก',
    previewTitle: 'ผลการตรวจสอบ (ยังไม่บันทึก)',
    doneTitle: 'นำเข้าเรียบร้อยแล้ว',
    rows: 'แถวในไฟล์',
    accepted: 'บทความที่ accept',
    newPapers: 'บทความใหม่',
    updated: 'มีการเปลี่ยนแปลง',
    reactivated: 'กลับมาใช้งาน',
    unchanged: 'ไม่เปลี่ยนแปลง',
    deactivated: 'จะถูกปิดใช้งาน (ไม่อยู่ในไฟล์/ไม่ accept แล้ว)',
    deactivatedDone: 'ปิดใช้งานแล้ว',
    newUsers: 'บัญชีผู้ใช้ใหม่',
    authorLinks: 'ผู้แต่ง (รวมทุกบทความ)',
    warnings: 'คำเตือน',
    noAccepted: 'ไม่พบบทความที่ accept ในไฟล์นี้ จึงไม่สามารถนำเข้าได้',
    unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    session: 'เซสชันหมดอายุหรือไม่มีสิทธิ์ กรุณาเข้าสู่ระบบใหม่',
    tooLarge: 'ไฟล์มีขนาดใหญ่เกินไป',
    backToPapers: 'ไปหน้ารายการบทความ',
    importAnother: 'นำเข้าไฟล์อื่น',
  },
  en: {
    title: 'Import papers from CMT',
    intro:
      'Upload the Paper List exported from CMT (.xls). Only papers whose status contains "accept" are imported, and accounts are created for authors who don\'t have one.',
    file: 'CMT export file',
    preview: 'Check file',
    checking: 'Checking...',
    confirm: 'Confirm import',
    importing: 'Importing...',
    cancel: 'Cancel',
    previewTitle: 'Preview (nothing saved yet)',
    doneTitle: 'Import complete',
    rows: 'Rows in file',
    accepted: 'Accepted papers',
    newPapers: 'New papers',
    updated: 'Changed',
    reactivated: 'Reactivated',
    unchanged: 'Unchanged',
    deactivated: 'Will be deactivated (missing / no longer accepted)',
    deactivatedDone: 'Deactivated',
    newUsers: 'New user accounts',
    authorLinks: 'Author links (all papers)',
    warnings: 'Warnings',
    noAccepted:
      'No accepted papers found in this file, so it cannot be imported.',
    unexpected: 'Something went wrong. Please try again.',
    session:
      'Your session has expired or you are not allowed. Please sign in again.',
    tooLarge: 'The file is too large.',
    backToPapers: 'Go to papers',
    importAnother: 'Import another file',
  },
} as const
const t = computed(() => text[props.locale])

const fileInput = ref<HTMLInputElement | null>(null)
const file = ref<File | null>(null)
const summary = ref<Summary | null>(null)
const done = ref(false)
const loading = ref<'preview' | 'import' | null>(null)
const errorMessage = ref('')

function onFileChange(e: Event) {
  file.value = (e.target as HTMLInputElement).files?.[0] ?? null
  summary.value = null
  done.value = false
  errorMessage.value = ''
}

function reset() {
  file.value = null
  summary.value = null
  done.value = false
  errorMessage.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function errorFor(error: {
  code?: string
  message?: string
  status?: number
}): string {
  if (error.code === 'UNAUTHORIZED' || error.code === 'FORBIDDEN')
    return t.value.session
  if (error.code === 'CONTENT_TOO_LARGE' || error.status === 413)
    return t.value.tooLarge
  // Parse / validation problems carry a readable (English) message.
  if (error.code === 'BAD_REQUEST' || error.code === 'INTERNAL_SERVER_ERROR') {
    return error.message || t.value.unexpected
  }
  return t.value.unexpected
}

async function run(kind: 'preview' | 'import') {
  if (!file.value || loading.value) return
  errorMessage.value = ''
  loading.value = kind
  try {
    const form = new FormData()
    form.append('file', file.value)
    const action =
      kind === 'preview' ? actions.previewPaperImport : actions.importPapers
    const { data, error } = await action(form)
    if (error) {
      console.error(`Paper ${kind} error:`, error)
      errorMessage.value = errorFor(error)
      return
    }
    summary.value = data
    // Stay on this page so the summary can be read; links below lead on.
    if (kind === 'import') done.value = true
  } catch (e) {
    console.error(`Paper ${kind} failed:`, e)
    errorMessage.value = t.value.unexpected
  } finally {
    loading.value = null
  }
}

const stats = computed(() => {
  const s = summary.value
  if (!s) return []
  return [
    { label: t.value.rows, value: s.totalRows },
    { label: t.value.accepted, value: s.accepted },
    { label: t.value.newPapers, value: s.newPapers.length },
    { label: t.value.updated, value: s.updatedPapers.length },
    { label: t.value.reactivated, value: s.reactivatedPapers.length },
    { label: t.value.unchanged, value: s.unchangedPapers },
    {
      label: done.value ? t.value.deactivatedDone : t.value.deactivated,
      value: s.deactivatedPapers.length,
    },
    { label: t.value.newUsers, value: s.newUsers.length },
    { label: t.value.authorLinks, value: s.authorLinks },
  ]
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <div>
      <h2 class="text-lg font-bold">{{ t.title }}</h2>
      <p class="mt-1 text-sm text-base-content/70">{{ t.intro }}</p>
    </div>

    <div
      v-if="errorMessage"
      role="alert"
      class="alert alert-error alert-soft text-sm"
    >
      <span class="break-words">{{ errorMessage }}</span>
    </div>

    <div class="flex flex-col sm:flex-row sm:items-end gap-3">
      <fieldset class="fieldset gap-1 p-0 grow">
        <label for="cmt-file" class="fieldset-legend pb-1 text-sm">
          {{ t.file }}
        </label>
        <input
          id="cmt-file"
          ref="fileInput"
          type="file"
          accept=".xls,.xml"
          class="file-input w-full"
          :disabled="loading !== null"
          @change="onFileChange"
        />
      </fieldset>
      <button
        type="button"
        class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
        :disabled="!file || loading !== null || (summary !== null && !done)"
        @click="run('preview')"
      >
        <span
          v-if="loading === 'preview'"
          class="loading loading-spinner loading-sm"
        />
        {{ loading === 'preview' ? t.checking : t.preview }}
      </button>
    </div>

    <div
      v-if="summary"
      class="rounded-box border border-base-300 p-4 flex flex-col gap-4"
    >
      <h4 class="font-bold" :class="done ? 'text-success' : ''">
        {{ done ? t.doneTitle : t.previewTitle }}
      </h4>

      <dl
        class="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-sm"
      >
        <template v-for="s in stats" :key="s.label">
          <dt class="text-base-content/70">{{ s.label }}</dt>
          <dd class="font-semibold tabular-nums sm:text-right">
            {{ s.value }}
          </dd>
        </template>
      </dl>

      <details v-if="summary.deactivatedPapers.length" class="text-sm" open>
        <summary class="cursor-pointer font-semibold text-warning">
          {{ done ? t.deactivatedDone : t.deactivated }} ({{
            summary.deactivatedPapers.length
          }})
        </summary>
        <ul class="mt-2 ml-5 list-disc">
          <li v-for="p in summary.deactivatedPapers" :key="p.id">
            #{{ p.id }} {{ p.title }}
          </li>
        </ul>
      </details>

      <details v-if="summary.newUsers.length" class="text-sm">
        <summary class="cursor-pointer font-semibold">
          {{ t.newUsers }} ({{ summary.newUsers.length }})
        </summary>
        <ul class="mt-2 ml-5 list-disc">
          <li v-for="u in summary.newUsers" :key="u.email" class="break-all">
            {{ u.name }} &lt;{{ u.email }}&gt;
          </li>
        </ul>
      </details>

      <details v-if="summary.warnings.length" class="text-sm" open>
        <summary class="cursor-pointer font-semibold text-warning">
          {{ t.warnings }} ({{ summary.warnings.length }})
        </summary>
        <ul class="mt-2 ml-5 list-disc">
          <li v-for="(w, i) in summary.warnings" :key="i" class="break-words">
            {{ w }}
          </li>
        </ul>
      </details>

      <div v-if="done" class="flex flex-wrap gap-2">
        <a
          :href="papersUrl"
          class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
        >
          {{ t.backToPapers }}
        </a>
        <button type="button" class="btn btn-ghost" @click="reset">
          {{ t.importAnother }}
        </button>
      </div>

      <div v-else class="flex flex-wrap gap-2">
        <p v-if="summary.accepted === 0" class="text-sm text-error w-full">
          {{ t.noAccepted }}
        </p>
        <button
          type="button"
          class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
          :disabled="loading !== null || summary.accepted === 0"
          @click="run('import')"
        >
          <span
            v-if="loading === 'import'"
            class="loading loading-spinner loading-sm"
          />
          {{ loading === 'import' ? t.importing : t.confirm }}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          :disabled="loading !== null"
          @click="reset"
        >
          {{ t.cancel }}
        </button>
      </div>
    </div>
  </div>
</template>
