<script setup lang="ts">
import BillingAddressPreview from '@components/billing/BillingAddressPreview.vue'
import { toTypedSchema } from '@lib/forms/standardSchema'
import {
  BILLING_CREATE_BLOCK_LABELS,
  BILLING_FIELD_MAX,
  lockedMessage,
  type BillingAddressInput,
  type BillingField,
} from '@utils/billingAddress'
import { z } from 'astro/zod'
import { actions } from 'astro:actions'
import { useForm } from 'vee-validate'
import { computed, ref } from 'vue'

interface Props {
  locale: 'th' | 'en'
  /** Edit mode when set; create otherwise. */
  id?: string
  initial?: Partial<BillingAddressInput>
  /** Where to go after saving or cancelling. */
  listUrl: string
}
const props = defineProps<Props>()

const text = {
  th: {
    intro:
      'ข้อมูลนี้จะใช้ออกใบเสร็จรับเงินสำหรับการเบิกค่าลงทะเบียน กรุณาตรวจสอบตัวสะกดให้ถูกต้อง',
    fields: {
      name: 'ชื่อสำหรับออกใบเสร็จ',
      affiliation: 'หน่วยงาน (ไม่บังคับ)',
      address: 'ที่อยู่',
      phone: 'เบอร์โทรศัพท์',
      taxId: 'เลขประจำตัวผู้เสียภาษี (ไม่บังคับ)',
      branch: 'สาขา (ไม่บังคับ)',
    } satisfies Record<BillingField, string>,
    hints: {
      name: 'ชื่อบุคคลหรือชื่อหน่วยงานตามที่ต้องการให้ปรากฏบนใบเสร็จ',
      address: 'พิมพ์ตามที่ต้องการให้ปรากฏบนใบเสร็จ ขึ้นบรรทัดใหม่ได้',
      branch: 'เช่น สำนักงานใหญ่ หรือ 00001',
    } as Partial<Record<BillingField, string>>,
    preview: 'ตัวอย่างบนใบเสร็จ',
    previewHint: 'ตรวจสอบตัวสะกดก่อนบันทึก',
    save: 'ตรวจสอบและบันทึก',
    cancel: 'ยกเลิก',
    confirmTitle: 'ยืนยันข้อมูลสำหรับออกใบเสร็จ',
    confirmBody:
      'ข้อมูลด้านล่างจะปรากฏบนใบเสร็จตามนี้ทุกตัวอักษร เมื่อนำไปใช้ลงทะเบียนแล้วจะแก้ไขไม่ได้',
    confirmCheck: 'ฉันตรวจสอบแล้วว่าข้อมูลและตัวสะกดถูกต้อง',
    confirm: 'บันทึก',
    back: 'กลับไปแก้ไข',
    saving: 'กำลังบันทึก...',
    errors: {
      required: 'กรุณากรอกข้อมูลนี้',
      tooLong: (n: number) => `ต้องไม่เกิน ${n} ตัวอักษร`,
      NOT_FOUND: 'ไม่พบที่อยู่นี้ อาจถูกลบไปแล้ว',
      session: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
      unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    },
  },
  en: {
    intro:
      'This is used to issue the receipt for reimbursing your registration fee. Please check the spelling carefully.',
    fields: {
      name: 'Name on receipt',
      affiliation: 'Affiliation (optional)',
      address: 'Address',
      phone: 'Phone',
      taxId: 'Tax ID (optional)',
      branch: 'Branch (optional)',
    } satisfies Record<BillingField, string>,
    hints: {
      name: 'The person or organisation name to appear on the receipt.',
      address: 'Typed exactly as it should appear; line breaks are kept.',
      branch: 'e.g. Head office or 00001',
    } as Partial<Record<BillingField, string>>,
    preview: 'Receipt preview',
    previewHint: 'Check the spelling before saving.',
    save: 'Review and save',
    cancel: 'Cancel',
    confirmTitle: 'Confirm billing details',
    confirmBody:
      'The receipt will show exactly what is below. Once a registration uses this address, it can no longer be changed.',
    confirmCheck: 'I have checked that the details and spelling are correct.',
    confirm: 'Save',
    back: 'Back to edit',
    saving: 'Saving...',
    errors: {
      required: 'Please fill in this field.',
      tooLong: (n: number) => `Must be at most ${n} characters.`,
      NOT_FOUND: 'This address was not found. It may have been deleted.',
      session: 'Your session has expired. Please sign in again.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[props.locale])

const FIELDS: { key: BillingField; multiline?: boolean; autocomplete?: string }[] = [
  { key: 'name', autocomplete: 'name' },
  { key: 'affiliation', autocomplete: 'organization' },
  { key: 'address', multiline: true, autocomplete: 'street-address' },
  { key: 'phone', autocomplete: 'tel' },
  { key: 'taxId', autocomplete: 'off' },
  { key: 'branch', autocomplete: 'off' },
]

const errorMessage = ref('')
const redirecting = ref(false)
const saving = ref(false)

const schema = computed(() => {
  const e = t.value.errors
  const optional = (max: number) => z.string().trim().max(max, e.tooLong(max))
  const required = (max: number) => optional(max).min(1, e.required)
  return toTypedSchema(
    z.object({
      name: required(BILLING_FIELD_MAX.name),
      affiliation: optional(BILLING_FIELD_MAX.affiliation),
      address: required(BILLING_FIELD_MAX.address),
      phone: required(BILLING_FIELD_MAX.phone),
      taxId: optional(BILLING_FIELD_MAX.taxId),
      branch: optional(BILLING_FIELD_MAX.branch),
    })
  )
})

const { handleSubmit, errors, values, submitCount, setFieldError, defineField } = useForm({
  validationSchema: schema,
  initialValues: {
    name: props.initial?.name ?? '',
    affiliation: props.initial?.affiliation ?? '',
    address: props.initial?.address ?? '',
    phone: props.initial?.phone ?? '',
    taxId: props.initial?.taxId ?? '',
    branch: props.initial?.branch ?? '',
  },
})

const fieldConfig = () => {
  const eager = submitCount.value > 0
  return { validateOnModelUpdate: eager, validateOnBlur: eager, validateOnChange: eager }
}
const models = Object.fromEntries(
  FIELDS.map(({ key }) => {
    const [model, attrs] = defineField(key, fieldConfig)
    return [key, { model, attrs }]
  })
) as Record<BillingField, { model: ReturnType<typeof defineField>[0]; attrs: ReturnType<typeof defineField>[1] }>

const busy = computed(() => saving.value || redirecting.value)

// ---- Confirm dialog ----
const dialog = ref<HTMLDialogElement | null>(null)
const confirmed = ref(false)
const pending = ref<BillingAddressInput | null>(null)

const openConfirm = handleSubmit(
  (v) => {
    errorMessage.value = ''
    pending.value = v as BillingAddressInput
    confirmed.value = false
    dialog.value?.showModal()
  },
  () => {
    errorMessage.value = ''
  }
)

function closeConfirm() {
  dialog.value?.close()
}

function errorFor(code?: string, message?: string): string {
  const e = t.value.errors
  if (code === 'UNAUTHORIZED') return e.session
  // Rare: the edit page already redirects for locked addresses.
  const locked = lockedMessage(props.locale, message)
  if (locked) return locked
  if (message === 'LIMIT_REACHED' || message === 'STUDENT_LIMIT')
    return BILLING_CREATE_BLOCK_LABELS[props.locale][message]
  if (message === 'NOT_FOUND') return e.NOT_FOUND
  return e.unexpected
}

async function save() {
  if (!pending.value || !confirmed.value || busy.value) return
  saving.value = true
  try {
    const { error } = props.id
      ? await actions.billing.update({ id: props.id, ...pending.value })
      : await actions.billing.create(pending.value)
    if (error) {
      console.error('Billing address save error:', error)
      closeConfirm()
      if (error.message?.startsWith('INVALID:')) {
        const field = error.message.slice('INVALID:'.length) as BillingField
        // Rare: the client runs the same checks.
        const max = BILLING_FIELD_MAX[field]
        const sent = (pending.value?.[field] ?? '').trim()
        setFieldError(field, sent.length > max ? t.value.errors.tooLong(max) : t.value.errors.required)
      } else {
        errorMessage.value = errorFor(error.code, error.message)
      }
      return
    }
    redirecting.value = true
    window.location.assign(props.listUrl)
  } catch (e) {
    console.error('Billing address save failed:', e)
    closeConfirm()
    errorMessage.value = t.value.errors.unexpected
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[1fr_20rem]">
    <form class="flex flex-col gap-4" novalidate @submit="openConfirm">
      <p class="text-sm text-base-content/70">{{ t.intro }}</p>

      <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
        <span>{{ errorMessage }}</span>
      </div>

      <fieldset v-for="f in FIELDS" :key="f.key" class="fieldset gap-1 p-0">
        <label :for="`ba-${f.key}`" class="fieldset-legend pb-1 text-sm">
          {{ t.fields[f.key] }}
        </label>
        <textarea
          v-if="f.multiline"
          :id="`ba-${f.key}`"
          v-model="models[f.key].model.value"
          v-bind="models[f.key].attrs.value"
          :name="f.key"
          rows="4"
          :maxlength="BILLING_FIELD_MAX[f.key]"
          :autocomplete="f.autocomplete"
          class="textarea w-full"
          :class="{ 'textarea-error': errors[f.key] }"
          :aria-invalid="!!errors[f.key]"
          :aria-describedby="errors[f.key] ? `ba-${f.key}-error` : t.hints[f.key] ? `ba-${f.key}-hint` : undefined"
          :disabled="busy"
        />
        <input
          v-else
          :id="`ba-${f.key}`"
          v-model="models[f.key].model.value"
          v-bind="models[f.key].attrs.value"
          :name="f.key"
          type="text"
          :maxlength="BILLING_FIELD_MAX[f.key]"
          :autocomplete="f.autocomplete"
          class="input w-full"
          :class="{ 'input-error': errors[f.key] }"
          :aria-invalid="!!errors[f.key]"
          :aria-describedby="errors[f.key] ? `ba-${f.key}-error` : t.hints[f.key] ? `ba-${f.key}-hint` : undefined"
          :disabled="busy"
        />
        <p v-if="errors[f.key]" :id="`ba-${f.key}-error`" class="label text-xs text-error">
          {{ errors[f.key] }}
        </p>
        <p v-else-if="t.hints[f.key]" :id="`ba-${f.key}-hint`" class="label text-xs whitespace-normal">
          {{ t.hints[f.key] }}
        </p>
      </fieldset>

      <div class="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
          :disabled="busy"
        >
          {{ t.save }}
        </button>
        <a :href="listUrl" class="btn btn-ghost">{{ t.cancel }}</a>
      </div>
    </form>

    <!-- Live preview: beside the form on desktop, below it on mobile -->
    <aside class="lg:sticky lg:top-24 self-start" aria-live="polite">
      <p class="font-semibold mb-1">{{ t.preview }}</p>
      <p class="text-xs text-base-content/60 mb-3">{{ t.previewHint }}</p>
      <div class="rounded-box border border-dashed border-[#9E76B4] bg-[#F3E5F5]/40 p-4">
        <BillingAddressPreview :locale="locale" :value="values" placeholders />
      </div>
    </aside>

    <dialog ref="dialog" class="modal" @close="confirmed = false">
      <div class="modal-box">
        <h3 class="text-lg font-bold">{{ t.confirmTitle }}</h3>
        <p class="py-2 text-sm text-base-content/70">{{ t.confirmBody }}</p>
        <div class="rounded-box border border-base-300 bg-base-200/50 p-4 my-2">
          <BillingAddressPreview v-if="pending" :locale="locale" :value="pending" />
        </div>
        <label class="flex items-start gap-3 mt-4 cursor-pointer">
          <input v-model="confirmed" type="checkbox" class="checkbox checkbox-sm mt-0.5" :disabled="busy" />
          <span class="text-sm">{{ t.confirmCheck }}</span>
        </label>
        <div class="modal-action">
          <button type="button" class="btn btn-ghost" :disabled="busy" @click="closeConfirm">
            {{ t.back }}
          </button>
          <button
            type="button"
            class="btn border-0 bg-[#9E76B4] text-white hover:bg-[#8A62A0]"
            :disabled="!confirmed || busy"
            @click="save"
          >
            <span v-if="busy" class="loading loading-spinner loading-sm" />
            {{ busy ? t.saving : t.confirm }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button :disabled="busy">close</button></form>
    </dialog>
  </div>
</template>
