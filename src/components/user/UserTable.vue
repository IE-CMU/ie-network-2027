<script setup lang="ts">
import type { AdminUserRow } from '@lib/user/admin'
import { PARTICIPANT_TYPE_LABELS, PARTICIPANT_TYPES, type ParticipantType } from '@utils/participantType'
import { computed, ref } from 'vue'

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

const query = ref('')
const roleFilter = ref<'all' | 'admin' | 'user'>('all')
const verifiedFilter = ref<'all' | 'yes' | 'no'>('all')
const paperFilter = ref<'all' | 'with' | 'without'>('all')
const typeFilter = ref<'all' | ParticipantType>('all')

type SortKey = 'name' | 'email' | 'paperCount' | 'createdAt'
const sortKey = ref<SortKey>('name')
const sortAsc = ref(true)

function setSort(key: SortKey) {
  if (sortKey.value === key) sortAsc.value = !sortAsc.value
  else {
    sortKey.value = key
    // Numbers/dates: largest/newest first is the more useful default.
    sortAsc.value = key === 'name' || key === 'email'
  }
}
const sortMark = (key: SortKey) =>
  sortKey.value === key ? (sortAsc.value ? ' ▲' : ' ▼') : ''

const isAdmin = (u: AdminUserRow) => u.roles.includes('admin')

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  const rows = props.users.filter(
    (u) =>
      (!q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)) &&
      (roleFilter.value === 'all' ||
        (roleFilter.value === 'admin') === isAdmin(u)) &&
      (verifiedFilter.value === 'all' ||
        (verifiedFilter.value === 'yes') === u.emailVerified) &&
      (paperFilter.value === 'all' ||
        (paperFilter.value === 'with') === u.paperCount > 0) &&
      (typeFilter.value === 'all' || typeFilter.value === u.participantType)
  )
  const dir = sortAsc.value ? 1 : -1
  const key = sortKey.value
  return rows.sort((a, b) => {
    const cmp =
      key === 'paperCount'
        ? a.paperCount - b.paperCount
        : a[key].localeCompare(b[key], props.locale === 'th' ? 'th' : 'en')
    return cmp * dir || a.name.localeCompare(b.name)
  })
})

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
      {{ t.showing(filtered.length, users.length) }}
    </p>

    <div class="overflow-x-auto rounded-box border border-base-300">
      <table class="table table-sm">
        <thead>
          <tr>
            <th>
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('name')"
              >
                {{ t.name }}{{ sortMark('name') }}
              </button>
            </th>
            <th>
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('email')"
              >
                {{ t.email }}{{ sortMark('email') }}
              </button>
            </th>
            <th>{{ t.role }}</th>
            <th>{{ t.type }}</th>
            <th>{{ t.verified }}</th>
            <th>{{ t.password }}</th>
            <th class="text-right">
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('paperCount')"
              >
                {{ t.papers }}{{ sortMark('paperCount') }}
              </button>
            </th>
            <th>
              <button
                type="button"
                class="cursor-pointer"
                @click="setSort('createdAt')"
              >
                {{ t.created }}{{ sortMark('createdAt') }}
              </button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="8" class="text-center text-base-content/70 py-6">
              {{ t.empty }}
            </td>
          </tr>
          <tr v-for="u in filtered" :key="u.id">
            <td class="min-w-40">
              {{ u.name }}
              <span
                v-if="u.banned"
                class="badge badge-sm badge-error badge-soft ml-1"
              >
                {{ t.banned }}
              </span>
            </td>
            <td class="break-all">{{ u.email }}</td>
            <td>
              <span
                class="badge badge-sm border-0 whitespace-nowrap"
                :class="
                  isAdmin(u)
                    ? 'bg-[#9E76B4] text-white'
                    : 'bg-[#F3E5F5] text-[#6B4A80]'
                "
              >
                {{ isAdmin(u) ? t.admin : t.user }}
              </span>
            </td>
            <td class="whitespace-nowrap">{{ t.types[u.participantType] }}</td>
            <td>
              <span
                class="badge badge-sm badge-soft whitespace-nowrap"
                :class="u.emailVerified ? 'badge-success' : 'badge-warning'"
              >
                {{ u.emailVerified ? t.yes : t.no }}
              </span>
            </td>
            <td class="whitespace-nowrap text-base-content/70">
              {{ u.hasPassword ? t.hasPassword : t.noPassword }}
            </td>
            <td class="text-right tabular-nums">{{ u.paperCount }}</td>
            <td class="whitespace-nowrap">{{ formatDate(u.createdAt) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
