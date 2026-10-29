import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { laporanBelanjaFn } from '#/server/laporanBelanjaFn'
import { supplierOpsiFn } from '#/server/supplierFn'
import { LaporanBelanjaSearchSchema } from '#/validations/laporan-belanja'
import type { SumberBelanja } from '#/validations/pembelian-bahan'

import DashboardLayout from '#/components/DashboardLayout'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
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
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/hooks/table-controls'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const isoHari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const defaultSampai = () => isoHari(new Date())
const defaultDari = () => {
  const d = new Date()
  return isoHari(new Date(d.getFullYear(), d.getMonth(), 1))
}

const SEMUA_SUPPLIER = 'semua'
const SEMUA_SUMBER = 'semua'

export const Route = createFileRoute('/laporan-belanja')({
  validateSearch: (search) => LaporanBelanjaSearchSchema.parse(search),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [laporan, supplier] = await Promise.all([
      laporanBelanjaFn({
        data: {
          dari: deps.dari ?? defaultDari(),
          sampai: deps.sampai ?? defaultSampai(),
          supplierId: deps.supplierId,
          sumberBelanja: deps.sumberBelanja,
        },
      }),
      supplierOpsiFn(),
    ])
    return { laporan, supplier }
  },
  component: LaporanBelanja,
})

