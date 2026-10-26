import { m } from '#/paraglide/messages'
import type { BahanRow } from '#/types/bahan'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { HeaderUrutTabel, PaginasiTabel } from '#/hooks/table-controls'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

type KunciUrutBahan = 'nama' | 'satuan' | 'stok' | 'minimum'

export default function TabelBahan({
  baris,
  sort,
  arah,
  total,
  take,
  skip,
  onUrut,
  onHalaman,
  onUkuranHalaman,
  onTambahStok,
  onEdit,
  onHapus,
}: {
  baris: BahanRow[]
  sort: KunciUrutBahan
  arah: 'asc' | 'desc'
  total: number
  take: number
  skip: number
  onUrut: (kunci: string) => void
  onHalaman: (halaman: number) => void
  onUkuranHalaman: (ukuran: number) => void
  onTambahStok: (id: string) => void
  onEdit: (row: BahanRow) => void
  onHapus: (id: string) => void
}) {
  const halamanAktif = Math.floor(skip / take)
  const jumlahHalaman = Math.max(1, Math.ceil(total / take))

  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <HeaderUrutTabel
              kunci="nama"
              aktif={sort === 'nama'}
              arah={arah}
              onUrut={onUrut}
            >
              {m.bahan_nama()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="satuan"
              aktif={sort === 'satuan'}
              arah={arah}
              onUrut={onUrut}
            >
              {m.bahan_satuan()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="stok"
              aktif={sort === 'stok'}
              arah={arah}
              onUrut={onUrut}
              className="text-right"
            >
              {m.bahan_stok()}
            </HeaderUrutTabel>
            <HeaderUrutTabel
              kunci="minimum"
              aktif={sort === 'minimum'}
              arah={arah}
              onUrut={onUrut}
              className="text-right"
            >
              {m.bahan_minimum()}
            </HeaderUrutTabel>
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
      {total === 0 && (
        <>
          <p className="py-4 text-sm text-neutral-500">{m.bahan_kosong()}</p>
          <p className="py-1 text-sm text-neutral-400">
            {m.bahan_kosong_hint()}
          </p>
        </>
      )}
      <PaginasiTabel
        halamanAktif={halamanAktif}
        jumlahHalaman={jumlahHalaman}
        jumlahBaris={total}
        ukuranHalaman={take}
        onHalaman={onHalaman}
        onUkuranHalaman={onUkuranHalaman}
      />
    </div>
  )
}
