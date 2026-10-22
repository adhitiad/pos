import { m } from '#/paraglide/messages'
import type { PrinterRow } from '#/types/percetakan'

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

function waktuTerakhir(iso: string | null): string {
  if (!iso) return '-'
  const tanggal = new Date(iso)
  if (Number.isNaN(tanggal.getTime())) return '-'
  return tanggal.toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function TabelPrinter({
  baris,
  onEdit,
  onHapus,
}: {
  baris: PrinterRow[]
  onEdit: (row: PrinterRow) => void
  onHapus: (id: string) => void
}) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.printer_nama()}</TableHead>
            <TableHead>{m.printer_tipe()}</TableHead>
            <TableHead>{m.printer_lokasi()}</TableHead>
            <TableHead>{m.printer_perangkat()}</TableHead>
            <TableHead>{m.printer_koneksi()}</TableHead>
            <TableHead>{m.printer_terakhir_dipakai()}</TableHead>
            <TableHead>{m.printer_status()}</TableHead>
            <TableHead>{m.printer_aksi()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {baris.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <p className="font-medium">{p.nama}</p>
                {p.default && (
                  <Badge variant="secondary">{m.printer_default()}</Badge>
                )}
              </TableCell>
              <TableCell>{p.tipe}</TableCell>
              <TableCell>{p.lokasi ?? '—'}</TableCell>
              <TableCell>{p.perangkat ?? '—'}</TableCell>
              <TableCell>
                <Badge variant="outline">{p.koneksi}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {waktuTerakhir(p.terakhirDipakai)}
              </TableCell>
              <TableCell>
                {p.aktif ? (
                  <Badge variant="outline">{m.printer_aktif()}</Badge>
                ) : (
                  <Badge variant="destructive">{m.printer_nonaktif()}</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="outline"
                    onClick={() => {
                      onEdit(p)
                    }}
                  >
                    {m.printer_edit()}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      onHapus(p.id)
                    }}
                  >
                    {m.printer_hapus()}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {baris.length === 0 && (
        <>
          <p className="py-4 text-sm text-neutral-500">{m.printer_kosong()}</p>
          <p className="py-1 text-sm text-neutral-400">
            {m.printer_kosong_hint()}
          </p>
        </>
      )}
    </div>
  )
}
