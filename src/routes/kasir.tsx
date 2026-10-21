import { createFileRoute, redirect } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { kasirDataFn } from '#/server/kasirFn'

import DashboardLayout from '#/components/DashboardLayout'
import PanelBayar from '#/components/kasir/PanelBayar'
import BarcodeScanner from '#/components/kasir/BarcodeScanner'
import ProdukGrid from '#/components/kasir/ProdukGrid'
import { Card, CardContent } from '#/components/ui/card'

export const Route = createFileRoute('/kasir')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional')) throw redirect({ to: '/' })
  },
  loader: async () => {
    const [data, user] = await Promise.all([kasirDataFn(), getSessionFn()])
    return { data, user }
  },
  component: Kasir,
})

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

function Kasir() {
  const { data, user } = Route.useLoaderData()

  return (
    <DashboardLayout
      peran={user?.role}
      judul={m.kasir_title()}
      aksi={
        <p className="rounded-full border border-border bg-card px-3 py-1.5 text-xs sm:text-sm">
          {m.kasir_penjualan()}:{' '}
          <strong>Rp{rupiah(data.penjualanHariIni.total)}</strong> ·{' '}
          {data.penjualanHariIni.jumlah} {m.kasir_trx()}
        </p>
      }
    >
      <div className="grid items-start gap-4 sm:gap-6 lg:grid-cols-[1fr_360px]">
        <ProdukGrid data={data} />
        <Card className="lg:sticky lg:top-20">
          <CardContent>
            <BarcodeScanner produk={data.produk} />
            <PanelBayar data={data} bolehBayar={data.bolehBayar} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