function LaporanBelanja() {
  const { laporan, supplier } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/laporan-belanja' })

  const [dari, setDari] = useState(search.dari ?? defaultDari())
  const [sampai, setSampai] = useState(search.sampai ?? defaultSampai())
  const [supplierId, setSupplierId] = useState(
    search.supplierId ?? SEMUA_SUPPLIER,
  )
  const [sumberBelanja, setSumberBelanja] = useState<
    SumberBelanja | typeof SEMUA_SUMBER
  >(search.sumberBelanja ?? SEMUA_SUMBER)
  const kontrolSumber = useKontrolTabel(laporan.perSumber, (s) => s.nama, {
    nama: (s) => s.nama,
    jumlah: (s) => s.jumlah,
    total: (s) => s.total,
    hutang: (s) => s.hutang,
  })
  const kontrolDetail = useKontrolTabel(
    laporan.detail,
    (d) =>
      `${d.tanggal} ${d.supplierNama ?? ''} ${d.tempatBelanja ?? ''} ${d.bahanNama}`,
    {
      tanggal: (d) => d.tanggal,
      sumber: (d) => d.supplierNama ?? d.sumberBelanja,
      bahan: (d) => d.bahanNama,
      jumlah: (d) => d.jumlah,
      harga: (d) => d.hargaSatuan,
      total: (d) => d.totalHarga,
    },
  )

  const qs = new URLSearchParams({
    dari: laporan.dari,
    sampai: laporan.sampai,
  })
  if (search.supplierId) qs.set('supplierId', search.supplierId)
  if (search.sumberBelanja) qs.set('sumberBelanja', search.sumberBelanja)
  const unduh = (format: string) =>
    `/api/v1/laporan-belanja?${qs.toString()}&format=${format}`

  return (
    <DashboardLayout peran="OWNER" judul={m.laporan_belanja_title()}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void navigate({
            search: {
              dari,
              sampai,
              supplierId:
                supplierId === SEMUA_SUPPLIER ? undefined : supplierId,
              sumberBelanja:
                sumberBelanja === SEMUA_SUMBER ? undefined : sumberBelanja,
            },
          })
        }}
      >
        <div className="space-y-1">
          <Label>{m.laporan_belanja_dari()}</Label>
          <Input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.laporan_belanja_sampai()}</Label>
          <Input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.laporan_belanja_supplier()}</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA_SUPPLIER}>
                {m.laporan_belanja_semua_supplier()}
              </SelectItem>
              {supplier.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{m.laporan_belanja_sumber()}</Label>
          <Select
            value={sumberBelanja}
            onValueChange={(v) => {
              setSumberBelanja(v as SumberBelanja | typeof SEMUA_SUMBER)
            }}
          >
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA_SUMBER}>
                {m.laporan_belanja_semua_sumber()}
              </SelectItem>
              <SelectItem value="SUPPLIER">
                {m.laporan_belanja_supplier()}
              </SelectItem>
              <SelectItem value="PASAR_ONLINE">
                {m.bahan_pasar_online()}
              </SelectItem>
              <SelectItem value="PASAR_OFFLINE">
                {m.bahan_pasar_offline()}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">{m.laporan_belanja_tampilkan()}</Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={unduh('csv')}>{m.laporan_belanja_unduh_csv()}</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={unduh('xlsx')}>{m.laporan_belanja_unduh_xlsx()}</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={unduh('pdf')}>{m.laporan_belanja_unduh_pdf()}</a>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {m.laporan_belanja_total()}
            </p>
            <p className="mt-1 text-lg font-semibold">
              Rp{rupiah(laporan.totalBelanja)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {m.laporan_belanja_jumlah_pembelian()}
            </p>
            <p className="mt-1 text-lg font-semibold">
              {laporan.jumlahPembelian}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              {m.laporan_belanja_sisa_hutang()}
            </p>
            <p className="mt-1 text-lg font-semibold">
              Rp{rupiah(laporan.totalHutang)}
            </p>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">
          {m.laporan_belanja_per_sumber()}
        </h2>
        <PencarianTabel
          value={kontrolSumber.cari}
          onChange={kontrolSumber.setCari}
        />
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <HeaderUrutTabel
                  kunci="nama"
                  aktif={kontrolSumber.kunciUrut === 'nama'}
                  arah={kontrolSumber.arahUrut}
                  onUrut={kontrolSumber.toggleUrut}
                >
                  {m.laporan_belanja_sumber()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="jumlah"
                  aktif={kontrolSumber.kunciUrut === 'jumlah'}
                  arah={kontrolSumber.arahUrut}
                  onUrut={kontrolSumber.toggleUrut}
                  className="text-right"
                >
                  {m.laporan_belanja_jumlah_pembelian()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="total"
                  aktif={kontrolSumber.kunciUrut === 'total'}
                  arah={kontrolSumber.arahUrut}
                  onUrut={kontrolSumber.toggleUrut}
                  className="text-right"
                >
                  {m.laporan_belanja_total()}
                </HeaderUrutTabel>
                <HeaderUrutTabel
                  kunci="hutang"
                  aktif={kontrolSumber.kunciUrut === 'hutang'}
                  arah={kontrolSumber.arahUrut}
                  onUrut={kontrolSumber.toggleUrut}
                  className="text-right"
                >
                  {m.laporan_belanja_sisa_hutang()}
                </HeaderUrutTabel>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kontrolSumber.jumlahBaris === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-4 text-center text-neutral-500"
                  >
                    {m.laporan_belanja_kosong()}
                  </TableCell>
                </TableRow>
              ) : (
                kontrolSumber.baris.map((s) => (
                  <TableRow key={s.supplierId ?? `pasar:${s.sumberBelanja}`}>
                    <TableCell>{s.nama}</TableCell>
                    <TableCell className="text-right">{s.jumlah}</TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(s.total)}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(s.hutang)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <PaginasiTabel
          halamanAktif={kontrolSumber.halamanAktif}
          jumlahHalaman={kontrolSumber.jumlahHalaman}
          jumlahBaris={kontrolSumber.jumlahBaris}
          ukuranHalaman={kontrolSumber.ukuranHalaman}
          onHalaman={kontrolSumber.setHalaman}
          onUkuranHalaman={kontrolSumber.setUkuranHalaman}
        />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">{m.laporan_belanja_detail()}</h2>
        <PencarianTabel
          value={kontrolDetail.cari}
          onChange={kontrolDetail.setCari}
        />
        <div className="-mx-2 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {[
                  ['tanggal', m.laporan_belanja_tanggal()],
                  ['sumber', m.laporan_belanja_sumber()],
                  ['bahan', m.laporan_belanja_bahan()],
                  ['jumlah', m.laporan_belanja_jumlah()],
                  ['harga', m.laporan_belanja_harga_satuan()],
                  ['total', m.laporan_belanja_total()],
                ].map(([key, label]) => (
                  <HeaderUrutTabel
                    key={key}
                    kunci={key}
                    aktif={kontrolDetail.kunciUrut === key}
                    arah={kontrolDetail.arahUrut}
                    onUrut={kontrolDetail.toggleUrut}
                    className={
                      key === 'jumlah' || key === 'harga' || key === 'total'
                        ? 'text-right'
                        : undefined
                    }
                  >
                    {label}
                  </HeaderUrutTabel>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {kontrolDetail.jumlahBaris === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-4 text-center text-neutral-500"
                  >
                    {m.laporan_belanja_kosong()}
                  </TableCell>
                </TableRow>
              ) : (
                kontrolDetail.baris.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.tanggal.slice(0, 10)}</TableCell>
                    <TableCell>
                      {d.supplierNama ??
                        (d.sumberBelanja === 'PASAR_ONLINE'
                          ? m.bahan_pasar_online()
                          : m.bahan_pasar_offline())}
                      {d.tempatBelanja && (
                        <p className="text-xs text-neutral-500">
                          {d.tempatBelanja}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{d.bahanNama}</TableCell>
                    <TableCell className="text-right">{d.jumlah}</TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(d.hargaSatuan)}
                    </TableCell>
                    <TableCell className="text-right">
                      Rp{rupiah(d.totalHarga)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <PaginasiTabel
          halamanAktif={kontrolDetail.halamanAktif}
          jumlahHalaman={kontrolDetail.jumlahHalaman}
          jumlahBaris={kontrolDetail.jumlahBaris}
          ukuranHalaman={kontrolDetail.ukuranHalaman}
          onHalaman={kontrolDetail.setHalaman}
          onUkuranHalaman={kontrolDetail.setUkuranHalaman}
        />
      </section>
    </DashboardLayout>
  )
}
