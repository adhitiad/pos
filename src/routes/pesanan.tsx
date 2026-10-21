import { createFileRoute } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

import Pesanan from '#/components/pesanan/Pesanan'

export const Route = createFileRoute('/pesanan')({
  head: () => ({
    meta: [{ title: `${m.pesan_judul()} · ${m.app_title()}` }],
  }),
  component: Pesanan,
})
