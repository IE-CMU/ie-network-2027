<script setup lang="ts">
import {
  createAppColumnHelper,
  localeSortFn,
  numberSortFn,
  useAppTable,
  useSelectFilter,
} from '@components/hook/useAppTable'
import type { AdminUserRow } from '@lib/user/admin'
import { FlexRender } from '@tanstack/vue-table'
import { PARTICIPANT_TYPE_LABELS, PARTICIPANT_TYPES, type ParticipantType } from '@utils/participantType'
import { computed, ref, watch } from 'vue'

interface Props {
  locale: 'th' | 'en'
  users: AdminUserRow[]
}
const props = defineProps<Props>()

const text = {
  th: {
    search: 'ค้นหาชื่อหรืออีเมล',
    role: 'บทบาท',
    verified: 'ยืนยันอีเมล',
    papers: 'บทความ',
    all: 'ทั้งหมด',
    admin: 'ผู้ดูแลระบบ',
    user: 'ผู้ใช้',
    yes: 'ยืนยันแล้ว',
    no: 'ยังไม่ยืนยัน',
    withPapers: 'มีบทความ',
    withoutPapers: 'ไม่มีบทความ',
    name: 'ชื่อ',
    email: 'อีเมล',
    password: 'รหัสผ่าน',
    hasPassword: 'ตั้งแล้ว',
    noPassword: 'ลิงก์อีเมลเท่านั้น',
    created: 'สร้างเมื่อ',
    banned: 'ถูกระงับ',
    type: 'ประเภท',
    types: PARTICIPANT_TYPE_LABELS.th,
    showing: (n: number, total: number) => `แสดง ${n} จาก ${total} บัญชี`,
    empty: 'ไม่พบผู้ใช้',
  },
  en: {
    search: 'Search name or email',
    role: 'Role',
    verified: 'Verified',
    papers: 'Papers',
    all: 'All',
    admin: 'Administrator',
    user: 'User',
    yes: 'Verified',
    no: 'Not verified',
    withPapers: 'With papers',
    withoutPapers: 'Without papers',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    hasPassword: 'Set',
    noPassword: 'Email link only',
    created: 'Created',
    banned: 'Banned',
    type: 'Type',
    types: PARTICIPANT_TYPE_LABELS.en,
    showing: (n: number, total: number) => `Showing ${n} of ${total} accounts`,
    empty: 'No users found.',
  },
} as const
const t = computed(() => text[props.locale])

const isAdmin = (u: AdminUserRow) => u.roles.includes('admin')

// ---------------------------------------------------------------------------
// Columns: data, sorting and filtering live here; cell markup lives in the
// template. Filterable values are strings so the built-in `equals` filter
// works (it auto-removes falsy values, so a boolean `false` would be dropped).
// ---------------------------------------------------------------------------
const col = createAppColumnHelper<AdminUserRow>()
const byName = (u: AdminUserRow) => u.name

const columns = computed(() => {
  const loc = props.locale
  return col.columns([
    col.accessor('name', {
      header: () => t.value.name,
      sortFn: localeSortFn(loc),
    }),
    col.accessor('email', {
      header: () => t.value.email,
      sortFn: localeSortFn(loc, byName),
    }),
    col.accessor((u) => (isAdmin(u) ? 'admin' : 'user'), {
      id: 'role',
      header: () => t.value.role,
      enableSorting: false,
      enableGlobalFilter: false,
      filterFn: 'equals',
    }),
    col.accessor('participantType', {
      header: () => t.value.type,
      enableSorting: false,
      enableGlobalFilter: false,
      filterFn: 'equals',
    }),
    col.accessor((u) => (u.emailVerified ? 'yes' : 'no'), {
      id: 'verified',
      header: () => t.value.verified,
      enableSorting: false,
      enableGlobalFilter: false,
      filterFn: 'equals',
    }),
    col.accessor('hasPassword', {
      header: () => t.value.password,
      enableSorting: false,
      enableGlobalFilter: false,
    }),
    col.accessor('paperCount', {
      header: () => t.value.papers,
      // Most papers first is the more useful default.
      sortDescFirst: true,
      sortFn: numberSortFn(loc, byName),
      enableGlobalFilter: false,
      filterFn: (row, _id, value: 'with' | 'without') =>
        (value === 'with') === row.original.paperCount > 0,
    }),
    col.accessor('createdAt', {
      header: () => t.value.created,
      // ISO strings sort chronologically; newest first by default.
      sortDescFirst: true,
      sortFn: localeSortFn(loc, byName),
      enableGlobalFilter: false,
    }),
  ])
})

const table = useAppTable({
  columns,
  data: computed(() => props.users),
  initialState: { sorting: [{ id: 'name', desc: false }] },
  // Clicking a sorted column flips asc/desc instead of cycling to "unsorted".
  enableSortingRemoval: false,
})

// Search: keep the raw input locally so typing spaces is not fought by trim().
const query = ref('')
watch(query, (q) => table.setGlobalFilter(q.trim() || undefined))

