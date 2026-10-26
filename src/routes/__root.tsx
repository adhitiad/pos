import {
  HeadContent,
  Scripts,
  createRootRoute,
  useLocation,
  useRouter,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { ThemeProvider } from 'next-themes'

import IdentitasSinkron from '#/components/IdentitasSinkron'
import DaftarServiceWorker from '#/components/DaftarServiceWorker'
import PemindaiPrinterOtomatis from '#/components/PemindaiPrinterOtomatis'
import {
  HalamanError,
  HalamanLoading,
  HalamanNotFound,
} from '#/components/status/HalamanStatus'
import { Toaster } from '#/components/ui/sonner'

import { getLocale } from '#/paraglide/runtime'

import appCss from '../styles.css?url'

import { useEffect } from 'react'

export const Route = createRootRoute({
  beforeLoad: async () => {
    // Other redirect strategies are possible; see
    // https://github.com/TanStack/router/tree/main/examples/react/i18n-paraglide#offline-redirect
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', getLocale())
    }
  },

  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'description',
        content:
          'Sistem kasir (POS) dan buku besar untuk usaha kuliner dan ritel.',
      },
      {
        title: import.meta.env.VITE_APP_TITLE ?? 'POS',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/api/v1/app-icon',
      },
      {
        rel: 'apple-touch-icon',
        href: '/api/v1/app-icon',
      },
      {
        rel: 'manifest',
        href: '/api/v1/manifest',
      },
    ],
  }),
  // Error generik: jangan pernah tampilkan error.message (bisa bocorkan detail
  // internal) di produksi (OW-03).
  errorComponent: HalamanError,
  // 404: jawab apa yang terjadi + jalan keluar, jangan layar kosong "Not Found".
  notFoundComponent: HalamanNotFound,
  pendingComponent: HalamanLoading,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const nonce = useRouter().options.ssr?.nonce

  const KUNCI_TOKEN_PERANGKAT = 'pos_device_token'

  const ambilTokenPerangkat = async (): Promise<string | null> => {
    try {
      const res = await fetch('/api/v1/device-visit-token', { method: 'POST' })
      if (!res.ok) {
        await res.body?.cancel()
        return null
      }
      const json: unknown = await res.json()
      const data =
        json && typeof json === 'object'
          ? (json as { data?: unknown }).data
          : undefined
      const token =
        data && typeof data === 'object'
          ? (data as { token?: unknown }).token
          : undefined
      if (typeof token !== 'string' || token.length < 20) return null
      localStorage.setItem(KUNCI_TOKEN_PERANGKAT, token)
      return token
    } catch {
      return null
    }
  }

  const kirimDeviceVisit = async () => {
    let token = localStorage.getItem(KUNCI_TOKEN_PERANGKAT)
    if (!token) token = await ambilTokenPerangkat()
    if (!token) return

    let res = await fetch('/api/v1/device-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
    // Token kedaluwarsa / User-Agent berubah → minta token baru sekali.
    if (res.status === 422 || res.status === 401) {
      await res.body?.cancel()
      token = await ambilTokenPerangkat()
      if (!token) return
      res = await fetch('/api/v1/device-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
    }
    await res.body?.cancel()
  }

  useEffect(() => {
    // Metadata analytics diturunkan di server dari sesi/header tepercaya;
    // klien hanya mengirim token perangkat bertanda tangan server (SEC-24).
    // Body selalu dikonsumsi (`body.cancel()`) — fetch fire-and-forget yang
    // bodynya tak dibaca membuat koneksi tetap "in-flight" di browser.
    void fetch('/api/v1/kunjungan', { method: 'POST' })
      .then((res) => res.body?.cancel())
      .catch(() => {
        // page visit tracking non-fatal (mis. saat offline)
      })

    void kirimDeviceVisit().catch(() => {
      // device visit tracking non-fatal
    })
  }, [location.pathname])

  return (
    <html lang={getLocale()} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          nonce={nonce}
        >
          <IdentitasSinkron />
          <PemindaiPrinterOtomatis />
          {children}
          <Toaster position="top-center" />
          <DaftarServiceWorker />
          {import.meta.env.DEV && (
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
              ]}
            />
          )}
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  )
}
