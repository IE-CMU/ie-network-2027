import {
  type Column,
  type RowData,
  type SortFn,
  columnFilteringFeature,
  createFilteredRowModel,
  createSortedRowModel,
  createTableHook,
  filterFn_equals,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_basic,
  sortFn_text,
  tableFeatures,
} from '@tanstack/vue-table'
import { type WritableComputedRef, computed } from 'vue'

/**
 * App-wide table setup (TanStack Table v9). Every admin table shares this
 * feature set, so only these features end up in the bundle. Add a feature
 * here (e.g. `rowPaginationFeature` + `createPaginatedRowModel()`) when a
 * table needs it.
 *
 * The keys of `sortFns` / `filterFns` are the only valid string values for
 * `sortFn`, `filterFn` and `globalFilterFn`. A column can still pass a
 * function directly.
 */
export const appFeatures = tableFeatures({
  rowSortingFeature,
  columnFilteringFeature,
  globalFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
  filterFns: { equals: filterFn_equals, includesString: filterFn_includesString },
})

export type AppFeatures = typeof appFeatures

export const { useAppTable, createAppColumnHelper } = createTableHook({
  features: appFeatures,
  globalFilterFn: 'includesString',
})

/**
 * Locale-aware text sort (Thai collation for `th`). `tieBreak` is applied when
 * the column values are equal, e.g. sort by name within equal dates.
 */
export function localeSortFn<TData extends RowData>(
  locale: string,
  tieBreak?: (row: TData) => string
): SortFn<AppFeatures, TData> {
  const collator = new Intl.Collator(locale)
  return (a, b, columnId) =>
    collator.compare(
      String(a.getValue(columnId) ?? ''),
      String(b.getValue(columnId) ?? '')
    ) ||
    (tieBreak ? collator.compare(tieBreak(a.original), tieBreak(b.original)) : 0)
}

/** Number sort with an optional text tie-break. */
export function numberSortFn<TData extends RowData>(
  locale: string,
  tieBreak?: (row: TData) => string
): SortFn<AppFeatures, TData> {
  const collator = new Intl.Collator(locale)
  return (a, b, columnId) =>
    (a.getValue<number>(columnId) ?? 0) - (b.getValue<number>(columnId) ?? 0) ||
    (tieBreak ? collator.compare(tieBreak(a.original), tieBreak(b.original)) : 0)
}

/**
 * `v-model` binding for a `<select>` that drives a column filter. The
 * `allValue` option (default `'all'`) clears the filter.
 */
export function useSelectFilter<T extends string>(
  getColumn: () => Pick<Column<any, any, any>, 'getFilterValue' | 'setFilterValue'> | undefined,
  allValue = 'all' as T
): WritableComputedRef<T> {
  return computed({
    get: () => (getColumn()?.getFilterValue() as T | undefined) ?? allValue,
    set: (v) => getColumn()?.setFilterValue(v === allValue ? undefined : v),
  })
}
