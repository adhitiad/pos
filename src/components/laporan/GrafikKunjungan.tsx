import { m } from '#/paraglide/messages'
import type { BarisKunjungan, RingkasanKunjungan } from '#/types/kunjungan'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

function BarChart({
  data,
  label,
}: {
  data: { label: string; value: number }[]
  label: string
}) {
  const max = Math.max(0, ...data.map((d) => d.value))
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {data.map((d) => {
            const pct = max > 0 ? Math.round((d.value / max) * 100) : 0
            return (
              <div key={d.label} className="flex items-center gap-3">
                <span className="w-16 text-sm text-neutral-600">{d.label}</span>
                <div className="flex-1 bg-neutral-200 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  ></div>
                </div>
                <span className="w-8 text-sm text-neutral-600 text-right">
                  {d.value}
                </span>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function TabelRingkas({
  judul,
  kolom,
  baris,
}: {
  judul: string
  kolom: string
  baris: { key: string; label: string; jumlah: number }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{judul}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{kolom}</TableHead>
                <TableHead className="text-right">
                  {m.kunjungan_jumlah()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baris.map((k) => (
                <TableRow key={k.key}>
                  <TableCell>{k.label}</TableCell>
                  <TableCell className="text-right">{k.jumlah}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GrafikKunjungan({
  deret,
  ringkasan,
}: {
  deret: BarisKunjungan[]
  ringkasan: RingkasanKunjungan
}) {
  const barData = deret.map((r) => ({
    label: r.tanggal,
    value: r.jumlahKunjungan,
  }))

  return (
    <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <BarChart data={barData} label={m.kunjungan_trend_title()} />
      <TabelRingkas
        judul={m.kunjungan_klasifikasi_title()}
        kolom={m.kunjungan_klasifikasi_title()}
        baris={ringkasan.perKlasifikasi.map((k) => ({
          key: k.klasifikasi,
          label: k.klasifikasi,
          jumlah: k.jumlah,
        }))}
      />
      <TabelRingkas
        judul={m.kunjungan_os_title()}
        kolom={m.kunjungan_os()}
        baris={ringkasan.perOS.map((o) => ({
          key: o.os,
          label: o.os,
          jumlah: o.jumlah,
        }))}
      />
      <TabelRingkas
        judul={m.kunjungan_user_type_title()}
        kolom={m.kunjungan_user_type()}
        baris={ringkasan.perUserType.map((u) => ({
          key: u.userType,
          label: u.userType,
          jumlah: u.jumlah,
        }))}
      />
    </div>
  )
}
