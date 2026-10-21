import { m } from '#/paraglide/messages'
import type { BahanRow } from '#/types/bahan'

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

export default function TabelBahan({
  baris,
  onTambahStok,
  onEdit,
  onHapus,
}: {
  baris: BahanRow[]
  onTambahStok: (id: string) => void
  onEdit: (row: BahanRow) => void
  onHapus: (id: string) => void
}) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.bahan_nama()}</TableHead>
            <TableHead>{m.bahan_satuan()}</TableHead>
            <TableHead className="text-right">{m.bahan_stok()}</TableHead>
            <TableHead className="text-right">{m.bahan_minimum()}</TableHead>
            <TableHead>{m.bahan_aksi()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {baris.map((b) => (
            <TableRow
              key={b.id}
              className={b.menipis ? 'bg-destructive/10' : ''}
            >
              <TableCell>
                <span className="font-medium">{b.nama}</span>{' '}
                {b.menipis && (
                  <Badge variant="destructive">{m.bahan_menipis()}</Badge>
                )}
                {b.contohProduk.length > 0 && (
                  <p className="text-xs text-neutral-500">
                    {m.bahan_dipakai()}: {b.contohProduk.join(', ')}
                    {b.dipakaiProduk > b.contohProduk.length && '…'}
                  </p>
                )}
              </TableCell>
              <TableCell>{b.satuan}</TableCell>
              <TableCell className="text-right">{b.stok}</TableCell>
              <TableCell className="text-right">{b.stokMinimum}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onTambahStok(b.id)
                    }}
                  >
                    {m.bahan_tambah_stok()}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onEdit(b)
                    }}
                  >
                    {m.bahan_edit()}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onHapus(b.id)
                    }}
                  >
                    {m.bahan_hapus()}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {baris.length === 0 && (
        <>
          <p className="py-4 text-sm text-neutral-500">{m.bahan_kosong()}</p>
          <p className="py-1 text-sm text-neutral-400">
            {m.bahan_kosong_hint()}
          </p>
        </>
      )}
    </div>
  )
}
