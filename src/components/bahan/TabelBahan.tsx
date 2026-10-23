import { m } from '#/paraglide/messages'
import type { BahanRow } from '#/types/bahan'

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
  const kontrol = useKontrolTabel(
    baris,
    (b) => `${b.nama} ${b.satuan} ${b.jenis ?? ''}`,
    {
      nama: (b) => b.nama,
      satuan: (b) => b.satuan,
      stok: (b) => b.stok,
      minimum: (b) => b.stokMinimum,
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
              {m.bahan_nama()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="satuan"
              aktif={kontrol.kunciUrut === 'satuan'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
            >
              {m.bahan_satuan()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="stok"
              aktif={kontrol.kunciUrut === 'stok'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
              className="text-right"
            >
              {m.bahan_stok()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="minimum"
              aktif={kontrol.kunciUrut === 'minimum'}
              arah={kontrol.arahUrut}
              onUrut={kontrol.toggleUrut}
              className="text-right"
            >
              {m.bahan_minimum()}
            </HeaderUrutTabel>
            <TableHead>{m.bahan_aksi()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kontrol.baris.map((b) => (
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
      {kontrol.jumlahBaris === 0 && (
        <>
          <p className="py-4 text-sm text-neutral-500">{m.bahan_kosong()}</p>
          <p className="py-1 text-sm text-neutral-400">
            {m.bahan_kosong_hint()}
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
