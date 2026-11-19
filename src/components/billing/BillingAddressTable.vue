<script setup lang="ts">
import BillingAddressPreview from '@components/billing/BillingAddressPreview.vue'
import AppTableHead from '@components/common/AppTableHead.vue'
import {
  type AppFeatures,
  createAppColumnHelper,
  localeSortFn,
  rowSearch,
  useAppTable,
  useSelectFilter,
} from '@components/hook/useAppTable'
import type { AdminBillingAddressRow } from '@lib/billing/admin'
import { FlexRender, type FilterFn } from '@tanstack/vue-table'
import { BILLING_LOCK_REASONS, type BillingLockReason } from '@utils/billingAddress'
import { PARTICIPANT_TYPE_LABELS, STUDENT_STATUS_LABELS } from '@utils/participantType'
import type { TypeChangeStatus } from '@utils/typeChangeRequest'
import { computed, ref, watch } from 'vue'

// Read-only: admins look up billing details but never change them. A wrong
// address on a request is fixed by rejecting it (src/lib/billing/admin.ts).
interface Props {
  locale: 'th' | 'en'
  addresses: AdminBillingAddressRow[]
}
const props = defineProps<Props>()

const text = {
  th: {
    search: 'ค้นหาชื่อ อีเมล ชื่อบนใบเสร็จ หรือเลขผู้เสียภาษี',
    status: 'สถานะ',
    all: 'ทั้งหมด',
    unlocked: 'ไม่ล็อก',
    owner: 'เจ้าของ',
    billing: 'ที่อยู่สำหรับออกใบเสร็จ',
    updated: 'แก้ไขล่าสุด',
    locks: {
      IN_USE: 'ใช้ในการลงทะเบียน',
      UNDER_REVIEW: 'รอตรวจสอบสิทธิ์นักศึกษา',
      DISCOUNT_VERIFIED: 'ยืนยันสิทธิ์นักศึกษาแล้ว',
    } satisfies Record<BillingLockReason, string>,
    request: 'คำขอสิทธิ์นักศึกษา',
    requestStatuses: { pending: 'รอตรวจสอบ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ' },
    registrations: (n: number) => `ใช้ใน ${n} การลงทะเบียน`,
    showing: (n: number, total: number) => `แสดง ${n} จาก ${total} ที่อยู่`,
    empty: 'ไม่พบที่อยู่',
  },
  en: {
    search: 'Search name, email, billing name or tax ID',
    status: 'Status',
    all: 'All',
    unlocked: 'Unlocked',
    owner: 'Owner',
    billing: 'Billing address',
    updated: 'Last updated',
    locks: {
      IN_USE: 'Used by registration',
      UNDER_REVIEW: 'Student request under review',
      DISCOUNT_VERIFIED: 'Student discount verified',
    } satisfies Record<BillingLockReason, string>,
    request: 'Student request',
    requestStatuses: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
    registrations: (n: number) => `Used by ${n} registration${n === 1 ? '' : 's'}`,
    showing: (n: number, total: number) => `Showing ${n} of ${total} addresses`,
    empty: 'No addresses found.',
  },
} as const
const t = computed(() => text[props.locale])
const typeLabels = computed(() => PARTICIPANT_TYPE_LABELS[props.locale])
const studentLabels = computed(() => STUDENT_STATUS_LABELS[props.locale])

const rows = computed(() => props.addresses)

type LockFilter = 'all' | 'unlocked' | BillingLockReason

// 'unlocked' matches rows with no lock; a reason matches rows locked for it.
const lockFilter: FilterFn<AppFeatures, AdminBillingAddressRow> = (row, _id, value: LockFilter) =>
  value === 'unlocked'
    ? row.original.lockReasons.length === 0
    : row.original.lockReasons.includes(value as BillingLockReason)

const col = createAppColumnHelper<AdminBillingAddressRow>()
const columns = computed(() => {
  const loc = props.locale
  return col.columns([
    col.accessor('owner.name', {
      id: 'owner',
      header: () => t.value.owner,
      sortFn: localeSortFn(loc, (r) => r.createdAt),
    }),
    col.accessor('name', {
      id: 'billing',
      header: () => t.value.billing,
      sortFn: localeSortFn(loc),
    }),
    col.accessor((r) => r.lockReasons.join(','), {
      id: 'status',
      header: () => t.value.status,
      filterFn: lockFilter,
      enableSorting: false,
    }),
    col.accessor('updatedAt', {
      header: () => t.value.updated,
      // ISO strings sort chronologically; newest first by default.
      sortDescFirst: true,
      sortFn: localeSortFn(loc),
      enableGlobalFilter: false,
    }),
  ])
})

