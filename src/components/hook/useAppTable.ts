import {
  type CellData,
  type Column,
  type TableFeatures,
  type FilterFn,
  type RowData,
  type SortFn,
  columnFilteringFeature,
  columnVisibilityFeature,
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
  // Lets a table keep a filter-only column out of the rendered table
  // (`initialState.columnVisibility`); hidden columns still filter.
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortFns: { basic: sortFn_basic, text: sortFn_text },
  filterFns: { equals: filterFn_equals, includesString: filterFn_includesString },
  // Type-only: `columnDef.meta` shape, read by common/AppTableHead.vue.
  columnMeta: {} as { headerClass?: string },
})

export type AppFeatures = typeof appFeatures

export const { useAppTable, createAppColumnHelper } = createTableHook({
  features: appFeatures,
  globalFilterFn: 'includesString',
})

type TieBreak<TData> = (row: TData) => string | number

function compareTie<TData>(
  collator: Intl.Collator,
  tieBreak: TieBreak<TData> | undefined,
  a: TData,
  b: TData
): number {
  if (!tieBreak) return 0
  const x = tieBreak(a)
  const y = tieBreak(b)
  return typeof x === 'number' && typeof y === 'number'
    ? x - y
    : collator.compare(String(x), String(y))
}

/**
 * Locale-aware text sort (Thai collation for `th`). `tieBreak` orders rows
 * whose values are equal, e.g. by name within equal dates. Note TanStack
 * reverses the whole comparison for descending sorts, tie-break included.
 */
export function localeSortFn<TData extends RowData>(
  locale: string,
  tieBreak?: TieBreak<TData>
): SortFn<AppFeatures, TData> {
  const collator = new Intl.Collator(locale)
  return (a, b, columnId) =>
    collator.compare(
      String(a.getValue(columnId) ?? ''),
      String(b.getValue(columnId) ?? '')
    ) || compareTie(collator, tieBreak, a.original, b.original)
}

/** Number sort with an optional tie-break (see `localeSortFn`). */
export function numberSortFn<TData extends RowData>(
  locale: string,
  tieBreak?: TieBreak<TData>
): SortFn<AppFeatures, TData> {
  const collator = new Intl.Collator(locale)
  return (a, b, columnId) =>
    (a.getValue<number>(columnId) ?? 0) - (b.getValue<number>(columnId) ?? 0) ||
    compareTie(collator, tieBreak, a.original, b.original)
}

/**
 * Whole-row search box. `match` gets the row and the trimmed, lowercased
 * query. Spread the result into the table options:
 *
 *   useAppTable({ ..., ...rowSearch((p, q) => p.title.toLowerCase().includes(q), 'title') })
 *
 * The global filter runs once per eligible column and ORs the results, so it
 * is limited to `anchorColumnId` to run once per row.
 */
export function rowSearch<TData extends RowData>(
  match: (row: TData, query: string) => boolean,
  anchorColumnId: string
) {
  const globalFilterFn: FilterFn<AppFeatures, TData> = (row, _columnId, query: string) =>
    match(row.original, query)
  globalFilterFn.resolveFilterValue = (v) => String(v ?? '').trim().toLowerCase()
  return {
    globalFilterFn,
    getColumnCanGlobalFilter: <TF extends TableFeatures, TD extends RowData, TV extends CellData>(
      column: Column<TF, TD, TV>
    ) => column.id === anchorColumnId,
  }
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
