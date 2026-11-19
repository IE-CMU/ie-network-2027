<script setup lang="ts">
import AppTableHead from '@components/common/AppTableHead.vue'
import {
  createAppColumnHelper,
  rowSearch,
  useAppTable,
  useSelectFilter,
} from '@components/hook/useAppTable'
import type { AdminTypeChangeRow } from '@lib/typeChange/requests'
import { FlexRender, type SortFn } from '@tanstack/vue-table'
import { PARTICIPANT_TYPE_LABELS, withStudentStatus } from '@utils/participantType'
import { REVIEWER_COMMENT_MAX, type TypeChangeStatus } from '@utils/typeChangeRequest'
import { actions } from 'astro:actions'
import { computed, ref, watch } from 'vue'

interface Props {
  locale: 'th' | 'en'
  requests: AdminTypeChangeRow[]
}
const props = defineProps<Props>()

type Decision = 'approved' | 'rejected'

const text = {
  th: {
    search: 'ค้นหาชื่อหรืออีเมล',
    status: 'สถานะ',
    all: 'ทั้งหมด',
    statuses: { pending: 'รอตรวจสอบ', approved: 'อนุมัติ', rejected: 'ไม่อนุมัติ' },
    submitted: 'ส่งเมื่อ',
    requester: 'ผู้ขอ',
    change: 'เปลี่ยนประเภท',
    evidence: 'หลักฐาน',
    noEvidence: 'ไม่มีไฟล์',
    comment: 'หมายเหตุผู้ขอ',
    review: 'ผลการตรวจสอบ',
    by: 'โดย',
    approve: 'อนุมัติ',
    reject: 'ไม่อนุมัติ',
    showing: (n: number, total: number) => `แสดง ${n} จาก ${total} คำขอ`,
    empty: 'ไม่พบคำขอ',
    dialogTitle: { approved: 'อนุมัติคำขอ', rejected: 'ไม่อนุมัติคำขอ' },
    dialogBody: (name: string, from: string, to: string) =>
      `${name}: เปลี่ยนประเภทจาก "${from}" เป็น "${to}"`,
    approveNote: 'เมื่ออนุมัติ ประเภทผู้เข้าร่วมของผู้ใช้จะถูกเปลี่ยนทันที',
    reviewerComment: { approved: 'หมายเหตุถึงผู้ขอ (ไม่บังคับ)', rejected: 'เหตุผล (จำเป็น ผู้ขอจะเห็นข้อความนี้)' },
    cancel: 'ยกเลิก',
    saving: 'กำลังบันทึก...',
    errors: {
      COMMENT_REQUIRED: 'กรุณาระบุเหตุผลที่ไม่อนุมัติ',
      COMMENT_TOO_LONG: `หมายเหตุต้องไม่เกิน ${REVIEWER_COMMENT_MAX} ตัวอักษร`,
      NOT_PENDING: 'คำขอนี้ได้รับการตรวจสอบไปแล้ว กรุณารีเฟรชหน้าเว็บ',
      NOT_FOUND: 'ไม่พบคำขอนี้ กรุณารีเฟรชหน้าเว็บ',
      session: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่',
      unexpected: 'เกิดข้อผิดพลาดที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง',
    },
  },
  en: {
    search: 'Search name or email',
    status: 'Status',
    all: 'All',
    statuses: { pending: 'Pending', approved: 'Approved', rejected: 'Rejected' },
    submitted: 'Submitted',
    requester: 'Requester',
    change: 'Change',
    evidence: 'Evidence',
    noEvidence: 'No file',
    comment: 'Requester comment',
    review: 'Review',
    by: 'by',
    approve: 'Approve',
    reject: 'Reject',
    showing: (n: number, total: number) => `Showing ${n} of ${total} requests`,
    empty: 'No requests found.',
    dialogTitle: { approved: 'Approve request', rejected: 'Reject request' },
    dialogBody: (name: string, from: string, to: string) =>
      `${name}: change type from "${from}" to "${to}"`,
    approveNote: "Approving changes the user's participant type immediately.",
    reviewerComment: {
      approved: 'Note to the requester (optional)',
      rejected: 'Reason (required, shown to the requester)',
    },
    cancel: 'Cancel',
    saving: 'Saving...',
    errors: {
      COMMENT_REQUIRED: 'Please give a reason for rejecting.',
      COMMENT_TOO_LONG: `The comment must be at most ${REVIEWER_COMMENT_MAX} characters.`,
      NOT_PENDING: 'This request has already been reviewed. Please refresh the page.',
      NOT_FOUND: 'This request no longer exists. Please refresh the page.',
      session: 'Your session has expired. Please sign in again.',
      unexpected: 'Something went wrong. Please try again.',
    },
  },
} as const
const t = computed(() => text[props.locale])
const typeLabels = computed(() => PARTICIPANT_TYPE_LABELS[props.locale])
// The type the requester gets (or got) on approval: same base, plus the discount.
const targetType = (r: AdminTypeChangeRow) =>
  withStudentStatus(r.requester.participantType, r.requestedType)

