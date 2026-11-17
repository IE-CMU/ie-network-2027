<script lang="ts">
export interface AdminPaperRow {
  id: number
  title: string
  primarySubjectArea: string | null
  status: string
  isActive: boolean
  primaryContact: { name: string; email: string } | null
  authorCount: number
  // Every author's name and email, lowercased, for searching.
  authorSearch: string
}
</script>

<script setup lang="ts">
import { computed, ref } from 'vue'

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

const query = ref('')
const activityFilter = ref<'active' | 'inactive' | 'all'>('active')
const subjectFilter = ref('all')
const statusFilter = ref('all')

const distinct = (values: (string | null)[]) =>
  [...new Set(values.filter((v): v is string => !!v))].sort((a, b) =>
    collator.value.compare(a, b)
  )
const subjects = computed(() =>
  distinct(props.papers.map((p) => p.primarySubjectArea))
)
const statuses = computed(() => distinct(props.papers.map((p) => p.status)))

type SortKey = 'id' | 'title' | 'subject' | 'contact' | 'status'
const sortKey = ref<SortKey>('id')
const sortAsc = ref(true)

function setSort(key: SortKey) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    sortAsc.value = true
  }
}
const sortMark = (key: SortKey) =>
  sortKey.value === key ? (sortAsc.value ? ' ▲' : ' ▼') : ''

const sortValue = (p: AdminPaperRow, key: SortKey): string => {
  switch (key) {
    case 'title':
      return p.title
    case 'subject':
      return p.primarySubjectArea ?? ''
    case 'contact':
      return p.primaryContact?.name ?? ''
    case 'status':
      return p.status
    default:
      return ''
  }
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const rows = props.papers.filter(
    (p) =>
      (!q ||
        String(p.id) === q ||
        p.title.toLowerCase().includes(q) ||
        p.authorSearch.includes(q)) &&
      (activityFilter.value === 'all' ||
        (activityFilter.value === 'active') === p.isActive) &&
      (subjectFilter.value === 'all' ||
        p.primarySubjectArea === subjectFilter.value) &&
      (statusFilter.value === 'all' || p.status === statusFilter.value)
  )
  const dir = sortAsc.value ? 1 : -1
  const key = sortKey.value
  return rows.sort((a, b) => {
    const cmp =
      key === 'id'
        ? a.id - b.id
        : collator.value.compare(sortValue(a, key), sortValue(b, key))
    return cmp * dir || a.id - b.id
  })
})

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
      {{ t.showing(filtered.length, papers.length) }}
    </p>
    <p
      v-if="activityFilter !== 'active' && inactiveCount > 0"
      class="text-sm text-base-content/70"
    >
      {{ t.inactiveNote }}
    </p>

    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-sm">
        <thead>
          <tr>
            <th class="text-right">
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('id')"
              >
                {{ t.id }}{{ sortMark('id') }}
              </button>
            </th>
            <th>
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('title')"
              >
                {{ t.title }}{{ sortMark('title') }}
              </button>
            </th>
            <th>
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('subject')"
              >
                {{ t.subject }}{{ sortMark('subject') }}
              </button>
            </th>
            <th>
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('contact')"
              >
                {{ t.contact }}{{ sortMark('contact') }}
              </button>
            </th>
            <th>
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('status')"
              >
                {{ t.status }}{{ sortMark('status') }}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="5" class="text-center text-base-content/70 py-6">
              {{ t.empty }}
            </td>
          </tr>
          <tr
            v-for="p in filtered"
            :key="p.id"
            class="align-top"
            :class="p.isActive ? '' : 'text-base-content/50'"
          >
            <td class="text-right tabular-nums">{{ p.id }}</td>
            <td class="min-w-60 max-w-md">
              <span :title="p.title">{{ shorten(p.title) }}</span>
            </td>
            <td class="max-w-56">
              <span
                class="block truncate"
                :title="p.primarySubjectArea ?? undefined"
              >
                {{ p.primarySubjectArea ?? '-' }}
              </span>
            </td>
            <td class="min-w-40 max-w-64">
              <template v-if="p.primaryContact">
                <span class="block truncate" :title="p.primaryContact.email">
                  {{ p.primaryContact.name }}
                </span>
              </template>
              <span v-else>-</span>
              <span
                v-if="p.authorCount > (p.primaryContact ? 1 : 0)"
                class="text-xs text-base-content/60 whitespace-nowrap"
              >
                {{ t.more(p.authorCount - (p.primaryContact ? 1 : 0)) }}
              </span>
            </td>
            <td class="whitespace-nowrap">
              {{ p.status }}
              <span
                v-if="!p.isActive"
                class="badge badge-sm badge-warning badge-soft ml-1"
              >
                {{ t.inactive }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
