import { m } from '#/paraglide/messages'
import type { PrinterRow } from '#/types/percetakan'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  useKontrolTabel,
} from '#/components/ui/table-controls'
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
  const kontrol = useKontrolTabel(
    baris,
    (p) =>
      `${p.nama} ${p.tipe} ${p.lokasi ?? ''} ${p.perangkat ?? ''} ${p.koneksi}`,
    {
      nama: (p) => p.nama,
      tipe: (p) => p.tipe,
      lokasi: (p) => p.lokasi ?? '',
      koneksi: (p) => p.koneksi,
      terakhir: (p) => p.terakhirDipakai ?? '',
      status: (p) => (p.aktif ? 1 : 0),
    },
  )

  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <HeaderUrutTabel
              kunci="nama"
              aktif={kontrol.kunciUrut === 'nama'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
            >
              {m.printer_nama()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="tipe"
              aktif={kontrol.kunciUrut === 'tipe'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
            >
              {m.printer_tipe()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="lokasi"
              aktif={kontrol.kunciUrut === 'lokasi'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
            >
              {m.printer_lokasi()}
            </HeaderUrutTabel>
            <TableHead>{m.printer_perangkat()}</TableHead>
            <HeaderUrutTabel
              kunci="koneksi"
              aktif={kontrol.kunciUrut === 'koneksi'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
            >
              {m.printer_koneksi()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="terakhir"
              aktif={kontrol.kunciUrut === 'terakhir'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
            >
              {m.printer_terakhir_dipakai()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="status"
              aktif={kontrol.kunciUrut === 'status'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
            >
              {m.printer_status()}
            </HeaderUrutTabel>
            <TableHead>{m.printer_aksi()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kontrol.baris.map((p) => (
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
      {kontrol.jumlahBaris === 0 && (
        <>
          <p className="py-4 text-sm text-neutral-500">{m.printer_kosong()}</p>
          <p className="py-1 text-sm text-neutral-400">
            {m.printer_kosong_hint()}
          </p>
        </>
      )}
      <PaginasiTabel
        halamanAktif={kontrol.halamanAktif}
        jumlahHalaman={kontrol.jumlahHalaman}
        jumlahBaris={kontrol.jumlahBaris}
        ukuranHalaman={kontrol.ukuranHalaman}
        onHalaman={kontrol.setHalaman}
        onUkuranHalaman={kontrol.setUkuranHalaman}
      />
    </div>
  )
}
