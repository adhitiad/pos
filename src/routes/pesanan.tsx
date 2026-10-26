import { createFileRoute } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { cekTokoBukaFn } from '#/server/pengaturanFn'

import Pesanan from '#/components/pesanan/Pesanan'

export const Route = createFileRoute('/pesanan')({
  validateSearch: (search: Record<string, unknown>) => ({
    meja:
      typeof search.meja === 'string' ? search.meja.slice(0, 512) : undefined,
  }),
  head: () => ({
    meta: [{ title: `${m.pesan_judul()} · ${m.app_title()}` }],
  }),
  loader: async () => {
    const status = await cekTokoBukaFn()
    return { statusToko: status }
  },
  component: HalamanPesanan,
})

function HalamanPesanan() {
  const { meja } = Route.useSearch()
  const { statusToko } = Route.useLoaderData()
  return (
    <Pesanan
      mejaTokenAwal={meja}
      tokoBuka={statusToko.buka}
      tokoAlasan={statusToko.alasan}
    />
  )
}
