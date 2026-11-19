<script setup lang="ts">
import type { BillingField } from '@utils/billingAddress'
import { computed } from 'vue'

// How the address will be printed on the receipt, so users can spot typos.
// Used live beside the form, in the confirm dialog, and on the list cards.
interface Props {
  locale: 'th' | 'en'
  /** Form values (strings) or a saved row (optional columns are null). */
  value: { [K in BillingField]?: string | null }
  /** Show placeholders for empty required fields (form preview). */
  placeholders?: boolean
}
const props = defineProps<Props>()

const text = {
  th: {
    billTo: 'ออกใบเสร็จในนาม',
    taxId: 'เลขประจำตัวผู้เสียภาษี',
    branch: 'สาขา',
    phone: 'โทร',
    name: 'ชื่อสำหรับออกใบเสร็จ',
    address: 'ที่อยู่',
  },
  en: {
    billTo: 'Bill to',
    taxId: 'Tax ID',
    branch: 'Branch',
    phone: 'Tel',
    name: 'Name on receipt',
    address: 'Address',
  },
} as const
const t = computed(() => text[props.locale])

const v = computed(() => {
  const s = (x: unknown) => (typeof x === 'string' ? x.trim() : '')
  return {
    name: s(props.value.name),
    affiliation: s(props.value.affiliation),
    address: s(props.value.address),
    phone: s(props.value.phone),
    taxId: s(props.value.taxId),
    branch: s(props.value.branch),
  }
})
</script>

<template>
  <div class="text-sm leading-relaxed break-words">
    <p class="text-xs uppercase tracking-wide text-base-content/60 mb-1">{{ t.billTo }}</p>
    <p class="font-semibold text-base">
      <template v-if="v.name">{{ v.name }}</template>
      <span v-else-if="placeholders" class="italic text-base-content/40">[{{ t.name }}]</span>
    </p>
    <p v-if="v.affiliation">{{ v.affiliation }}</p>
    <p v-if="v.address" class="whitespace-pre-line">{{ v.address }}</p>
    <p v-else-if="placeholders" class="italic text-base-content/40">[{{ t.address }}]</p>
    <p v-if="v.taxId || v.branch" class="mt-1">
      <span v-if="v.taxId">{{ t.taxId }} {{ v.taxId }}</span>
      <span v-if="v.taxId && v.branch"> · </span>
      <span v-if="v.branch">{{ t.branch }} {{ v.branch }}</span>
    </p>
    <p v-if="v.phone">{{ t.phone }} {{ v.phone }}</p>
  </div>
</template>
