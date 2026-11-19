<script setup lang="ts">
import { BILLING_LOCK_REASON_LABELS } from '@utils/billingAddress'
import { actions } from 'astro:actions'
import { computed, ref } from 'vue'

// Delete button with a confirm dialog, for one card on the list page.
// Only rendered when the policy allows deleting; the server checks again.
interface Props {
  locale: 'th' | 'en'
  id: string
  name: string
}
const props = defineProps<Props>()

const text = {
  th: {
    delete: 'ลบ',
    title: 'ลบที่อยู่สำหรับออกใบเสร็จ',
    body: (n: string) => `ต้องการลบ "${n}" ใช่หรือไม่ การลบไม่สามารถย้อนกลับได้`,
    cancel: 'ยกเลิก',
    confirm: 'ลบ',
    deleting: 'กำลังลบ...',
    NOT_FOUND: 'ไม่พบที่อยู่นี้ อาจถูกลบไปแล้ว',
    session: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
    unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
  },
  en: {
    delete: 'Delete',
    title: 'Delete billing address',
    body: (n: string) => `Delete "${n}"? This cannot be undone.`,
    cancel: 'Cancel',
    confirm: 'Delete',
    deleting: 'Deleting...',
    NOT_FOUND: 'This address was not found. It may have been deleted.',
    session: 'Your session has expired. Please sign in again.',
    unexpected: 'Something went wrong. Please try again.',
  },
} as const
const t = computed(() => text[props.locale])

const dialog = ref<HTMLDialogElement | null>(null)
const busy = ref(false)
const errorMessage = ref('')

function open() {
  errorMessage.value = ''
  dialog.value?.showModal()
}

async function confirmDelete() {
  if (busy.value) return
  busy.value = true
  errorMessage.value = ''
  try {
    const { error } = await actions.billing.remove({ id: props.id })
    if (error) {
      console.error('Billing address delete error:', error)
      errorMessage.value =
        error.code === 'UNAUTHORIZED'
          ? t.value.session
          : error.message === 'LOCKED'
            ? BILLING_LOCK_REASON_LABELS[props.locale].IN_USE
            : error.message === 'NOT_FOUND'
              ? t.value.NOT_FOUND
              : t.value.unexpected
      busy.value = false
      return
    }
    // Reload so the list (and the add button's limit) is up to date.
    window.location.reload()
  } catch (e) {
    console.error('Billing address delete failed:', e)
    errorMessage.value = t.value.unexpected
    busy.value = false
  }
}
</script>

<template>
  <button type="button" class="btn btn-sm btn-ghost text-error" @click="open">
    {{ t.delete }}
  </button>
  <dialog ref="dialog" class="modal">
    <div class="modal-box">
      <h3 class="text-lg font-bold">{{ t.title }}</h3>
      <p class="py-3 text-sm break-words">{{ t.body(name) }}</p>
      <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
        <span>{{ errorMessage }}</span>
      </div>
      <div class="modal-action">
        <button type="button" class="btn btn-ghost" :disabled="busy" @click="dialog?.close()">
          {{ t.cancel }}
        </button>
        <button type="button" class="btn btn-error" :disabled="busy" @click="confirmDelete">
          <span v-if="busy" class="loading loading-spinner loading-sm" />
          {{ busy ? t.deleting : t.confirm }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop"><button :disabled="busy">close</button></form>
  </dialog>
</template>
