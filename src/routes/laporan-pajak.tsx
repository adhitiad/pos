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
import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/components/ui/table-controls'

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
  const kontrolJenis = useKontrolTabel(laporan.totalPerJenis, (j) => j.jenis, {
    jenis: (j) => j.jenis,
    transaksi: (j) => j.jumlahTransaksi,
    subtotal: (j) => j.subtotal,
    pajak: (j) => j.pajak,
    total: (j) => j.total,
  })
  const kontrolRiwayat = useKontrolTabel(laporan.riwayat, (r) => r.periode, {
    periode: (r) => r.periode,
    total: (r) => r.jenis.reduce((total, jenis) => total + jenis.pajak, 0),
  })

  const qs = new URLSearchParams({
    dari: laporan.dari,
    sampai: laporan.sampai,
    grup: laporan.grup,
  })
  const unduh = (format: string) =>
    `/api/v1/laporan-pajak?${qs.toString()}&format=${format}`

  const kosong = kontrolJenis.jumlahBaris === 0

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
        <PencarianTabel
          value={kontrolJenis.cari}
          onChange={kontrolJenis.setCari}
          className="my-3"
        />
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <HeaderUrutTabel
                  kunci="jenis"
                  aktif={kontrolJenis.kunciUrut === 'jenis'}
                  arah={kontrolJenis.arahUrut}
                  onUrut={kontrolJenis.toggleUrut}
                >
                  {m.laporan_pajak_jenis()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="transaksi"
                  aktif={kontrolJenis.kunciUrut === 'transaksi'}
                  arah={kontrolJenis.arahUrut}
                  onUrut={kontrolJenis.toggleUrut}
                  className="text-right"
                >
                  {m.laporan_pajak_transaksi()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="subtotal"
                  aktif={kontrolJenis.kunciUrut === 'subtotal'}
                  arah={kontrolJenis.arahUrut}
                  onUrut={kontrolJenis.toggleUrut}
                  className="text-right"
                >
                  {m.laporan_pajak_subtotal()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="pajak"
                  aktif={kontrolJenis.kunciUrut === 'pajak'}
                  arah={kontrolJenis.arahUrut}
                  onUrut={kontrolJenis.toggleUrut}
                  className="text-right"
                >
                  {m.laporan_pajak_pajak()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="total"
                  aktif={kontrolJenis.kunciUrut === 'total'}
                  arah={kontrolJenis.arahUrut}
                  onUrut={kontrolJenis.toggleUrut}
                  className="text-right"
                >
                  {m.laporan_pajak_total()}
                </HeaderUrutTabel>
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
                kontrolJenis.baris.map((j) => (
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
        <PaginasiTabel
          halamanAktif={kontrolJenis.halamanAktif}
          jumlahHalaman={kontrolJenis.jumlahHalaman}
          jumlahBaris={kontrolJenis.jumlahBaris}
          ukuranHalaman={kontrolJenis.ukuranHalaman}
          onHalaman={kontrolJenis.setHalaman}
          onUkuranHalaman={kontrolJenis.setUkuranHalaman}
        />
      </div>

      <div className="mt-6">
        <h2 className="text-lg font-semibold">{m.laporan_pajak_riwayat()}</h2>
        <PencarianTabel
          value={kontrolRiwayat.cari}
          onChange={kontrolRiwayat.setCari}
          className="my-3"
        />
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <HeaderUrutTabel
                  kunci="periode"
                  aktif={kontrolRiwayat.kunciUrut === 'periode'}
                  arah={kontrolRiwayat.arahUrut}
                  onUrut={kontrolRiwayat.toggleUrut}
                >
                  {m.laporan_pajak_periode()}
                </HeaderUrutTabel>
                {laporan.riwayat.length > 0 &&
                  laporan.riwayat[0].jenis.map((_, i) => (
                    <TableHead key={i} className="text-right">
                      {`${laporan.riwayat[0].jenis[i].jenis} — ${m.laporan_pajak_pajak()}`}
                    </TableHead>
                  ))}
                <HeaderUrutTabel
                  kunci="total"
                  aktif={kontrolRiwayat.kunciUrut === 'total'}
                  arah={kontrolRiwayat.arahUrut}
                  onUrut={kontrolRiwayat.toggleUrut}
                  className="text-right"
                >
                  {m.laporan_pajak_total()}
                </HeaderUrutTabel>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kontrolRiwayat.baris.map((r) => (
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
        <PaginasiTabel
          halamanAktif={kontrolRiwayat.halamanAktif}
          jumlahHalaman={kontrolRiwayat.jumlahHalaman}
          jumlahBaris={kontrolRiwayat.jumlahBaris}
          ukuranHalaman={kontrolRiwayat.ukuranHalaman}
          onHalaman={kontrolRiwayat.setHalaman}
          onUkuranHalaman={kontrolRiwayat.setUkuranHalaman}
        />
      </div>
    </DashboardLayout>
  )
}