// Local copy so reviewed rows update without a reload. Rows are replaced, not
// mutated, so the table sees the change and re-filters/re-sorts.
const rows = ref<AdminTypeChangeRow[]>(props.requests.map((r) => ({ ...r })))

// ---------------------------------------------------------------------------
// Columns. The order is fixed (no header toggles): pending requests oldest
// first (first come, first served), everything else newest first.
// ---------------------------------------------------------------------------
const col = createAppColumnHelper<AdminTypeChangeRow>()

const reviewOrder: SortFn<any, AdminTypeChangeRow> = (a, b) =>
  a.original.status === 'pending' && b.original.status === 'pending'
    ? a.original.submittedAt.localeCompare(b.original.submittedAt)
    : b.original.submittedAt.localeCompare(a.original.submittedAt)

const columns = col.columns([
  col.accessor('submittedAt', {
    header: () => t.value.submitted,
    sortFn: reviewOrder,
  }),
  col.accessor('requester.name', { id: 'requester', header: () => t.value.requester }),
  col.display({ id: 'change', header: () => t.value.change }),
  col.display({ id: 'evidence', header: () => t.value.evidence }),
  col.accessor('requesterComment', { header: () => t.value.comment }),
  col.accessor('status', {
    header: () => t.value.review,
    filterFn: 'equals',
  }),
])

const table = useAppTable({
  columns,
  data: rows,
  initialState: {
    sorting: [{ id: 'submittedAt', desc: false }],
    columnFilters: [{ id: 'status', value: 'pending' }],
  },
  ...rowSearch<AdminTypeChangeRow>(
    (r, q) =>
      r.requester.name.toLowerCase().includes(q) ||
      r.requester.email.toLowerCase().includes(q),
    'requester'
  ),
})

const query = ref('')
watch(query, (q) => table.setGlobalFilter(q.trim() || undefined))

const statusFilter = useSelectFilter<'all' | TypeChangeStatus>(() => table.getColumn('status'))

