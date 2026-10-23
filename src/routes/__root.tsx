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

  const getDeviceId = (): string => {
    if (typeof document === 'undefined') return ''
    let id = localStorage.getItem('pos_device_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('pos_device_id', id)
    }
    return id
  }

  const detectOS = (): 'mac' | 'windows' | 'android' | 'ios' | 'linux' => {
    if (typeof navigator === 'undefined') return 'windows'
    const ua = navigator.userAgent
    if (/android/i.test(ua)) return 'android'
    if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
    if (/mac/i.test(ua)) return 'mac'
    if (/linux/i.test(ua)) return 'linux'
    return 'windows'
  }

  const detectKlasifikasi = (): 'hp' | 'tablet' | 'laptop' | 'pc' | 'mobil' => {
    if (typeof window === 'undefined') return 'pc'
    const ua = navigator.userAgent
    if (/mobi/i.test(ua)) {
      if (window.innerWidth > 600) return 'tablet'
      return 'hp'
    }
    if (window.innerWidth > 1024) return 'pc'
    return 'laptop'
  }

  const getLokasi = (): string | undefined => {
    if (typeof Intl === 'undefined') return undefined
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone
    } catch {
      return undefined
    }
  }

  useEffect(() => {
    // Metadata analytics diturunkan di server dari sesi/header tepercaya;
    // klien hanya mengirim atribut perangkat yang memang tak terlihat server.
    // Body selalu dikonsumsi (`body.cancel()`) — fetch fire-and-forget yang
    // bodynya tak dibaca membuat koneksi tetap "in-flight" di browser.
    void fetch('/api/v1/kunjungan', { method: 'POST' })
      .then((res) => res.body?.cancel())
      .catch(() => {
        // page visit tracking non-fatal (mis. saat offline)
      })

    void fetch('/api/v1/device-visit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deviceId: getDeviceId(),
        deviceName:
          typeof navigator !== 'undefined' ? navigator.platform : undefined,
        os: detectOS(),
        klasifikasi: detectKlasifikasi(),
        lokasi: getLokasi(),
      }),
    })
      .then((res) => res.body?.cancel())
      .catch(() => {
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
