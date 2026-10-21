import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { laporanPajakFn } from '#/server/laporanPajakFn'
import { LaporanPajakSearchSchema } from '#/validations/laporan-pajak'

import DashboardLayout from '#/components/DashboardLayout'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
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

const isoHari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const defaultSampai = () => isoHari(new Date())
const defaultDari = () => {
  const d = new Date()
  return isoHari(new Date(d.getFullYear(), d.getMonth(), 1))
}

export const Route = createFileRoute('/laporan-pajak')({
  validateSearch: (search) => LaporanPajakSearchSchema.parse(search),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const laporan = await laporanPajakFn({
      data: {
        dari: deps.dari ?? defaultDari(),
        sampai: deps.sampai ?? defaultSampai(),
        grup: deps.grup ?? 'bulanan',
      },
    })
    return { laporan }
  },
  component: LaporanPajak,
})

function LaporanPajak() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/laporan-pajak' })

  const laporan = data.laporan

  const [dari, setDari] = useState(search.dari ?? defaultDari())
  const [sampai, setSampai] = useState(search.sampai ?? defaultSampai())
  const [grup, setGrup] = useState<'harian' | 'mingguan' | 'bulanan'>(
    search.grup ?? 'bulanan',
  )
  const handleGrupChange = (value: string) => {
    setGrup(value as 'harian' | 'mingguan' | 'bulanan')
  }

  const qs = new URLSearchParams({
    dari: laporan.dari,
    sampai: laporan.sampai,
    grup: laporan.grup,
  })
  const unduh = (format: string) =>
    `/api/v1/laporan-pajak?${qs.toString()}&format=${format}`

  const kosong = laporan.totalPerJenis.length === 0

  return (
    <DashboardLayout peran="OWNER" judul={m.laporan_pajak_title()}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void navigate({ search: { dari, sampai, grup } })
        }}
      >
        <div className="space-y-1">
          <Label>{m.laporan_pajak_dari()}</Label>
          <Input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.laporan_pajak_sampai()}</Label>
          <Input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.laporan_pajak_grup()}</Label>
          <Select value={grup} onValueChange={handleGrupChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="harian">{m.laporan_pajak_harian()}</SelectItem>
              <SelectItem value="mingguan">
                {m.laporan_pajak_mingguan()}
              </SelectItem>
              <SelectItem value="bulanan">
                {m.laporan_pajak_bulanan()}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">{m.laporan_pajak_tampilkan()}</Button>
      </form>

      <div className="flex flex-wrap gap-2 mt-2">
        <Button asChild variant="outline" size="sm">
          <a href={unduh('csv')}>{m.laporan_pajak_unduh_csv()}</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={unduh('xlsx')}>{m.laporan_pajak_unduh_xlsx()}</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={unduh('pdf')}>{m.laporan_pajak_unduh_pdf()}</a>
        </Button>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">{m.laporan_pajak_ringkasan()}</h2>
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.laporan_pajak_jenis()}</TableHead>
                <TableHead className="text-right">
                  {m.laporan_pajak_transaksi()}
                </TableHead>
                <TableHead className="text-right">
                  {m.laporan_pajak_subtotal()}
                </TableHead>
                <TableHead className="text-right">
                  {m.laporan_pajak_pajak()}
                </TableHead>
                <TableHead className="text-right">
                  {m.laporan_pajak_total()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kosong ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-4 text-center text-neutral-500"
                  >
                    {m.laporan_pajak_kosong()}
                  </TableCell>
                </TableRow>
              ) : (
                laporan.totalPerJenis.map((j) => (
                  <TableRow key={j.jenis}>
                    <TableCell>{j.jenis}</TableCell>
                    <TableCell className="text-right">
                      {j.jumlahTransaksi}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(j.subtotal)}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(j.pajak)}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(j.total)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">{m.laporan_pajak_riwayat()}</h2>
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{m.laporan_pajak_periode()}</TableHead>
                {laporan.riwayat.length > 0 &&
                  laporan.riwayat[0].jenis.map((_, i) => (
                    <TableHead key={i} className="text-right">
                      {`${laporan.riwayat[0].jenis[i].jenis} — ${m.laporan_pajak_pajak()}`}
                    </TableHead>
                  ))}
                <TableHead className="text-right">
                  {m.laporan_pajak_total()}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {laporan.riwayat.map((r) => (
                <TableRow key={r.periode}>
                  <TableCell>{r.periode}</TableCell>
                  {r.jenis.map((j) => (
                    <TableCell key={j.jenis} className="text-right">
                      Rp{rupiah(j.pajak)}
                    </TableCell>
                  ))}
                  <TableCell className="text-right">
                    Rp{rupiah(r.jenis.reduce((s, j) => s + j.pajak, 0))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  )
}
