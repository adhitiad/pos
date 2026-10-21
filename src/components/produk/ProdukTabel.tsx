import {
  useTable,
  createColumnHelper,
  tableFeatures,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { m } from '#/paraglide/messages'
import type { ProdukRow, ProdukTabelProps } from '#/types/produk'

export const features = tableFeatures({})
export const helper = createColumnHelper<typeof features, ProdukRow>()

export function ProdukTabel({ baris, columns }: ProdukTabelProps) {
  const table = useTable({ features, columns, data: baris })

  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder ? null : (
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
      {baris.length === 0 && (
        <>
          <p className="py-4 text-sm text-neutral-500">{m.produk_kosong()}</p>
          <p className="py-1 text-sm text-neutral-400">
            {m.produk_kosong_hint()}
          </p>
        </>
      )}
    </div>
  )
}
