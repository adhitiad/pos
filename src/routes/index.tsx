import { useEffect, useState } from 'react'

import { createFileRoute } from '@tanstack/react-router'

import { useIdentitasApp } from '#/hooks/identitas'

import Footer from '#/components/Footer'
import { SidebarProvider } from '#/components/ui/sidebar'
import Header from '#/components/Header'
import CtaLanding from '#/components/home/CtaLanding'
import FiturLanding from '#/components/home/FiturLanding'
import HeroLanding from '#/components/home/HeroLanding'
import ProdukLanding from '#/components/home/ProdukLanding'
import { getPenggunaFn } from '#/server/authFn'
import { produkLandingFn } from '#/server/produkFn'

import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: m.app_title() },
      { name: 'description', content: m.home_hero_lead() },
    ],
  }),
  loader: async () => ({
    produkLanding: await produkLandingFn(),
  }),
  component: Home,
})

function Home() {
  const { produkLanding } = Route.useLoaderData()
  const identitas = useIdentitasApp()
  const [peran, setPeran] = useState<string | undefined>()

  useEffect(() => {
    document.title = identitas.judul
  }, [identitas.judul])

  useEffect(() => {
    void getPenggunaFn()
      .then((p) => setPeran(p?.role))
      .catch(() => setPeran(undefined))
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SidebarProvider>
        <Header />
      </SidebarProvider>
      <main className="flex-1">
        <HeroLanding peran={peran} />
        <ProdukLanding produk={produkLanding} />
        <FiturLanding />
        <CtaLanding />
      </main>
      <Footer />
    </div>
  )
}
