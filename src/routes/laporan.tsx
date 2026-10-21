import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { laporanPenjualanFn } from '#/server/laporanPenjualanFn'
import { laporanShiftFn } from '#/server/laporanShiftFn'
import { kunjunganDataFn } from '#/server/kunjunganFn'
import { LaporanSearchSchema } from '#/validations/laporan-penjualan'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

import DashboardLayout from '#/components/DashboardLayout'
import FilterLaporan from '#/components/laporan/FilterLaporan'
import GrafikKunjungan from '#/components/laporan/GrafikKunjungan'
import KosongLaporan from '#/components/laporan/KosongLaporan'
import RingkasanKartu from '#/components/laporan/RingkasanKartu'
import TabelLaporan from '#/components/laporan/TabelLaporan'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const isoHari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const defaultSampai = () => isoHari(new Date())
const defaultDari = () => {
  const d = new Date()
  return isoHari(new Date(d.getFullYear(), d.getMonth(), 1))
}

export const Route = createFileRoute('/laporan')({
  validateSearch: (search) => LaporanSearchSchema.parse(search),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [laporan, kunjungan, shiftLaporan] = await Promise.all([
      laporanPenjualanFn({
        data: {
          dari: deps.dari ?? defaultDari(),
          sampai: deps.sampai ?? defaultSampai(),
          grup: deps.grup ?? 'harian',
        },
      }),
      kunjunganDataFn({
        data: {
          dari: deps.dari ?? defaultDari(),
          sampai: deps.sampai ?? defaultSampai(),
          grup: deps.grup ?? 'harian',
          userType: deps.userType,
        },
      }),
      laporanShiftFn({
        data: {
          dari: deps.dari ?? defaultDari(),
          sampai: deps.sampai ?? defaultSampai(),
        },
      }),
    ])
    return { laporan, kunjungan, shiftLaporan }
  },
  component: Laporan,
})

function Laporan() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/laporan' })

  const laporan = data.laporan
  const kunjungan = data.kunjungan
  const shiftLaporan = data.shiftLaporan

  const [dari, setDari] = useState(search.dari ?? defaultDari())
  const [sampai, setSampai] = useState(search.sampai ?? defaultSampai())
  const [grup, setGrup] = useState(search.grup ?? 'harian')
  const [userType, setUserType] = useState<string | undefined>(search.userType)

  const qs = new URLSearchParams({
    dari: laporan.dari,
    sampai: laporan.sampai,
    grup: laporan.grup,
    ...(userType ? { userType } : {}),
  })
  const unduh = (format: string) =>
    `/api/v1/laporan-penjualan?${qs.toString()}&format=${format}`

  const kosong = laporan.ringkasan.jumlahTransaksi === 0

  return (
    <DashboardLayout peran="OWNER" judul={m.laporan_title()}>
      <FilterLaporan
        nilai={{ dari, sampai, grup, userType }}
        onDari={setDari}
        onSampai={setSampai}
        onGrup={setGrup}
        onUserType={(v) =>
          setUserType(v === 'member' || v === 'non-member' ? v : undefined)
        }
        onTampilkan={() => {
          void navigate({ search: { dari, sampai, grup } })
        }}
        unduh={unduh}
      />

      <RingkasanKartu
        laporan={laporan.ringkasan}
        kunjungan={kunjungan.ringkasan}
      />

      <GrafikKunjungan
        deret={kunjungan.deret}
        ringkasan={kunjungan.ringkasan}
      />

      {kosong ? (
        <KosongLaporan deret={kunjungan.deret} />
      ) : (
        <TabelLaporan laporan={laporan} />
      )}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{m.shift_riwayat()}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="-mx-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.shift_dibuka()}</TableHead>
                    <TableHead>{m.shift_kasir()}</TableHead>
                    <TableHead>{m.shift_ditutup()}</TableHead>
                    <TableHead className="text-right">
                      {m.shift_kas_awal()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.shift_total_tunai()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.shift_kas_akhir()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.shift_selisih()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.shift_jumlah_transaksi()}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftLaporan.riwayat.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-4 text-center text-neutral-500"
                      >
                        {m.shift_kosong()}
                      </TableCell>
                    </TableRow>
                  ) : (
                    shiftLaporan.riwayat.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>{waktu(s.waktuBuka)}</TableCell>
                        <TableCell>{s.kasirNama}</TableCell>
                        <TableCell>
                          {s.waktuTutup ? (
                            waktu(s.waktuTutup)
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-900 dark:text-blue-200">
                              {m.shift_berjalan()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          Rp{rupiah(s.kasAwal)}
                        </TableCell>
                        <TableCell className="text-right">
                          Rp{rupiah(s.totalTunai)}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.kasAkhir != null ? 'Rp' + rupiah(s.kasAkhir) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.selisih != null ? (
                            <span
                              className={
                                s.selisih === 0
                                  ? 'text-emerald-600'
                                  : 'text-amber-600'
                              }
                            >
                              Rp{rupiah(s.selisih)}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.jumlahTransaksi}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {shiftLaporan.shiftAktif && (
              <div className="border-t border-border p-3 text-xs text-neutral-500">
                {m.shift_aktif_label()}: {shiftLaporan.shiftAktif.kasirNama} ·
                {waktu(shiftLaporan.shiftAktif.waktuBuka)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
