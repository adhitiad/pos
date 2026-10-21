import { m } from '#/paraglide/messages'
import type { LaporanPenjualan } from '#/types/laporan-penjualan'

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

export default function TabelLaporan({
  laporan,
}: {
  laporan: LaporanPenjualan
}) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{m.laporan_rekap()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.laporan_periode()}</TableHead>
                  <TableHead className="text-right">
                    {m.laporan_transaksi()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.laporan_omzet()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.laporan_hpp()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.laporan_laba_kotor()}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laporan.rekap.map((r) => (
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.laporan_produk_terlaris()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.laporan_produk()}</TableHead>
                  <TableHead className="text-right">
                    {m.laporan_qty()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.laporan_omzet()}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laporan.produkTerlaris.map((p, i) => (
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.laporan_performa_kasir()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.laporan_kasir()}</TableHead>
                  <TableHead className="text-right">
                    {m.laporan_transaksi()}
                  </TableHead>
                  <TableHead className="text-right">
                    {m.laporan_omzet()}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laporan.performaKasir.map((k) => (
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
        </CardContent>
      </Card>
    </>
  )
}
