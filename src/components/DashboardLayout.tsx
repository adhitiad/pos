import { useEffect } from 'react'
import type { ReactNode } from 'react'

import { useIdentitasApp } from '#/lib/identitas'

import Header from '#/components/Header'
import NavigasiRemah from '#/components/NavigasiRemah'
import RelNav from '#/components/kasir/RelNav'
import { SidebarProvider } from '#/components/ui/sidebar'

export default function DashboardLayout({
  peran,
  judul,
  aksi,
  children,
}: {
  peran?: string
  judul: string
  aksi?: ReactNode
  children: ReactNode
}) {
  const identitas = useIdentitasApp()

  // Judul tab ikut halaman & judul aplikasi dari pengaturan owner.
  useEffect(() => {
    document.title = `${judul} · ${identitas.judul}`
  }, [judul, identitas.judul])

  return (
    <SidebarProvider>
      <RelNav peran={peran} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="mx-auto w-full max-w-6xl space-y-5 p-3 pb-28 sm:p-6 md:pb-6">
          <NavigasiRemah saatIni={judul} />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl font-bold sm:text-2xl">{judul}</h1>
            {aksi}
          </div>
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