const visibleRows = computed(() => table.getRowModel().rows)
const pendingCount = computed(() => rows.value.filter((r) => r.status === 'pending').length)

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
const formatSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.ceil(bytes / 1024)} KB`
const evidenceUrl = (r: AdminTypeChangeRow) => `/api/type-change-request/${r.id}/evidence`

const statusClass: Record<TypeChangeStatus, string> = {
  pending: 'badge-info',
  approved: 'badge-success',
  rejected: 'badge-error',
}

// ---- Review dialog ----
const dialog = ref<HTMLDialogElement | null>(null)
const reviewing = ref<AdminTypeChangeRow | null>(null)
const decision = ref<Decision>('approved')
const reviewerComment = ref('')
const saving = ref(false)
const errorMessage = ref('')

function openReview(r: AdminTypeChangeRow, d: Decision) {
  reviewing.value = r
  decision.value = d
  reviewerComment.value = ''
  errorMessage.value = ''
  dialog.value?.showModal()
}

function closeReview() {
  if (saving.value) return
  dialog.value?.close()
}

function errorFor(code?: string, message?: string): string {
  if (code === 'UNAUTHORIZED' || code === 'FORBIDDEN') return t.value.errors.session
  const e = t.value.errors as Record<string, string>
  return (message && e[message]) || t.value.errors.unexpected
}

async function submitReview() {
  const r = reviewing.value
  if (!r || saving.value) return
  errorMessage.value = ''
  const comment = reviewerComment.value.trim()
  if (decision.value === 'rejected' && !comment) {
    errorMessage.value = t.value.errors.COMMENT_REQUIRED
    return
  }
  saving.value = true
  try {
    const { data, error } = await actions.typeChange.review({
      id: r.id,
      decision: decision.value,
      comment,
    })
    if (error) {
      console.error('Type change review error:', error)
      errorMessage.value = errorFor(error.code, error.message)
      return
    }
    const updated: AdminTypeChangeRow = {
      ...r,
      status: data.status,
      reviewerComment: data.reviewerComment,
      statusChangedAt: data.statusChangedAt,
      reviewer: data.reviewer,
      requester:
        data.status === 'approved'
          ? { ...r.requester, participantType: targetType(r) }
          : r.requester,
    }
    rows.value = rows.value.map((x) => (x.id === r.id ? updated : x))
    dialog.value?.close()
  } catch (e) {
    console.error('Type change review failed:', e)
    errorMessage.value = t.value.errors.unexpected
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Filters -->
    <div class="flex flex-col sm:flex-row sm:items-end gap-3">
      <label class="input w-full sm:max-w-sm">
        <span class="sr-only">{{ t.search }}</span>
        <input v-model="query" type="search" :placeholder="t.search" />
      </label>
      <select v-model="statusFilter" class="select select-sm w-auto" :aria-label="t.status">
        <option value="all">{{ t.status }}: {{ t.all }}</option>
        <option value="pending">{{ t.statuses.pending }} ({{ pendingCount }})</option>
        <option value="approved">{{ t.statuses.approved }}</option>
        <option value="rejected">{{ t.statuses.rejected }}</option>
      </select>
    </div>

    <p class="text-sm text-base-content/70">
      {{ t.showing(visibleRows.length, rows.length) }}
    </p>

    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-sm">
        <AppTableHead :header-groups="table.getHeaderGroups()" :sortable="false" />
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
              <td v-if="cell.column.id === 'submittedAt'" class="whitespace-nowrap">
                {{ formatDate(row.original.submittedAt) }}
              </td>
              <td v-else-if="cell.column.id === 'requester'" class="min-w-48">
                <div class="font-semibold">{{ row.original.requester.name }}</div>
                <div class="text-base-content/70 break-all">{{ row.original.requester.email }}</div>
              </td>
              <td v-else-if="cell.column.id === 'change'" class="whitespace-nowrap">
                <span class="text-base-content/70">{{
                  typeLabels[row.original.requester.participantType]
                }}</span>
                <span v-if="row.original.status === 'pending'">
                  → <span class="font-semibold">{{ typeLabels[targetType(row.original)] }}</span>
                </span>
                <div v-else class="text-xs text-base-content/70">
                  {{ t.change }}: {{ typeLabels[targetType(row.original)] }}
                </div>
              </td>
              <td v-else-if="cell.column.id === 'evidence'" class="min-w-40">
                <template v-if="row.original.evidence">
                  <a
                    :href="evidenceUrl(row.original)"
                    target="_blank"
                    rel="noopener"
                    class="link link-primary break-all"
                  >
                    {{ row.original.evidence.fileName }}
                  </a>
                  <div class="text-xs text-base-content/70">
                    {{ formatSize(row.original.evidence.size) }}
                  </div>
                </template>
                <span v-else class="text-base-content/50">{{ t.noEvidence }}</span>
              </td>
              <td
                v-else-if="cell.column.id === 'requesterComment'"
                class="min-w-48 max-w-xs whitespace-pre-line break-words"
              >
                {{ row.original.requesterComment || '-' }}
              </td>
              <td v-else-if="cell.column.id === 'status'" class="min-w-56">
                <div v-if="row.original.status === 'pending'" class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="btn btn-sm btn-success btn-soft"
                    @click="openReview(row.original, 'approved')"
                  >
                    {{ t.approve }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-sm btn-error btn-soft"
                    @click="openReview(row.original, 'rejected')"
                  >
                    {{ t.reject }}
                  </button>
                </div>
                <div v-else class="flex flex-col gap-1">
                  <span
                    class="badge badge-sm badge-soft w-fit"
                    :class="statusClass[row.original.status]"
                  >
                    {{ t.statuses[row.original.status] }}
                  </span>
                  <span class="text-xs text-base-content/70">
                    {{ formatDate(row.original.statusChangedAt) }}
                    <template v-if="row.original.reviewer">
                      {{ t.by }} {{ row.original.reviewer.name }}
                    </template>
                  </span>
                  <span
                    v-if="row.original.reviewerComment"
                    class="text-sm whitespace-pre-line break-words"
                  >
                    {{ row.original.reviewerComment }}
                  </span>
                </div>
              </td>
              <td v-else><FlexRender :cell="cell" /></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Approve / reject dialog -->
    <dialog ref="dialog" class="modal" @cancel.prevent="closeReview">
      <form v-if="reviewing" class="modal-box flex flex-col gap-4" novalidate @submit.prevent="submitReview">
        <h3 class="text-lg font-bold">{{ t.dialogTitle[decision] }}</h3>
        <p class="text-sm">
          {{
            t.dialogBody(
              reviewing.requester.name,
              typeLabels[reviewing.requester.participantType],
              typeLabels[targetType(reviewing)]
            )
          }}
        </p>
        <p v-if="decision === 'approved'" class="text-sm text-base-content/70">{{ t.approveNote }}</p>

        <div v-if="errorMessage" role="alert" class="alert alert-error alert-soft text-sm">
          <span>{{ errorMessage }}</span>
        </div>

        <fieldset class="fieldset gap-1 p-0">
          <label for="tc-review-comment" class="fieldset-legend pb-1 text-sm">
            {{ t.reviewerComment[decision] }}
          </label>
          <textarea
            id="tc-review-comment"
            v-model="reviewerComment"
            rows="3"
            :maxlength="REVIEWER_COMMENT_MAX"
            class="textarea w-full"
            :disabled="saving"
          />
        </fieldset>

        <div class="modal-action mt-0">
          <button type="button" class="btn btn-ghost" :disabled="saving" @click="closeReview">
            {{ t.cancel }}
          </button>
          <button
            type="submit"
            class="btn"
            :class="decision === 'approved' ? 'btn-success' : 'btn-error'"
            :disabled="saving"
          >
            <span v-if="saving" class="loading loading-spinner loading-sm" />
            {{ saving ? t.saving : decision === 'approved' ? t.approve : t.reject }}
          </button>
        </div>
      </form>
    </dialog>
  </div>
</template>
