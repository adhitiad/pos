import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import {
  Bell,
  CheckCheck,
  ClipboardCheck,
  ClipboardList,
  ExternalLink,
  PackageCheck,
  PackageX,
  ReceiptText,
  TrendingUp,
} from 'lucide-react'

import { m } from '#/paraglide/messages'
import { useNotifikasiDibaca } from '#/lib/notifikasi'
import { getSessionFn } from '#/server/authFn'
import { notifikasiFn } from '#/server/notifikasiFn'
import type {
  Notifikasi,
  NotifikasiPengajuan,
  PeriodePendapatan,
  StatusPesananNotif,
} from '#/types/notifikasi'

import DashboardLayout from '#/components/DashboardLayout'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export const Route = createFileRoute('/notifikasi')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
  },
  loader: async () => {
    const [data, user] = await Promise.all([notifikasiFn(), getSessionFn()])
    return { data, user }
  },
  component: Notifikasi,
})

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const judulPendapatan = (periode: PeriodePendapatan) => {
  if (periode === 'harian') return m.notif_pendapatan_harian()
  if (periode === 'mingguan') return m.notif_pendapatan_mingguan()
  return m.notif_pendapatan_bulanan()
}

const labelStatus = (status: StatusPesananNotif) => {
  if (status === 'MENUNGGU') return m.notif_status_menunggu()
  if (status === 'DIPROSES') return m.notif_status_diproses()
  if (status === 'SELESAI') return m.notif_status_selesai()
  if (status === 'DIBATALKAN') return m.notif_status_dibatalkan()
  return m.notif_status_lunas()
}

const warnaStatus: Record<StatusPesananNotif, string> = {
  MENUNGGU:
    'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
  DIPROSES:
    'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300',
  SELESAI:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
  DIBATALKAN:
    'border-neutral-300 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300',
  LUNAS:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
}

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const judulPengajuan = (notif: NotifikasiPengajuan) => {
  if (notif.kategori === 'SETUJUI') return m.notif_pengajuan_disetujui()
  if (notif.kategori === 'TOLAK') return m.notif_pengajuan_ditolak()
  if (notif.kategori === 'PENGAJUAN') return m.notif_pengajuan_baru()
  return m.notif_pengajuan_info()
}

const warnaPengajuan = (notif: NotifikasiPengajuan) => {
  if (notif.kategori === 'SETUJUI') return 'text-emerald-600'
  if (notif.kategori === 'TOLAK') return 'text-destructive'
  return 'text-amber-600'
}

const judulNotifikasi = (notif: Notifikasi) => {
  if (notif.tipe === 'stok') return m.notif_stok_habis()
  if (notif.tipe === 'pendapatan') return judulPendapatan(notif.periode)
  if (notif.tipe === 'transaksi') return m.notif_transaksi_berhasil()
  if (notif.tipe === 'pengajuan') return judulPengajuan(notif)
  return notif.untuk === 'kasir'
    ? m.notif_pesanan_baru()
    : m.notif_pesanan_status()
}

