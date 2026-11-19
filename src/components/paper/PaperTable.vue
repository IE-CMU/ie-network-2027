<script setup lang="ts">
import AppTableHead from '@components/common/AppTableHead.vue'
import {
  createAppColumnHelper,
  localeSortFn,
  numberSortFn,
  rowSearch,
  useAppTable,
  useSelectFilter,
} from '@components/hook/useAppTable'
import type { AdminPaperRow } from '@lib/paper/admin'
import { FlexRender } from '@tanstack/vue-table'
import { computed, ref, watch } from 'vue'

interface Props {
  locale: 'th' | 'en'
  papers: AdminPaperRow[]
}
const props = defineProps<Props>()

const text = {
  th: {
    search: 'ค้นหารหัส ชื่อบทความ หรือผู้แต่ง',
    activity: 'การใช้งาน',
    active: 'ใช้งานอยู่',
    inactive: 'ปิดใช้งาน',
    all: 'ทั้งหมด',
    id: 'รหัส',
    title: 'ชื่อบทความ',
    subject: 'หัวข้อหลัก',
    contact: 'ผู้ติดต่อหลัก',
    status: 'สถานะ',
    more: (n: number) => `+${n} คน`,
    showing: (n: number, total: number) => `แสดง ${n} จาก ${total} บทความ`,
    inactiveNote:
      'บทความที่ปิดใช้งานคือบทความที่ไม่อยู่ในไฟล์ที่นำเข้าล่าสุดหรือไม่ได้รับการตอบรับแล้ว จะกลับมาใช้งานเมื่อปรากฏในไฟล์อีกครั้ง',
    empty: 'ไม่พบบทความ',
  },
  en: {
    search: 'Search ID, title or author',
    activity: 'Activity',
    active: 'Active',
    inactive: 'Deactivated',
    all: 'All',
    id: 'ID',
    title: 'Title',
    subject: 'Primary subject area',
    contact: 'Primary contact',
    status: 'Status',
    more: (n: number) => `+${n} more`,
    showing: (n: number, total: number) => `Showing ${n} of ${total} papers`,
    inactiveNote:
      'Deactivated papers are missing from the latest import or no longer accepted. They are reactivated if they appear in a later import.',
    empty: 'No papers found.',
  },
} as const
const t = computed(() => text[props.locale])
const collator = computed(
  () => new Intl.Collator(props.locale === 'th' ? 'th' : 'en')
)

const distinct = (values: (string | null)[]) =>
  [...new Set(values.filter((v): v is string => !!v))].sort((a, b) =>
    collator.value.compare(a, b)
  )
const subjects = computed(() =>
  distinct(props.papers.map((p) => p.primarySubjectArea))
)
const statuses = computed(() => distinct(props.papers.map((p) => p.status)))

// ---------------------------------------------------------------------------
// Columns. Every sort is ascending first and ties fall back to the paper ID.
// ---------------------------------------------------------------------------
const col = createAppColumnHelper<AdminPaperRow>()
const byId = (p: AdminPaperRow) => p.id

const columns = computed(() => {
  const loc = props.locale === 'th' ? 'th' : 'en'
  return col.columns([
    col.accessor('id', {
      header: () => t.value.id,
      meta: { headerClass: 'text-right' },
      sortFn: numberSortFn(loc),
    }),
    col.accessor('title', {
      header: () => t.value.title,
      sortFn: localeSortFn(loc, byId),
    }),
    col.accessor((p) => p.primarySubjectArea ?? '', {
      id: 'subject',
      header: () => t.value.subject,
      sortFn: localeSortFn(loc, byId),
      filterFn: 'equals',
    }),
    col.accessor((p) => p.primaryContact?.name ?? '', {
      id: 'contact',
      header: () => t.value.contact,
      sortFn: localeSortFn(loc, byId),
    }),
    col.accessor('status', {
      header: () => t.value.status,
      sortFn: localeSortFn(loc, byId),
      filterFn: 'equals',
    }),
    // Filter-only column (hidden below); the status cell shows the badge.
    col.accessor((p) => (p.isActive ? 'active' : 'inactive'), {
      id: 'activity',
      header: () => t.value.activity,
      enableSorting: false,
      filterFn: 'equals',
    }),
  ])
})

const table = useAppTable({
  columns,
  data: computed(() => props.papers),
  initialState: {
    sorting: [{ id: 'id', desc: false }],
    columnFilters: [{ id: 'activity', value: 'active' }],
    columnVisibility: { activity: false },
  },
  enableSortingRemoval: false,
  ...rowSearch<AdminPaperRow>(
    (p, q) =>
      String(p.id) === q ||
      p.title.toLowerCase().includes(q) ||
      p.authorSearch.includes(q),
    'id'
  ),
})

