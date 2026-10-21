import { m } from '#/paraglide/messages'
import type { SupplierRow } from '#/types/supplier'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function TabelSupplier({
  baris,
  onEdit,
  onHapus,
  onBayar,
}: {
  baris: SupplierRow[]
  onEdit: (row: SupplierRow) => void
  onHapus: (id: string) => void
  onBayar: (row: SupplierRow) => void
}) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.supplier_nama()}</TableHead>
            <TableHead>{m.supplier_kontak()}</TableHead>
            <TableHead className="text-right">
              {m.supplier_jumlah_pembelian()}
            </TableHead>
            <TableHead className="text-right">
              {m.supplier_total_belanja()}
            </TableHead>
            <TableHead className="text-right">{m.supplier_hutang()}</TableHead>
            <TableHead>{m.supplier_aksi()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {baris.map((s) => (
            <TableRow key={s.id}>
              <TableCell>
                <p className="font-medium">{s.nama}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {!s.aktif && (
                    <Badge variant="secondary">{m.supplier_nonaktif()}</Badge>
                  )}
                  {s.alamat && (
                    <p className="text-xs text-neutral-500">{s.alamat}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>{s.kontak ?? '—'}</TableCell>
              <TableCell className="text-right">{s.jumlahPembelian}</TableCell>
              <TableCell className="text-right">
                Rp{rupiah(s.totalBelanja)}
              </TableCell>
              <TableCell className="text-right">
                {s.hutang > 0 ? (
                  <span className="font-medium text-destructive">
                    Rp{rupiah(s.hutang)}
                  </span>
                ) : (
                  '—'
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onEdit(s)
                    }}
                  >
                    {m.supplier_edit()}
                  </Button>
                  {s.hutang > 0 && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        onBayar(s)
                      }}
                    >
                      {m.supplier_bayar_hutang()}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => {
                      onHapus(s.id)
                    }}
                  >
                    {m.supplier_hapus()}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {baris.length === 0 && (
        <>
          <p className="py-4 text-sm text-neutral-500">{m.supplier_kosong()}</p>
          <p className="py-1 text-sm text-neutral-400">
            {m.supplier_kosong_hint()}
          </p>
        </>
      )}
    </div>
  )
}
