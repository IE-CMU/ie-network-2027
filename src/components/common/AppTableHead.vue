<script setup lang="ts">
import type { AppFeatures } from '@components/hook/useAppTable'
import { FlexRender, type HeaderGroup } from '@tanstack/vue-table'

/**
 * `<thead>` for an app table: renders each header through FlexRender, adds a
 * sort toggle (▲/▼) on sortable columns and applies `columnDef.meta.headerClass`.
 * Pass `:sortable="false"` for a table with a fixed sort order: the sorting
 * state still applies (it needs sortable columns), only the toggles are hidden.
 */
withDefaults(
  defineProps<{ headerGroups: HeaderGroup<AppFeatures, any>[]; sortable?: boolean }>(),
  { sortable: true }
)

const sortMark = (dir: false | 'asc' | 'desc') =>
  dir === 'asc' ? ' ▲' : dir === 'desc' ? ' ▼' : ''
</script>

<template>
  <thead>
    <tr v-for="hg in headerGroups" :key="hg.id">
      <th
        v-for="header in hg.headers"
        :key="header.id"
        :class="header.column.columnDef.meta?.headerClass"
      >
        <button
          v-if="sortable && header.column.getCanSort()"
          type="button"
          class="cursor-pointer"
          @click="header.column.getToggleSortingHandler()?.($event)"
        >
          <FlexRender :header="header" />{{ sortMark(header.column.getIsSorted()) }}
        </button>
        <FlexRender v-else :header="header" />
      </th>
    </tr>
  </thead>
</template>
