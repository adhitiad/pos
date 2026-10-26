import { useState } from 'react'
import {
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  tableFeatures,
  useTable,
} from '@tanstack/react-table'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { cn } from 'cn'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Button } from '#/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '#/components/ui/pagination'
import { m } from '#/paraglide/messages'
import type { ProdukRow, ProdukTabelProps } from '#/types/produk'

export const features = tableFeatures({
  rowPaginationFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric },
})
export const helper = createColumnHelper<typeof features, ProdukRow>()

const UKURAN_HALAMAN = [10, 25, 50, 100] as const

function nomorHalaman(aktif: number, total: number): Array<number | '...'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const mulai = Math.max(2, Math.min(aktif - 1, total - 4))
  const akhir = Math.min(total - 1, Math.max(aktif + 1, 5))
  const hasil: Array<number | '...'> = [1]

  if (mulai > 2) hasil.push('...')
  for (let i = mulai; i <= akhir; i += 1) hasil.push(i)
  if (akhir < total - 1) hasil.push('...')

  hasil.push(total)
  return hasil
}

const kelasTombolHalaman = (aktif: boolean) =>
  cn(
    'h-8 min-w-8 px-2',
    aktif && 'bg-primary text-primary-foreground hover:bg-primary/90',
  )

export function ProdukTabel({
  baris,
  columns,
  total,
  pagination: paginationServer,
  onPaginationChange,
  sorting: sortingServer,
  onSortingChange,
}: ProdukTabelProps) {
  const [paginationLokal, setPaginationLokal] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const [sortingLokal, setSortingLokal] = useState<SortingState>([])
  const server = total !== undefined && paginationServer !== undefined
  const pagination = paginationServer ?? paginationLokal
  const sorting = sortingServer ?? sortingLokal
  const jumlahHalaman =
    total === undefined
      ? undefined
      : Math.max(1, Math.ceil(total / pagination.pageSize))

  const table = useTable({
    features,
    columns,
    data: baris,
    state: { pagination, sorting },
    onPaginationChange: onPaginationChange ?? setPaginationLokal,
    onSortingChange: onSortingChange ?? setSortingLokal,
    manualPagination: server,
    manualSorting: server,
    pageCount: jumlahHalaman,
    autoResetPageIndex: !server,
  })

  const totalHalaman = Math.max(1, table.getPageCount())
  const halamanAktif = Math.min(pagination.pageIndex + 1, totalHalaman)
  const daftarHalaman = nomorHalaman(halamanAktif, totalHalaman)

  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : header.column.getCanSort() ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8 px-2"
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <table.FlexRender header={header} />
                      {header.column.getIsSorted() === 'asc' ? (
                        <ArrowUpIcon aria-hidden />
                      ) : header.column.getIsSorted() === 'desc' ? (
                        <ArrowDownIcon aria-hidden />
                      ) : (
                        <ChevronsUpDownIcon aria-hidden />
                      )}
                    </Button>
                  ) : (
                    <table.FlexRender header={header} />
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {baris.length === 0 ? (
        <>
          <p className="py-4 text-sm text-neutral-500">{m.produk_kosong()}</p>
          <p className="py-1 text-sm text-neutral-400">
            {m.produk_kosong_hint()}
          </p>
        </>
      ) : (
        <div className="mt-4 flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{m.produk_baris_per_halaman()}</span>
            <Select
              value={String(pagination.pageSize)}
              onValueChange={(nilai) => {
                table.setPageSize(Number(nilai))
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-[74px]"
                aria-label={m.produk_baris_per_halaman()}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UKURAN_HALAMAN.map((ukuran) => (
                  <SelectItem key={ukuran} value={String(ukuran)}>
                    {ukuran}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <span className="text-sm text-muted-foreground">
              {m.produk_halaman_info({
                halaman: halamanAktif,
                total: totalHalaman,
              })}
            </span>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    size="sm"
                    aria-label={m.produk_sebelumnya()}
                    aria-disabled={!table.getCanPreviousPage()}
                    className={cn(
                      !table.getCanPreviousPage() &&
                        'pointer-events-none opacity-50',
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      table.previousPage()
                    }}
                  >
                    <ChevronLeftIcon aria-hidden />
                    <span className="hidden sm:block">
                      {m.produk_sebelumnya()}
                    </span>
                  </PaginationLink>
                </PaginationItem>

                {daftarHalaman.map((nomor, index) =>
                  nomor === '...' ? (
                    <PaginationItem key={`ellipsis-${index}`}>
                      <span className="flex size-8 items-center justify-center text-sm">
                        …
                      </span>
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={nomor}>
                      <PaginationLink
                        href="#"
                        size="icon-sm"
                        isActive={nomor === halamanAktif}
                        onClick={(e) => {
                          e.preventDefault()
                          table.setPageIndex(nomor - 1)
                        }}
                        className={kelasTombolHalaman(nomor === halamanAktif)}
                      >
                        {nomor}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationLink
                    href="#"
                    size="sm"
                    aria-label={m.produk_berikutnya()}
                    aria-disabled={!table.getCanNextPage()}
                    className={cn(
                      !table.getCanNextPage() &&
                        'pointer-events-none opacity-50',
                    )}
                    onClick={(e) => {
                      e.preventDefault()
                      table.nextPage()
                    }}
                  >
                    <span className="hidden sm:block">
                      {m.produk_berikutnya()}
                    </span>
                    <ChevronRightIcon aria-hidden />
                  </PaginationLink>
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      )}
    </div>
  )
}
