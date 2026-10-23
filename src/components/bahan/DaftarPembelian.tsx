import { m } from '#/paraglide/messages'
import type { PembelianBahanRow } from '#/types/pembelian-bahan'

import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/components/ui/table-controls'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
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

// Label sumber belanja: supplier terdaftar atau pasar (online/offline).
function labelSumber(p: PembelianBahanRow): string {
  if (p.supplierNama) return p.supplierNama
  if (p.sumberBelanja === 'PASAR_ONLINE') return m.bahan_pasar_online()
  if (p.sumberBelanja === 'PASAR_OFFLINE') return m.bahan_pasar_offline()
  return m.bahan_tanpa_supplier()
}

export default function DaftarPembelian({
  daftar,
}: {
  daftar: PembelianBahanRow[]
}) {
  const kontrol = useKontrolTabel(
    daftar,
    (p) =>
      `${p.bahanNama} ${labelSumber(p)} ${p.tempatBelanja ?? ''} ${p.catatan ?? ''}`,
    {
      tanggal: (p) => p.tanggal,
      bahan: (p) => p.bahanNama,
      sumber: (p) => labelSumber(p),
      jumlah: (p) => p.jumlah,
      harga: (p) => p.hargaSatuan,
      total: (p) => p.totalHarga,
    },
  )
  if (daftar.length === 0) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{m.bahan_daftar_pembelian()}</CardTitle>
      </CardHeader>
      <CardContent>
        <PencarianTabel
          value={kontrol.cari}
          onChange={kontrol.setCari}
          className="mb-3"
        />
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <HeaderUrutTabel
                  kunci="tanggal"
                  aktif={kontrol.kunciUrut === 'tanggal'}
                  arah={kontrol.arahUrut}
                  onUrut={kontrol.toggleUrut}
                >
                  {m.bahan_tanggal()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="bahan"
                  aktif={kontrol.kunciUrut === 'bahan'}
                  arah={kontrol.arahUrut}
                  onUrut={kontrol.toggleUrut}
                >
                  {m.bahan_nama()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="sumber"
                  aktif={kontrol.kunciUrut === 'sumber'}
                  arah={kontrol.arahUrut}
                  onUrut={kontrol.toggleUrut}
                >
                  {m.bahan_sumber_belanja()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="jumlah"
                  aktif={kontrol.kunciUrut === 'jumlah'}
                  arah={kontrol.arahUrut}
                  onUrut={kontrol.toggleUrut}
                  className="text-right"
                >
                  {m.bahan_jumlah_beli()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="harga"
                  aktif={kontrol.kunciUrut === 'harga'}
                  arah={kontrol.arahUrut}
                  onUrut={kontrol.toggleUrut}
                  className="text-right"
                >
                  {m.bahan_harga_beli()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="total"
                  aktif={kontrol.kunciUrut === 'total'}
                  arah={kontrol.arahUrut}
                  onUrut={kontrol.toggleUrut}
                  className="text-right"
                >
                  {m.bahan_total_harga_beli()}
                </HeaderUrutTabel>
                <TableHead>{m.bahan_catatan_pembelian()}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kontrol.baris.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.tanggal.slice(0, 10)}</TableCell>
                  <TableCell>{p.bahanNama}</TableCell>
                  <TableCell>
                    {labelSumber(p)}
                    {p.tempatBelanja && (
                      <p className="text-xs text-neutral-500">
                        {p.tempatBelanja}
                      </p>
                    )}
                    {p.belumDibayar > 0 && (
                      <p className="text-xs text-destructive">
                        {m.supplier_sisa()}: Rp{rupiah(p.belumDibayar)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{p.jumlah}</TableCell>
                  <TableCell className="text-right">
                    Rp{rupiah(p.hargaSatuan)}
                  </TableCell>
                  <TableCell className="text-right">
                    Rp{rupiah(p.totalHarga)}
                  </TableCell>
                  <TableCell>{p.catatan ?? '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <PaginasiTabel
          halamanAktif={kontrol.halamanAktif}
          jumlahHalaman={kontrol.jumlahHalaman}
          jumlahBaris={kontrol.jumlahBaris}
          ukuranHalaman={kontrol.ukuranHalaman}
          onHalaman={kontrol.setHalaman}
          onUkuranHalaman={kontrol.setUkuranHalaman}
        />
      </CardContent>
    </Card>
  )
}