const table = useAppTable({
  columns,
  data: rows,
  initialState: { sorting: [{ id: 'owner', desc: false }] },
  enableSortingRemoval: false,
  ...rowSearch<AdminBillingAddressRow>(
    (r, q) =>
      [r.owner.name, r.owner.email, r.name, r.affiliation, r.taxId, r.phone].some((v) =>
        v?.toLowerCase().includes(q)
      ),
    'owner'
  ),
})

const query = ref('')
watch(query, (q) => table.setGlobalFilter(q.trim() || undefined))

const statusFilter = useSelectFilter<LockFilter>(() => table.getColumn('status'))

const visibleRows = computed(() => table.getRowModel().rows)

// th-TH uses the Buddhist calendar.
const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(props.locale === 'th' ? 'th-TH' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'Asia/Bangkok',
    })
)
const formatDate = (iso: string) => dateFormat.value.format(new Date(iso))

const requestClass: Record<TypeChangeStatus, string> = {
  pending: 'badge-info',
  approved: 'badge-success',
  rejected: 'badge-error',
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col sm:flex-row sm:items-end gap-3">
      <label class="input w-full sm:max-w-md">
        <span class="sr-only">{{ t.search }}</span>
        <input v-model="query" type="search" :placeholder="t.search" />
      </label>
      <select v-model="statusFilter" class="select select-sm w-auto" :aria-label="t.status">
        <option value="all">{{ t.status }}: {{ t.all }}</option>
        <option value="unlocked">{{ t.unlocked }}</option>
        <option v-for="r in BILLING_LOCK_REASONS" :key="r" :value="r">🔒 {{ t.locks[r] }}</option>
      </select>
    </div>

    <p class="text-sm text-base-content/70">
      {{ t.showing(visibleRows.length, rows.length) }}
    </p>

    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-sm">
        <AppTableHead :header-groups="table.getHeaderGroups()" />
        <tbody>
          <tr v-if="visibleRows.length === 0">
            <td
              :colspan="table.getVisibleLeafColumns().length"
              class="text-center text-base-content/70 py-6"
            >
              {{ t.empty }}
            </td>
          </tr>
          <tr v-for="row in visibleRows" :key="row.original.id" class="align-top">
            <template v-for="cell in row.getVisibleCells()" :key="cell.id">
              <td v-if="cell.column.id === 'owner'" class="min-w-48">
                <div class="font-semibold">{{ row.original.owner.name }}</div>
                <div class="text-base-content/70 break-all">{{ row.original.owner.email }}</div>
                <div class="text-xs text-base-content/70 mt-1">
                  {{ typeLabels[row.original.owner.participantType] }}
                </div>
              </td>
              <td v-else-if="cell.column.id === 'billing'" class="min-w-64 max-w-sm">
                <BillingAddressPreview :locale="locale" :value="row.original" />
              </td>
              <td v-else-if="cell.column.id === 'status'" class="min-w-52">
                <div class="flex flex-col gap-1">
                  <span
                    v-for="r in row.original.lockReasons"
                    :key="r"
                    class="badge badge-sm badge-warning badge-soft w-fit"
                  >
                    🔒 {{ t.locks[r] }}
                  </span>
                  <span
                    v-if="row.original.lockReasons.length === 0"
                    class="badge badge-sm badge-ghost w-fit"
                  >
                    {{ t.unlocked }}
                  </span>
                  <span v-if="row.original.latestRequest" class="text-xs text-base-content/70">
                    {{ t.request }}
                    ({{ studentLabels[row.original.latestRequest.requestedType] }}):
                    <span
                      class="badge badge-xs badge-soft"
                      :class="requestClass[row.original.latestRequest.status]"
                    >
                      {{ t.requestStatuses[row.original.latestRequest.status] }}
                    </span>
                  </span>
                  <span v-if="row.original.registrationCount > 0" class="text-xs text-base-content/70">
                    {{ t.registrations(row.original.registrationCount) }}
                  </span>
                </div>
              </td>
              <td v-else-if="cell.column.id === 'updatedAt'" class="whitespace-nowrap">
                {{ formatDate(row.original.updatedAt) }}
              </td>
              <td v-else><FlexRender :cell="cell" /></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
