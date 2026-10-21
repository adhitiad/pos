import { m } from '#/paraglide/messages'
import type { PembelianBahanRow } from '#/types/pembelian-bahan'

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
  if (daftar.length === 0) return null

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>{m.bahan_daftar_pembelian()}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.bahan_tanggal()}</TableHead>
                <TableHead>{m.bahan_nama()}</TableHead>
                <TableHead>{m.bahan_sumber_belanja()}</TableHead>
                <TableHead className="text-right">
                  {m.bahan_jumlah_beli()}
                </TableHead>
                <TableHead className="text-right">
                  {m.bahan_harga_beli()}
                </TableHead>
                <TableHead className="text-right">
                  {m.bahan_total_harga_beli()}
                </TableHead>
                <TableHead>{m.bahan_catatan_pembelian()}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {daftar.map((p) => (
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
      </CardContent>
    </Card>
  )
}
