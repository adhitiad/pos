import { createMiddleware } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'

// PENTING: src/start.ts juga di-import di klien (start-client-core). Karena itu
// modul ini TIDAK boleh meng-import env/pino/prisma secara statis — impor
// server-only di dalam handler lewat dynamic import.
type KonteksServer = {
  produksi: boolean
  cspAktif: boolean
  originTepercaya: readonly string[]
}

let konteksServer: Promise<KonteksServer> | undefined

function ambilKonteksServer(): Promise<KonteksServer> {
  konteksServer ??= (async () => {
    const [{ env }, { logger }, { ORIGIN_TEPERCAYA }] = await Promise.all([
      import('#/env'),
      import('#/lib/logger'),
      import('#/lib/origin'),
    ])
    const produksi = process.env.NODE_ENV === 'production'
    // Gate eksplisit: CSP menyala bila ENABLE_CSP=true/1, mati bila false/0;
    // tanpa flag, default menyala di produksi.
    const cspAktif = env.ENABLE_CSP ?? produksi
    if (produksi && !cspAktif) {
      logger.warn(
        { kind: 'keamanan' },
        'CSP dimatikan eksplisit di produksi (ENABLE_CSP=false) — jangan dipakai kecuali darurat.',
      )
    }
    return { produksi, cspAktif, originTepercaya: ORIGIN_TEPERCAYA }
  })()
  return konteksServer
}

// GET/HEAD/OPTIONS tidak mengubah state → tak perlu cek Origin.
const METODE_AMAN = new Set(['GET', 'HEAD', 'OPTIONS'])

// Header CORS untuk klien browser yang origin-nya tepercaya (mis. Expo web /
// react-native-web). Klien native (Expo Android/iOS) tak mengirim Origin,
// jadi tak butuh CORS sama sekali.
function headerCors(origin: string): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization,content-type,x-client,x-idempotency-key',
    'Access-Control-Max-Age': '600',
    Vary: 'Origin',
  }
}

function buatNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  let biner = ''
  for (const byte of bytes) biner += String.fromCharCode(byte)
  return btoa(biner)
}

// Cek Origin eksplisit untuk REST /api/* (OW-14). Klien non-browser (Expo)
// tak mengirim Origin → diizinkan; browser harus cocok dengan daftar tepercaya.
function periksaOrigin(
  request: Request,
  pathname: string,
  originTepercaya: readonly string[],
): Response | null {
  if (!pathname.startsWith('/api/')) return null
  if (METODE_AMAN.has(request.method.toUpperCase())) return null
  const origin = request.headers.get('origin')
  if (!origin || originTepercaya.includes(origin)) return null
  return Response.json(
    {
      ok: false,
      error: { code: 'FORBIDDEN', message: 'Origin tidak diizinkan' },
    },
    {
      status: 403,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Cross-Origin-Opener-Policy': 'same-origin',
        'Cross-Origin-Resource-Policy': 'same-origin',
      },
    },
  )
}

export const cspMiddleware = createMiddleware().server(
  async ({ next, request, pathname }) => {
    const { produksi, cspAktif, originTepercaya } = await ambilKonteksServer()
    const nonce = buatNonce()

    if (cspAktif) {
      const csp = [
        "default-src 'self'",
        `script-src 'nonce-${nonce}' 'strict-dynamic'`,
        // Radix/next-themes menyuntik style inline → 'unsafe-inline' masih perlu.
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        // Hanya gambar lokal + Cloudinary + avatar Google (bukan seluruh https:).
        "img-src 'self' data: blob: https://res.cloudinary.com https://*.googleusercontent.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "connect-src 'self' https://accounts.google.com https://*.googleusercontent.com https://api.cloudinary.com https://res.cloudinary.com",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
      ].join('; ')
      setResponseHeader('Content-Security-Policy', csp)
    }

    setResponseHeader('X-Content-Type-Options', 'nosniff')
    setResponseHeader('X-Frame-Options', 'DENY')
    setResponseHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
    setResponseHeader('Cross-Origin-Opener-Policy', 'same-origin')
    setResponseHeader('Cross-Origin-Resource-Policy', 'same-origin')
    setResponseHeader(
      'Permissions-Policy',
      'geolocation=(), camera=(), microphone=()',
    )
    // Respons API bersifat per-sesi/berubah → jangan di-cache (OW-05).
    if (pathname.startsWith('/api/')) {
      setResponseHeader('Cache-Control', 'no-store')
    }

    // CORS untuk klien browser ber-origin tepercaya (Expo web). Origin tak
    // dikenal → tak dapat header CORS (browser sendiri yang menolak).
    const origin = request.headers.get('origin')
    const originDiizinkan =
      !!origin &&
      originTepercaya.includes(origin) &&
      pathname.startsWith('/api/')
    if (originDiizinkan && origin) {
      for (const [nama, nilai] of Object.entries(headerCors(origin))) {
        setResponseHeader(nama, nilai)
      }
      // CORP 'same-origin' akan memblokir pembacaan lintas-origin.
      setResponseHeader('Cross-Origin-Resource-Policy', 'cross-origin')
      // Preflight: jawab langsung, jangan masuk ke handler route.
      if (request.method.toUpperCase() === 'OPTIONS') {
        return new Response(null, { status: 204 })
      }
    }
    if (produksi) {
      setResponseHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains',
      )
    }

    const ditolak = periksaOrigin(request, pathname, originTepercaya)
    if (ditolak) return ditolak

    return next({ context: { nonce } })
  },
)
