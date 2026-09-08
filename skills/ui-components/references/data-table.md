# Advanced TanStack Data Table Reference

A high-performance, accessible, and fully featured data table built with `@tanstack/react-table`, Tailwind CSS, and shadcn/ui.

---

## 1. Features & Capabilities

- **Generic Typing (`TData`)**: Completely reusable across any entity (invoices, users, logs, transactions).
- **Search & Debounced Filtering**: Column-level or global search filtering across text properties.
- **Faceted Multi-Select Filters**: Popover multi-checkbox filtering with real-time facet item counts.
- **Column Visibility Toggles**: Toggle individual columns on/off with dropdown checkboxes.
- **Multi-Sortable Headers**: Tri-state column sorting (`asc`, `desc`, none) with directional icons.
- **Row Selection & Batch Action Bar**: Select individual rows or all rows; displays a floating batch action toolbar (bulk delete, CSV export).
- **Pagination & Page Size**: Dynamic page size selector (`10`, `20`, `50`, `100`), first/previous/next/last navigation.
- **5 Mandatory States**: Integrated animated loading skeletons, empty state illustration, interactive hover highlights.

---

## 2. Complete Production Implementation

Save the following component as `@/components/ui/data-table/data-table.tsx`:

```tsx
'use client'

import * as React from 'react'
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Search,
  Trash2,
  Download,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Check,
  X,
} from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

// ==========================================
// Generic Table Props
// ==========================================

export interface FacetedFilterOption {
  label: string
  value: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface FacetedFilterConfig {
  columnId: string
  title: string
  options: FacetedFilterOption[]
}

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  facetedFilters?: FacetedFilterConfig[]
  isLoading?: boolean
  onBulkDelete?: (selectedRows: TData[]) => Promise<void> | void
  onBulkExport?: (selectedRows: TData[]) => void
  onAddNew?: () => void
  addNewLabel?: string
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Filter records...',
  facetedFilters = [],
  isLoading = false,
  onBulkDelete,
  onBulkExport,
  onAddNew,
  addNewLabel = 'Add New',
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  const selectedRows = table.getFilteredSelectedRowModel().rows.map((r) => r.original)
  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="w-full space-y-4">
      {/* 1. Toolbar: Search, Faceted Filters, View Options, Add Action */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {searchKey && (
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
              <Input
                placeholder={searchPlaceholder}
                value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
                onChange={(event) =>
                  table.getColumn(searchKey)?.setFilterValue(event.target.value)
                }
                className="h-9 pl-9 border-zinc-800 bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-indigo-500/30"
              />
            </div>
          )}

          {/* Faceted Filters */}
          {facetedFilters.map((filter) => {
            const column = table.getColumn(filter.columnId)
            if (!column) return null
            return (
              <DataTableFacetedFilter
                key={filter.columnId}
                column={column}
                title={filter.title}
                options={filter.options}
              />
            )
          })}

          {/* Reset Filters Button */}
          {isFiltered && (
            <Button
              variant="ghost"
              onClick={() => table.resetColumnFilters()}
              className="h-9 px-2.5 text-xs text-zinc-400 hover:text-zinc-100"
            >
              Reset
              <X className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Column Visibility Toggle */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
              >
                <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
                View
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 border-zinc-800 bg-zinc-900 text-zinc-100"
            >
              <DropdownMenuLabel className="text-xs text-zinc-400">
                Toggle Columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-zinc-800" />
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== 'undefined' && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize text-xs hover:bg-zinc-800 cursor-pointer"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id.replace(/_/g, ' ')}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Optional Add New Action */}
          {onAddNew && (
            <Button
              onClick={onAddNew}
              size="sm"
              className="h-9 bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              {addNewLabel}
            </Button>
          )}
        </div>
      </div>

      {/* 2. Floating Batch Action Bar (Triggered on Row Selection) */}
      {selectedRows.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 font-medium">
            <Badge variant="secondary" className="bg-indigo-600 text-white font-bold">
              {selectedRows.length}
            </Badge>
            <span>rows selected across pages</span>
          </div>
          <div className="flex items-center gap-2">
            {onBulkExport && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkExport(selectedRows)}
                className="h-8 border-indigo-500/30 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Export CSV
              </Button>
            )}
            {onBulkDelete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onBulkDelete(selectedRows)}
                className="h-8 bg-rose-600 hover:bg-rose-500 text-xs text-white"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                Delete Selected
              </Button>
            )}
          </div>
        </div>
      )}

      {/* 3. Table Container */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-zinc-900/60 border-b border-zinc-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-zinc-800 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs font-semibold uppercase tracking-wider text-zinc-400 py-3.5"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton State
              Array.from({ length: 5 }).map((_, index) => (
                <TableRow key={index} className="border-zinc-800/60">
                  {columns.map((_, colIndex) => (
                    <TableCell key={colIndex} className="py-4">
                      <Skeleton className="h-5 w-full bg-zinc-800/80 rounded" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              // Rendered Data Rows
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="border-zinc-800/60 hover:bg-zinc-900/50 data-[state=selected]:bg-indigo-950/20 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 text-sm text-zinc-300">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // Empty State
              <TableRow>
                <TableCell colSpan={columns.length} className="h-64 text-center">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-zinc-500">
                      <FileSpreadsheet className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-zinc-200">No records found</p>
                      <p className="text-xs text-zinc-500 max-w-sm">
                        There are no matching items for the current filter criteria or dataset is empty.
                      </p>
                    </div>
                    {onAddNew && (
                      <Button
                        size="sm"
                        onClick={onAddNew}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Create First Record
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. Pagination Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>Rows per page</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-16 border-zinc-800 bg-zinc-900 text-xs text-zinc-200">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-200">
              {[10, 20, 30, 50, 100].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`} className="text-xs">
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-zinc-500">
            {table.getFilteredRowModel().rows.length} total entries
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400">
            Page {table.getState().pagination.pageIndex + 1} of{' '}
            {table.getPageCount() || 1}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              aria-label="First page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-zinc-800 bg-zinc-900 text-zinc-300 disabled:opacity-40"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              aria-label="Last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Subcomponent: Faceted Filter Popover
