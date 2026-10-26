import { m } from '#/paraglide/messages'
import type { LaporanPenjualan } from '#/types/laporan-penjualan'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/hooks/table-controls'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function TabelLaporan({
  laporan,
}: {
  laporan: LaporanPenjualan
}) {
  const kontrolRekap = useKontrolTabel(laporan.rekap, (r) => r.periode, {
    periode: (r) => r.periode,
    transaksi: (r) => r.jumlahTransaksi,
    omzet: (r) => r.omzet,
    hpp: (r) => r.hpp,
    laba: (r) => r.labaKotor,
  })
  const kontrolProduk = useKontrolTabel(laporan.produkTerlaris, (p) => p.nama, {
    nama: (p) => p.nama,
    qty: (p) => p.qty,
    omzet: (p) => p.omzet,
  })
  const kontrolKasir = useKontrolTabel(
    laporan.performaKasir,
    (kasir) => kasir.nama,
    {
      nama: (kasir) => kasir.nama,
      transaksi: (kasir) => kasir.jumlahTransaksi,
      omzet: (kasir) => kasir.omzet,
    },
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{m.laporan_rekap()}</CardTitle>
        </CardHeader>
        <CardContent>
          <PencarianTabel
            value={kontrolRekap.cari}
            onChange={kontrolRekap.setCari}
            className="mb-3"
          />
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <HeaderUrutTabel
                    kunci="periode"
                    aktif={kontrolRekap.kunciUrut === 'periode'}
                    arah={kontrolRekap.arahUrut}
                    onUrut={kontrolRekap.toggleUrut}
                  >
                    {m.laporan_periode()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="transaksi"
                    aktif={kontrolRekap.kunciUrut === 'transaksi'}
                    arah={kontrolRekap.arahUrut}
                    onUrut={kontrolRekap.toggleUrut}
                    className="text-right"
                  >
                    {m.laporan_transaksi()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="omzet"
                    aktif={kontrolRekap.kunciUrut === 'omzet'}
                    arah={kontrolRekap.arahUrut}
                    onUrut={kontrolRekap.toggleUrut}
                    className="text-right"
                  >
                    {m.laporan_omzet()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="hpp"
                    aktif={kontrolRekap.kunciUrut === 'hpp'}
                    arah={kontrolRekap.arahUrut}
                    onUrut={kontrolRekap.toggleUrut}
                    className="text-right"
                  >
                    {m.laporan_hpp()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="laba"
                    aktif={kontrolRekap.kunciUrut === 'laba'}
                    arah={kontrolRekap.arahUrut}
                    onUrut={kontrolRekap.toggleUrut}
                    className="text-right"
                  >
                    {m.laporan_laba_kotor()}
                  </HeaderUrutTabel>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kontrolRekap.baris.map((r) => (
                  <TableRow key={r.periode}>
                    <TableCell>{r.periode}</TableCell>
                    <TableCell className="text-right">
                      {r.jumlahTransaksi}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(r.omzet)}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(r.hpp)}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(r.labaKotor)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginasiTabel
            halamanAktif={kontrolRekap.halamanAktif}
            jumlahHalaman={kontrolRekap.jumlahHalaman}
            jumlahBaris={kontrolRekap.jumlahBaris}
            ukuranHalaman={kontrolRekap.ukuranHalaman}
            onHalaman={kontrolRekap.setHalaman}
            onUkuranHalaman={kontrolRekap.setUkuranHalaman}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.laporan_produk_terlaris()}</CardTitle>
        </CardHeader>
        <CardContent>
          <PencarianTabel
            value={kontrolProduk.cari}
            onChange={kontrolProduk.setCari}
            className="mb-3"
          />
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <HeaderUrutTabel
                    kunci="nama"
                    aktif={kontrolProduk.kunciUrut === 'nama'}
                    arah={kontrolProduk.arahUrut}
                    onUrut={kontrolProduk.toggleUrut}
                  >
                    {m.laporan_produk()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="qty"
                    aktif={kontrolProduk.kunciUrut === 'qty'}
                    arah={kontrolProduk.arahUrut}
                    onUrut={kontrolProduk.toggleUrut}
                    className="text-right"
                  >
                    {m.laporan_qty()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="omzet"
                    aktif={kontrolProduk.kunciUrut === 'omzet'}
                    arah={kontrolProduk.arahUrut}
                    onUrut={kontrolProduk.toggleUrut}
                    className="text-right"
                  >
                    {m.laporan_omzet()}
                  </HeaderUrutTabel>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kontrolProduk.baris.map((p, i) => (
                  <TableRow key={`${p.produkId ?? p.nama}-${i}`}>
                    <TableCell>{p.nama}</TableCell>
                    <TableCell className="text-right">{p.qty}</TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(p.omzet)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginasiTabel
            halamanAktif={kontrolProduk.halamanAktif}
            jumlahHalaman={kontrolProduk.jumlahHalaman}
            jumlahBaris={kontrolProduk.jumlahBaris}
            ukuranHalaman={kontrolProduk.ukuranHalaman}
            onHalaman={kontrolProduk.setHalaman}
            onUkuranHalaman={kontrolProduk.setUkuranHalaman}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.laporan_performa_kasir()}</CardTitle>
        </CardHeader>
        <CardContent>
          <PencarianTabel
            value={kontrolKasir.cari}
            onChange={kontrolKasir.setCari}
            className="mb-3"
          />
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <HeaderUrutTabel
                    kunci="nama"
                    aktif={kontrolKasir.kunciUrut === 'nama'}
                    arah={kontrolKasir.arahUrut}
                    onUrut={kontrolKasir.toggleUrut}
                  >
                    {m.laporan_kasir()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="transaksi"
                    aktif={kontrolKasir.kunciUrut === 'transaksi'}
                    arah={kontrolKasir.arahUrut}
                    onUrut={kontrolKasir.toggleUrut}
                    className="text-right"
                  >
                    {m.laporan_transaksi()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="omzet"
                    aktif={kontrolKasir.kunciUrut === 'omzet'}
                    arah={kontrolKasir.arahUrut}
                    onUrut={kontrolKasir.toggleUrut}
                    className="text-right"
                  >
                    {m.laporan_omzet()}
                  </HeaderUrutTabel>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kontrolKasir.baris.map((k) => (
                  <TableRow key={k.kasirId ?? 'tanpa'}>
                    <TableCell>{k.nama}</TableCell>
                    <TableCell className="text-right">
                      {k.jumlahTransaksi}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(k.omzet)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginasiTabel
            halamanAktif={kontrolKasir.halamanAktif}
            jumlahHalaman={kontrolKasir.jumlahHalaman}
            jumlahBaris={kontrolKasir.jumlahBaris}
            ukuranHalaman={kontrolKasir.ukuranHalaman}
            onHalaman={kontrolKasir.setHalaman}
            onUkuranHalaman={kontrolKasir.setUkuranHalaman}
          />
        </CardContent>
      </Card>
    </>
  )
}
