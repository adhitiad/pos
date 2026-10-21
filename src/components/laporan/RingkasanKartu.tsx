import { m } from '#/paraglide/messages'
import type { Ringkasan } from '#/types/laporan-penjualan'
import type { RingkasanKunjungan } from '#/types/kunjungan'

import { Card, CardContent } from '#/components/ui/card'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

function Kartu({ judul, nilai }: { judul: string; nilai: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{judul}</p>
        <p className="mt-1 text-lg font-semibold">{nilai}</p>
      </CardContent>
    </Card>
  )
}

export default function RingkasanKartu({
  laporan,
  kunjungan,
}: {
  laporan: Ringkasan
  kunjungan: RingkasanKunjungan
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Kartu judul={m.laporan_omzet()} nilai={`Rp${rupiah(laporan.omzet)}`} />
      <Kartu
        judul={m.laporan_laba_kotor()}
        nilai={`Rp${rupiah(laporan.labaKotor)}`}
      />
      <Kartu judul={m.laporan_hpp()} nilai={`Rp${rupiah(laporan.hpp)}`} />
      <Kartu
        judul={m.laporan_jumlah_trx()}
        nilai={String(laporan.jumlahTransaksi)}
      />
      <Kartu
        judul={m.kunjungan_total_kunjungan()}
        nilai={String(kunjungan.totalKunjungan)}
      />
      <Kartu
        judul={m.kunjungan_total_pengguna()}
        nilai={String(kunjungan.totalPenggunaUnik)}
      />
      <Kartu
        judul={m.kunjungan_rata_rata()}
        nilai={String(kunjungan.rataRataPerHari)}
      />
    </div>
  )
}