const query = ref('')
watch(query, (q) => table.setGlobalFilter(q.trim() || undefined))

const activityFilter = useSelectFilter<'active' | 'inactive' | 'all'>(() =>
  table.getColumn('activity')
)
const subjectFilter = useSelectFilter<string>(() => table.getColumn('subject'))
const statusFilter = useSelectFilter<string>(() => table.getColumn('status'))

const rows = computed(() => table.getRowModel().rows)

// Count graphemes, not UTF-16 units, so a Thai vowel or tone mark is never
// split from its consonant.
const TITLE_MAX = 80
const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
function shorten(s: string): string {
  const parts = Array.from(graphemes.segment(s), (g) => g.segment)
  return parts.length <= TITLE_MAX
    ? s
    : parts.slice(0, TITLE_MAX).join('').trimEnd() + '…'
}

const inactiveCount = computed(
  () => props.papers.filter((p) => !p.isActive).length
)
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Filters -->
    <div class="flex flex-col lg:flex-row lg:items-end gap-3">
      <label class="input w-full lg:max-w-sm">
        <span class="sr-only">{{ t.search }}</span>
        <input v-model="query" type="search" :placeholder="t.search" />
      </label>
      <div class="flex flex-wrap gap-3">
        <select
          v-model="activityFilter"
          class="select select-sm w-auto"
          :aria-label="t.activity"
        >
          <option value="active">{{ t.active }}</option>
          <option value="inactive">
            {{ t.inactive }} ({{ inactiveCount }})
          </option>
          <option value="all">{{ t.activity }}: {{ t.all }}</option>
        </select>
        <select
          v-model="subjectFilter"
          class="select select-sm w-auto max-w-64"
          :aria-label="t.subject"
        >
          <option value="all">{{ t.subject }}: {{ t.all }}</option>
          <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
        </select>
        <select
          v-model="statusFilter"
          class="select select-sm w-auto"
          :aria-label="t.status"
        >
          <option value="all">{{ t.status }}: {{ t.all }}</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
    </div>

    <p class="text-sm text-base-content/70">
      {{ t.showing(rows.length, papers.length) }}
    </p>
    <p
      v-if="activityFilter !== 'active' && inactiveCount > 0"
      class="text-sm text-base-content/70"
    >
      {{ t.inactiveNote }}
    </p>

    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-sm">
        <AppTableHead :header-groups="table.getHeaderGroups()" />
        <tbody>
          <tr v-if="rows.length === 0">
            <td
              :colspan="table.getVisibleLeafColumns().length"
              class="text-center text-base-content/70 py-6"
            >
              {{ t.empty }}
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="row.original.id"
            class="align-top"
            :class="row.original.isActive ? '' : 'text-base-content/50'"
          >
            <template v-for="cell in row.getVisibleCells()" :key="cell.id">
              <td
                v-if="cell.column.id === 'id'"
                class="text-right tabular-nums"
              >
                {{ row.original.id }}
              </td>
              <td v-else-if="cell.column.id === 'title'" class="min-w-60 max-w-md">
                <span :title="row.original.title">{{ shorten(row.original.title) }}</span>
              </td>
              <td v-else-if="cell.column.id === 'subject'" class="max-w-56">
                <span
                  class="block truncate"
                  :title="row.original.primarySubjectArea ?? undefined"
                >
                  {{ row.original.primarySubjectArea ?? '-' }}
                </span>
              </td>
              <td v-else-if="cell.column.id === 'contact'" class="min-w-40 max-w-64">
                <template v-if="row.original.primaryContact">
                  <span
                    class="block truncate"
                    :title="row.original.primaryContact.email"
                  >
                    {{ row.original.primaryContact.name }}
                  </span>
                </template>
                <span v-else>-</span>
                <span
                  v-if="row.original.authorCount > (row.original.primaryContact ? 1 : 0)"
                  class="text-xs text-base-content/60 whitespace-nowrap"
                >
                  {{
                    t.more(
                      row.original.authorCount - (row.original.primaryContact ? 1 : 0)
                    )
                  }}
                </span>
              </td>
              <td v-else-if="cell.column.id === 'status'" class="whitespace-nowrap">
                {{ row.original.status }}
                <span
                  v-if="!row.original.isActive"
                  class="badge badge-sm badge-warning badge-soft ml-1"
                >
                  {{ t.inactive }}
                </span>
              </td>
              <td v-else><FlexRender :cell="cell" /></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