function Notifikasi() {
  const { data, user } = Route.useLoaderData()
  const { dibaca, tandai } = useNotifikasiDibaca()
  const belumDibaca = data.filter((n) => !dibaca.has(n.id))
  const stokHabis = data.filter((n) => n.tipe === 'stok').length

  return (
    <DashboardLayout peran={user!.role} judul={m.notif_title()}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4" />
            {m.notif_desc()}
          </CardTitle>
          <CardDescription>
            {m.notif_ringkasan({
              jumlah: data.length,
              baru: belumDibaca.length,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2 text-sm">
            {stokHabis > 0 && (
              <Badge variant="destructive">
                {m.notif_stok_habis()}: {stokHabis}
              </Badge>
            )}
            <Badge variant={belumDibaca.length > 0 ? 'default' : 'secondary'}>
              {m.notif_baru()}: {belumDibaca.length}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={belumDibaca.length === 0}
            onClick={() => tandai(data.map((n) => n.id))}
          >
            <CheckCheck className="mr-1 size-4" />
            {m.notif_tandai_semua()}
          </Button>
        </CardContent>
      </Card>

      {data.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Bell className="size-8 text-muted-foreground" />
            <p className="font-medium">{m.notif_kosong()}</p>
            <p className="max-w-md text-sm text-muted-foreground">
              {m.notif_kosong_desc()}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((notif) => {
            const sudah = dibaca.has(notif.id)
            return (
              <Card
                key={notif.id}
                className={sudah ? 'opacity-70' : 'border-destructive/30'}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-3 py-3">
                  <div className="flex min-w-0 gap-2">
                    {notif.tipe === 'stok' && (
                      <PackageX className="mt-0.5 size-5 shrink-0 text-destructive" />
                    )}
                    {notif.tipe === 'pendapatan' && (
                      <TrendingUp className="mt-0.5 size-5 shrink-0 text-primary" />
                    )}
                    {notif.tipe === 'transaksi' && (
                      <ReceiptText className="mt-0.5 size-5 shrink-0 text-emerald-600" />
                    )}
                    {notif.tipe === 'pesanan' && (
                      <>
                        {notif.untuk === 'kasir' ? (
                          <ClipboardList className="mt-0.5 size-5 shrink-0 text-amber-600" />
                        ) : (
                          <PackageCheck className="mt-0.5 size-5 shrink-0 text-blue-600" />
                        )}
                      </>
                    )}
                    {notif.tipe === 'pengajuan' && (
                      <ClipboardCheck
                        className={`mt-0.5 size-5 shrink-0 ${warnaPengajuan(notif)}`}
                      />
                    )}
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        {judulNotifikasi(notif)}
                      </CardTitle>
                      <CardDescription>
                        {notif.tipe === 'stok' &&
                          m.notif_stok_pesan({
                            nama: notif.nama,
                            stok: notif.stok,
                            satuan: notif.satuan,
                          })}
                        {notif.tipe === 'pendapatan' &&
                          m.notif_pendapatan_pesan({
                            total: rupiah(notif.total),
                            jumlah: notif.jumlahTransaksi,
                          })}
                        {notif.tipe === 'transaksi' &&
                          m.notif_transaksi_pesan({
                            nomor: notif.nomor,
                            total: rupiah(notif.total),
                          })}
                        {notif.tipe === 'pesanan' &&
                          m.notif_pesanan_pesan({
                            nomor: notif.nomor,
                            status: labelStatus(notif.status),
                            total: rupiah(notif.total),
                          })}
                        {notif.tipe === 'pengajuan' && notif.pesan}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant={sudah ? 'secondary' : 'destructive'}>
                    {sudah ? m.notif_dibaca() : m.notif_baru()}
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notif.tipe === 'stok' && (
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">
                        {m.notif_stok_detail({
                          stok: notif.stok,
                          satuan: notif.satuan,
                          minimum: notif.stokMinimum,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.notif_diperbarui({ waktu: waktu(notif.tanggal) })}
                      </p>
                    </div>
                  )}

                  {notif.tipe === 'pendapatan' && (
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {m.notif_periode()}
                        </p>
                        <p className="font-medium">
                          {notif.dari} – {notif.sampai}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {m.notif_total()}
                        </p>
                        <p className="font-medium">Rp{rupiah(notif.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {m.notif_transaksi()}
                        </p>
                        <p className="font-medium">{notif.jumlahTransaksi}</p>
                      </div>
                    </div>
                  )}

                  {notif.tipe === 'transaksi' && (
                    <div className="grid gap-2 text-sm sm:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {m.notif_nomor()}
                        </p>
                        <p className="font-medium">{notif.nomor}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {m.notif_total()}
                        </p>
                        <p className="font-medium">Rp{rupiah(notif.total)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {m.notif_poin()}
                        </p>
                        <p className="font-medium">+{notif.poinDapat}</p>
                      </div>
                      <p className="text-xs text-muted-foreground sm:col-span-3">
                        {m.notif_diperbarui({ waktu: waktu(notif.tanggal) })}
                      </p>
                    </div>
                  )}

                  {notif.tipe === 'pesanan' && (
                    <div className="space-y-2 text-sm">
                      <div className="grid gap-2 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {m.notif_nomor()}
                          </p>
                          <p className="font-medium">{notif.nomor}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {m.notif_total()}
                          </p>
                          <p className="font-medium">Rp{rupiah(notif.total)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {m.notif_status()}
                          </p>
                          <Badge
                            variant="outline"
                            className={warnaStatus[notif.status]}
                          >
                            {labelStatus(notif.status)}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {m.notif_jumlah_item({ jumlah: notif.jumlahItem })}
                        {notif.meja
                          ? ` · ${m.meja_nomor()}: ${notif.meja}`
                          : ''}
                        {notif.pelanggan
                          ? ` · ${m.pesan_nama_pelanggan()}: ${notif.pelanggan}`
                          : ''}
                        {` · ${m.notif_diperbarui({ waktu: waktu(notif.tanggal) })}`}
                      </p>
                    </div>
                  )}

                  {notif.tipe === 'pengajuan' && (
                    <p className="text-xs text-muted-foreground">
                      {m.notif_diperbarui({ waktu: waktu(notif.tanggal) })}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={
                          notif.tipe === 'stok'
                            ? '/bahan'
                            : notif.tipe === 'pendapatan'
                              ? '/laporan'
                              : notif.tipe === 'transaksi'
                                ? '/pesanan'
                                : notif.tipe === 'pengajuan'
                                  ? '/pengajuan'
                                  : notif.untuk === 'kasir'
                                    ? '/dapur'
                                    : '/pesanan'
                        }
                      >
                        <ExternalLink className="mr-1 size-3.5" />
                        {notif.tipe === 'stok' && m.notif_lihat_bahan()}
                        {notif.tipe === 'pendapatan' && m.notif_lihat_laporan()}
                        {notif.tipe === 'transaksi' && m.notif_belanja_lagi()}
                        {notif.tipe === 'pengajuan' &&
                          m.notif_lihat_pengajuan()}
                        {notif.tipe === 'pesanan' &&
                          (notif.untuk === 'kasir'
                            ? m.notif_lihat_dapur()
                            : m.notif_lihat_pesanan())}
                      </Link>
                    </Button>
                    {!sudah && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => tandai([notif.id])}
                      >
                        <CheckCheck className="mr-1 size-3.5" />
                        {m.notif_tandai_dibaca()}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </DashboardLayout>
  )
}
