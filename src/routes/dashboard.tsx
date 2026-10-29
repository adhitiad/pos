import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, useMemo } from 'react'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { dashboardDataFn } from '#/server/dashboardFn'
import { pengaturanDataFn } from '#/server/pengaturanFn'

import DashboardLayout from '#/components/DashboardLayout'
import StatusToko from '#/components/dashboard/StatusToko'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/hooks/table-controls'
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  ShoppingCart,
  Users,
  Package,
} from 'lucide-react'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export const Route = createFileRoute('/dashboard')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional')) throw redirect({ to: '/' })
  },
  loader: async () => {
    const [data, user, pengaturan] = await Promise.all([
      dashboardDataFn(),
      getSessionFn(),
      pengaturanDataFn(),
    ])
    return { data, user, tokoAktif: pengaturan.tokoAktif }
  },
  component: Dashboard,
})

function Dashboard() {
  const { data, user, tokoAktif } = Route.useLoaderData()
  const stokMenipis = data.stokMenipis

  const [urutan, setUrutan] = useState<'baru' | 'lama' | 'besar' | 'kecil'>(
    'baru',
  )

  const transaksi = useMemo(() => {
    const items = [...data.transaksiHariIni]
    items.sort((a, b) => {
      if (urutan === 'baru') return b.tanggal.localeCompare(a.tanggal)
      if (urutan === 'lama') return a.tanggal.localeCompare(b.tanggal)
      if (urutan === 'besar') return b.total - a.total
      return a.total - b.total
    })
    return items
  }, [data.transaksiHariIni, urutan])
  const kontrolTransaksi = useKontrolTabel(
    transaksi,
    (t) =>
      `${t.nomor} ${t.member?.nama ?? ''} ${t.items.map((item) => item.produkNama).join(' ')}`,
    {},
  )

  const transaksiPerJam = useMemo(() => {
    const hitung = Array(24).fill(0)
    for (const t of data.transaksiHariIni) {
      const jam = new Date(t.tanggal).getHours()
      hitung[jam] += 1
    }
    return hitung
  }, [data.transaksiHariIni])

  const maxJam = Math.max(...transaksiPerJam, 1)

  const kotorNegatif = data.keuntunganHariIni.kotor < 0
  const bersihNegatif = data.keuntunganHariIni.bersih < 0

  return (
    <DashboardLayout peran={user!.role} judul={m.dashboard_title()}>
      <StatusToko awalAktif={tokoAktif} />

      {/* Keuntungan */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.dashboard_pendapatan_kotor()}
              </CardTitle>
            </div>
            <CreditCard className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-3xl font-bold ${kotorNegatif ? 'text-destructive' : ''}`}
              >
                Rp{rupiah(Math.abs(data.keuntunganHariIni.kotor))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {m.dashboard_transaksi_hari_ini()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.dashboard_keuntungan_bersih()}
              </CardTitle>
            </div>
            <ShoppingCart className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-1">
              <span
                className={`text-2xl font-bold ${bersihNegatif ? 'text-destructive' : ''}`}
              >
                Rp{rupiah(Math.abs(data.keuntunganHariIni.bersih))}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {m.dashboard_biaya_ops()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.dashboard_produk_aktif()}
              </CardTitle>
            </div>
            <Package className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{data.jumlahProduk}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {m.dashboard_produk_aktif_desc()}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.dashboard_member()}
              </CardTitle>
            </div>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{data.jumlahMember}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {m.dashboard_member_desc()}
            </p>
          </CardContent>
        </Card>

        <Card
          className={
            stokMenipis > 0 ? 'border-destructive/50' : 'border-primary/10'
          }
        >
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.dashboard_stok_menipis()}
              </CardTitle>
            </div>
            <Clock className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{stokMenipis}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {m.dashboard_stok_menipis_desc()}
            </p>
            {stokMenipis > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs px-2 py-1">
                {m.perlu_diisi_ulang()}
              </Badge>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Chart transaksi per jam hari ini */}
      <section className="mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-3">
            <div>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.dashboard_chart()}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div
              className="overflow-x-auto border-b border-border pb-4"
              // Region yang bisa digeser horizontal wajib bisa difokuskan agar
              // pengguna keyboard dapat menggulirnya tanpa mouse (axe).
              tabIndex={0}
              role="group"
              aria-label={m.dashboard_chart()}
            >
              <div className="flex items-end justify-between gap-1 h-32 min-w-[600px]">
                {transaksiPerJam.map((jumlah, jam) => {
                  const tinggi = ((jumlah / maxJam) * 100).toFixed(0) + '%'
                  return (
                    <div
                      key={jam}
                      className="flex flex-col items-center gap-1 w-6"
                    >
                      <div
                        className={`w-full bg-primary rounded-t ${jumlah > 0 ? 'bg-primary' : 'bg-muted'}`}
                        style={{ height: tinggi }}
                      />
                      <span className="text-[10px] text-muted-foreground">
                        {jam}
                      </span>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                {m.dashboard_jam()}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Tabel transaksi dengan pengurutan */}
      <section className="mt-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-sm font-semibold">
              {m.dashboard_transaksi_hari_ini()}
            </h2>
          </div>
          <div className="flex items-center gap-2 border border-border rounded-md p-1">
            {(['baru', 'lama', 'besar', 'kecil'] as const).map((k) => {
              const label =
                k === 'baru'
                  ? m.dashboard_baru_dulu()
                  : k === 'lama'
                    ? m.dashboard_lama_dulu()
                    : k === 'besar'
                      ? m.dashboard_terbesar_dulu()
                      : m.dashboard_terkecil_dulu()
              return (
                <Button
                  key={k}
                  size="sm"
                  variant={urutan === k ? 'default' : 'outline'}
                  className="rounded-none px-3 py-1.5 text-xs"
                  onClick={() => setUrutan(k)}
                >
                  {urutan === k && (
                    <span className="mr-1">
                      {k === 'baru' || k === 'besar' ? (
                        <ChevronUp size={10} />
                      ) : (
                        <ChevronDown size={10} />
                      )}
                    </span>
                  )}
                  {label}
                </Button>
              )
            })}
          </div>
        </div>
        <PencarianTabel
          value={kontrolTransaksi.cari}
          onChange={kontrolTransaksi.setCari}
          className="mb-3"
        />

        <Card>
          <CardContent>
            <div className="-mx-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">
                      {m.dashboard_transaksi()}
                    </TableHead>
                    <TableHead>{m.dashboard_baru_dulu()}</TableHead>
                    <TableHead className="text-right">
                      {m.dashboard_terbesar_dulu()}
                    </TableHead>
                    <TableHead className="text-right">
                      {m.dashboard_terkecil_dulu()}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kontrolTransaksi.jumlahBaris === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-4 text-muted-foreground"
                      >
                        {m.dashboard_tanpa_transaksi()}
                      </TableCell>
                    </TableRow>
                  ) : (
                    kontrolTransaksi.baris.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-right font-medium">
                          Rp{rupiah(t.total)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(t.tanggal).toLocaleString('id-ID', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </TableCell>
                        <TableCell className="text-right">
                          {t.items.length} item
                        </TableCell>
                        <TableCell className="text-right">
                          {t.member ? t.member.nama : 'Umum'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <PaginasiTabel
              halamanAktif={kontrolTransaksi.halamanAktif}
              jumlahHalaman={kontrolTransaksi.jumlahHalaman}
              jumlahBaris={kontrolTransaksi.jumlahBaris}
              ukuranHalaman={kontrolTransaksi.ukuranHalaman}
              onHalaman={kontrolTransaksi.setHalaman}
              onUkuranHalaman={kontrolTransaksi.setUkuranHalaman}
            />
          </CardContent>
        </Card>
      </section>
    </DashboardLayout>
  )
}