const roleFilter = useSelectFilter<'all' | 'admin' | 'user'>(() => table.getColumn('role'))
const verifiedFilter = useSelectFilter<'all' | 'yes' | 'no'>(() => table.getColumn('verified'))
const paperFilter = useSelectFilter<'all' | 'with' | 'without'>(() => table.getColumn('paperCount'))
const typeFilter = useSelectFilter<'all' | ParticipantType>(() => table.getColumn('participantType'))

const rows = computed(() => table.getRowModel().rows)
const sortMark = (dir: false | 'asc' | 'desc') =>
  dir === 'asc' ? ' ▲' : dir === 'desc' ? ' ▼' : ''

// th-TH uses the Buddhist calendar.
const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(props.locale === 'th' ? 'th-TH' : 'en-GB', {
      dateStyle: 'medium',
      timeZone: 'Asia/Bangkok',
    })
)
const formatDate = (iso: string) => dateFormat.value.format(new Date(iso))
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
          v-model="roleFilter"
          class="select select-sm w-auto"
          :aria-label="t.role"
        >
          <option value="all">{{ t.role }}: {{ t.all }}</option>
          <option value="admin">{{ t.admin }}</option>
          <option value="user">{{ t.user }}</option>
        </select>
        <select
          v-model="verifiedFilter"
          class="select select-sm w-auto"
          :aria-label="t.verified"
        >
          <option value="all">{{ t.verified }}: {{ t.all }}</option>
          <option value="yes">{{ t.yes }}</option>
          <option value="no">{{ t.no }}</option>
        </select>
        <select
          v-model="paperFilter"
          class="select select-sm w-auto"
          :aria-label="t.papers"
        >
          <option value="all">{{ t.papers }}: {{ t.all }}</option>
          <option value="with">{{ t.withPapers }}</option>
          <option value="without">{{ t.withoutPapers }}</option>
        </select>
        <select
          v-model="typeFilter"
          class="select select-sm w-auto"
          :aria-label="t.type"
        >
          <option value="all">{{ t.type }}: {{ t.all }}</option>
          <option v-for="pt in PARTICIPANT_TYPES" :key="pt" :value="pt">
            {{ t.types[pt] }}
          </option>
        </select>
      </div>
    </div>

    <p class="text-sm text-base-content/70">
      {{ t.showing(rows.length, users.length) }}
    </p>

    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-sm">
        <thead>
          <tr v-for="hg in table.getHeaderGroups()" :key="hg.id">
            <th
              v-for="header in hg.headers"
              :key="header.id"
              :class="{ 'text-right': header.column.id === 'paperCount' }"
            >
              <button
                v-if="header.column.getCanSort()"
                type="button"
                class="cursor-pointer"
                @click="header.column.getToggleSortingHandler()?.($event)"
              >
                <FlexRender :header="header" />{{
                  sortMark(header.column.getIsSorted())
                }}
              </button>
              <FlexRender v-else :header="header" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td
              :colspan="table.getAllLeafColumns().length"
              class="text-center text-base-content/70 py-6"
            >
              {{ t.empty }}
            </td>
          </tr>
          <tr v-for="row in rows" :key="row.original.id">
            <template v-for="cell in row.getAllCells()" :key="cell.id">
              <td v-if="cell.column.id === 'name'" class="min-w-40">
                {{ row.original.name }}
                <span
                  v-if="row.original.banned"
                  class="badge badge-sm badge-error badge-soft ml-1"
                >
                  {{ t.banned }}
                </span>
              </td>
              <td v-else-if="cell.column.id === 'email'" class="break-all">
                {{ row.original.email }}
              </td>
              <td v-else-if="cell.column.id === 'role'">
                <span
                  class="badge badge-sm border-0 whitespace-nowrap"
                  :class="
                    isAdmin(row.original)
                      ? 'bg-[#9E76B4] text-white'
                      : 'bg-[#F3E5F5] text-[#6B4A80]'
                  "
                >
                  {{ isAdmin(row.original) ? t.admin : t.user }}
                </span>
              </td>
              <td
                v-else-if="cell.column.id === 'participantType'"
                class="whitespace-nowrap"
              >
                {{ t.types[row.original.participantType] }}
              </td>
              <td v-else-if="cell.column.id === 'verified'">
                <span
                  class="badge badge-sm badge-soft whitespace-nowrap"
                  :class="
                    row.original.emailVerified ? 'badge-success' : 'badge-warning'
                  "
                >
                  {{ row.original.emailVerified ? t.yes : t.no }}
                </span>
              </td>
              <td
                v-else-if="cell.column.id === 'hasPassword'"
                class="whitespace-nowrap text-base-content/70"
              >
                {{ row.original.hasPassword ? t.hasPassword : t.noPassword }}
              </td>
              <td
                v-else-if="cell.column.id === 'paperCount'"
                class="text-right tabular-nums"
              >
                {{ row.original.paperCount }}
              </td>
              <td
                v-else-if="cell.column.id === 'createdAt'"
                class="whitespace-nowrap"
              >
                {{ formatDate(row.original.createdAt) }}
              </td>
              <td v-else><FlexRender :cell="cell" /></td>
            </template>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
