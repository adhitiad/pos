import { Store } from 'lucide-react'

import { createFileRoute } from '@tanstack/react-router'

import HalamanInfo from '#/components/HalamanInfo'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/tentang')({
  head: () => ({
    meta: [{ title: `${m.tentang_title()} · ${m.app_title()}` }],
  }),
  component: Tentang,
})

function Tentang() {
  return (
    <HalamanInfo judul={m.tentang_title()} ikon={<Store className="size-6" />}>
      <p>{m.tentang_intro()}</p>
      <p>{m.tentang_deskripsi()}</p>
      <p className="border-t pt-4 text-sm">{m.tentang_versi()}</p>
    </HalamanInfo>
  )
}
