import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { bukaShiftFn, shiftDataFn, tutupShiftFn } from '#/server/shiftFn'

import DashboardLayout from '#/components/DashboardLayout'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

export const Route = createFileRoute('/shift')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional')) throw redirect({ to: '/' })
  },
  loader: async () => shiftDataFn({ data: {} }),
  component: Shift,
})

function Shift() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [kasAwal, setKasAwal] = useState('')
  const [kasAkhir, setKasAkhir] = useState('')
  const [catatan, setCatatan] = useState('')
  const [pending, setPending] = useState(false)
  const [filterStatus, setFilterStatus] = useState('SEMUA')
  const riwayat = data.riwayat.filter(
    (s) =>
      filterStatus === 'SEMUA' ||
      (filterStatus === 'BERJALAN'
        ? s.waktuTutup === null
        : s.waktuTutup !== null),
  )
  const kontrol = useKontrolTabel(
    riwayat,
    (s) =>
      `${s.kasirNama} ${s.waktuBuka} ${s.waktuTutup ?? ''} ${s.catatan ?? ''}`,
    {
      kasir: (s) => s.kasirNama,
      dibuka: (s) => s.waktuBuka,
      ditutup: (s) => s.waktuTutup ?? '',
      awal: (s) => s.kasAwal,
      tunai: (s) => s.totalTunai,
      seharusnya: (s) => s.seharusnya,
      akhir: (s) => s.kasAkhir ?? -1,
      selisih: (s) => s.selisih ?? 0,
      transaksi: (s) => s.jumlahTransaksi,
    },
  )

  const gagal = (e: unknown, fallback: string) => {
    toast.error(e instanceof Error ? e.message : fallback)
  }

  const buka = async () => {
    setPending(true)
    try {
      await bukaShiftFn({ data: { kasAwal: Number(kasAwal) || 0 } })
      await router.invalidate()
      toast.success(m.shift_buka_sukses())
      setKasAwal('')
    } catch (e) {
      gagal(e, 'Gagal membuka shift')
    } finally {
      setPending(false)
    }
  }

  const tutup = async () => {
    setPending(true)
    try {
      await tutupShiftFn({
        data: {
          kasAkhir: Number(kasAkhir) || 0,
          catatan: catatan || undefined,
        },
      })
      await router.invalidate()
      toast.success(m.shift_tutup_sukses())
      setKasAkhir('')
      setCatatan('')
    } catch (e) {
      gagal(e, 'Gagal menutup shift')
    } finally {
      setPending(false)
    }
  }

  const aktif = data.shiftAktif
  const selisihPreview = (Number(kasAkhir) || 0) - (aktif?.seharusnya ?? 0)

  return (
    <DashboardLayout peran={undefined} judul={m.shift_title()}>
      {aktif ? (
        <Card>
          <CardHeader>
            <CardTitle>{m.shift_aktif_label()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={m.shift_kas_awal()} nilai={aktif.kasAwal} />
              <Stat label={m.shift_total_tunai()} nilai={aktif.totalTunai} />
              <Stat label={m.shift_seharusnya()} nilai={aktif.seharusnya} />
              <div>
                <p className="text-xs text-neutral-500">
                  {m.shift_jumlah_transaksi()}
                </p>
                <p className="text-lg font-semibold">{aktif.jumlahTransaksi}</p>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              {m.shift_aktif_label()}: {aktif.kasirNama} ·{' '}
              {waktu(aktif.waktuBuka)}
            </p>

            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{m.shift_tutup()}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>{m.shift_kas_akhir()}</Label>
                  <Input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={kasAkhir}
                    onChange={(e) => {
                      setKasAkhir(e.target.value)
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>{m.shift_catatan()}</Label>
                  <Textarea
                    rows={1}
                    value={catatan}
                    onChange={(e) => {
                      setCatatan(e.target.value)
                    }}
                  />
                </div>
              </div>
              {kasAkhir !== '' && (
                <p className="text-sm">
                  {m.shift_selisih()}:{' '}
                  <strong
                    className={
                      selisihPreview === 0
                        ? 'text-emerald-600'
                        : 'text-amber-600'
                    }
                  >
                    Rp{rupiah(selisihPreview)}
                  </strong>
                </p>
              )}
              <Button
                variant="destructive"
                disabled={pending || kasAkhir === ''}
                onClick={() => void tutup()}
              >
                {m.shift_tutup()}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{m.shift_buka()}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-w-xs space-y-1">
              <Label>{m.shift_kas_awal()}</Label>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={kasAwal}
                onChange={(e) => {
                  setKasAwal(e.target.value)
                }}
              />
            </div>
            <Button disabled={pending} onClick={() => void buka()}>
              {m.shift_buka()}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{m.shift_riwayat()}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <PencarianTabel value={kontrol.cari} onChange={kontrol.setCari} />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-44" aria-label={m.shift_riwayat()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SEMUA">{m.percetakan_semua()}</SelectItem>
                <SelectItem value="BERJALAN">{m.shift_berjalan()}</SelectItem>
                <SelectItem value="SELESAI">{m.shift_tutup()}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {data.semuaKasir && (
                    <HeaderUrutTabel
                      kunci="kasir"
                      aktif={kontrol.kunciUrut === 'kasir'}
                      arah={kontrol.arahUrut}
                      onUrut={kontrol.toggleUrut}
                    >
                      {m.shift_kasir()}
                    </HeaderUrutTabel>
                  )}
                  <HeaderUrutTabel
                    kunci="dibuka"
                    aktif={kontrol.kunciUrut === 'dibuka'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                  >
                    {m.shift_dibuka()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="ditutup"
                    aktif={kontrol.kunciUrut === 'ditutup'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                  >
                    {m.shift_ditutup()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="awal"
                    aktif={kontrol.kunciUrut === 'awal'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                    className="text-right"
                  >
                    {m.shift_kas_awal()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="tunai"
                    aktif={kontrol.kunciUrut === 'tunai'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                    className="text-right"
                  >
                    {m.shift_total_tunai()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="seharusnya"
                    aktif={kontrol.kunciUrut === 'seharusnya'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                    className="text-right"
                  >
                    {m.shift_seharusnya()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="akhir"
                    aktif={kontrol.kunciUrut === 'akhir'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                    className="text-right"
                  >
                    {m.shift_kas_akhir()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="selisih"
                    aktif={kontrol.kunciUrut === 'selisih'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                    className="text-right"
                  >
                    {m.shift_selisih()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="transaksi"
                    aktif={kontrol.kunciUrut === 'transaksi'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                    className="text-right"
                  >
                    {m.shift_jumlah_transaksi()}
                  </HeaderUrutTabel>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kontrol.jumlahBaris === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={data.semuaKasir ? 9 : 8}
                      className="py-4 text-center text-neutral-500"
                    >
                      {m.shift_kosong()}
                    </TableCell>
                  </TableRow>
                ) : (
                  kontrol.baris.map((s) => (
                    <TableRow key={s.id}>
                      {data.semuaKasir && (
                        <TableCell className="font-medium">
                          {s.kasirNama}
                        </TableCell>
                      )}
                      <TableCell>{waktu(s.waktuBuka)}</TableCell>
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
                        Rp{rupiah(s.seharusnya)}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.kasAkhir != null ? `Rp${rupiah(s.kasAkhir)}` : '-'}
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
    </DashboardLayout>
  )
}

function Stat({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div>
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-lg font-semibold">Rp{rupiah(nilai)}</p>
    </div>
  )
}