// ==========================================

interface DataTableFacetedFilterProps<TData, TValue> {
  column: ReturnType<typeof useReactTable<TData>>['getColumn'] extends (id: string) => infer R
    ? R
    : never
  title?: string
  options: FacetedFilterOption[]
}

function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: any) {
  const facets = column?.getFacetedUniqueValues()
  const selectedValues = new Set(column?.getFilterValue() as string[])

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-dashed border-zinc-800 bg-zinc-900/80 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <SlidersHorizontal className="mr-2 h-3.5 w-3.5 text-zinc-400" />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation="vertical" className="mx-2 h-4 bg-zinc-700" />
              <Badge
                variant="secondary"
                className="rounded-sm px-1 font-normal lg:hidden bg-zinc-800 text-zinc-200"
              >
                {selectedValues.size}
              </Badge>
              <div className="hidden space-x-1 lg:flex">
                {selectedValues.size > 2 ? (
                  <Badge
                    variant="secondary"
                    className="rounded-sm px-1 font-normal bg-zinc-800 text-zinc-200"
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  options
                    .filter((option) => selectedValues.has(option.value))
                    .map((option) => (
                      <Badge
                        variant="secondary"
                        key={option.value}
                        className="rounded-sm px-1 font-normal bg-zinc-800 text-zinc-200"
                      >
                        {option.label}
                      </Badge>
                    ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-2 border-zinc-800 bg-zinc-900 text-zinc-100" align="start">
        <div className="space-y-1">
          {options.map((option) => {
            const isSelected = selectedValues.has(option.value)
            const count = facets?.get(option.value) || 0
            return (
              <div
                key={option.value}
                onClick={() => {
                  if (isSelected) {
                    selectedValues.delete(option.value)
                  } else {
                    selectedValues.add(option.value)
                  }
                  const filterValues = Array.from(selectedValues)
                  column?.setFilterValue(filterValues.length ? filterValues : undefined)
                }}
                className={cn(
                  'flex items-center justify-between rounded px-2 py-1.5 text-xs cursor-pointer select-none transition-colors',
                  isSelected ? 'bg-indigo-600/20 text-indigo-300' : 'text-zinc-300 hover:bg-zinc-800'
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded border border-zinc-700',
                      isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'opacity-50'
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  {option.icon && <option.icon className="h-3.5 w-3.5 text-zinc-400" />}
                  <span>{option.label}</span>
                </div>
                {count > 0 && (
                  <span className="font-mono text-[10px] text-zinc-500">{count}</span>
                )}
              </div>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// ==========================================
// Subcomponent: Sortable Column Header Helper
// ==========================================

interface ColumnHeaderProps<TData, TValue> {
  column: any
  title: string
  className?: string
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: ColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn('text-xs font-semibold text-zinc-400', className)}>{title}</div>
  }

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className="-ml-3 h-8 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white data-[state=open]:bg-zinc-800"
      >
        <span>{title}</span>
        {column.getIsSorted() === 'desc' ? (
          <ArrowDown className="ml-2 h-3.5 w-3.5 text-indigo-400" />
        ) : column.getIsSorted() === 'asc' ? (
          <ArrowUp className="ml-2 h-3.5 w-3.5 text-indigo-400" />
        ) : (
          <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-zinc-500" />
        )}
      </Button>
    </div>
  )
}
```

---

## 3. Example Schema & Column Definition

Here is a ready-to-use invoice transaction table example with formatting helpers:

```tsx
'use client'

import { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from './data-table'
import { CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react'

export interface Transaction {
  id: string
  invoiceNumber: string
  customerName: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  createdAt: string
}

export const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount)
}

export const formatDate = (isoString: string) => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(isoString))
}

export const transactionColumns: ColumnDef<Transaction>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="border-zinc-700 data-[state=checked]:bg-indigo-600"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="border-zinc-700 data-[state=checked]:bg-indigo-600"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'invoiceNumber',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Invoice #" />,
    cell: ({ row }) => (
      <span className="font-mono text-xs font-medium text-zinc-200">
        {row.getValue('invoiceNumber')}
      </span>
    ),
  },
  {
    accessorKey: 'customerName',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Customer" />,
    cell: ({ row }) => (
      <span className="font-medium text-zinc-100">{row.getValue('customerName')}</span>
    ),
  },
  {
    accessorKey: 'amount',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Amount" />,
    cell: ({ row }) => (
      <span className="font-semibold text-zinc-200">
        {formatCurrency(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.getValue('status') as Transaction['status']
      const configs = {
        paid: {
          label: 'Paid',
          className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: CheckCircle2,
        },
        pending: {
          label: 'Pending',
          className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: Clock,
        },
        failed: {
          label: 'Failed',
          className: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          icon: AlertCircle,
        },
        refunded: {
          label: 'Refunded',
          className: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          icon: XCircle,
        },
      }
      const config = configs[status] || configs.pending
      const Icon = config.icon

      return (
        <Badge variant="outline" className={`gap-1.5 font-medium ${config.className}`}>
          <Icon className="h-3 w-3" />
          <span>{config.label}</span>
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'createdAt',
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
    cell: ({ row }) => (
      <span className="text-xs text-zinc-400">{formatDate(row.getValue('createdAt'))}</span>
    ),
  },
]
```
