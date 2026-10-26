import { createRouter as createTanStackRouter } from '@tanstack/react-router'
import { getGlobalStartContext } from '@tanstack/react-start'
import {
  HalamanError,
  HalamanLoading,
  HalamanNotFound,
} from '#/components/status/HalamanStatus'
import { routeTree } from './routeTree.gen'

function nonceDariKonteks(): string | undefined {
  try {
    const konteks = getGlobalStartContext() as { nonce?: string } | undefined
    return konteks?.nonce
  } catch {
    return undefined
  }
}

export function getRouter() {
  const router = createTanStackRouter({
    routeTree,
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Data loader dipakai ulang 30 detik saat navigasi/preload. Tanpa ini,
    // setiap pindah halaman memicu fetch ulang penuh (katalog, laporan, dsb).
    // Halaman yang butuh data segar tetap memanggil router.invalidate()
    // secara terarah (mis. KDS /dapur).
    defaultPreloadStaleTime: 30_000,
    defaultStaleTime: 30_000,
    defaultPendingComponent: HalamanLoading,
    defaultPendingMs: 150,
    defaultPendingMinMs: 300,
    defaultErrorComponent: HalamanError,
    defaultNotFoundComponent: HalamanNotFound,
    ssr: { nonce: nonceDariKonteks() },
  })

  return router
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
