// Service worker hanya untuk produksi: cache aset hasil build + halaman publik
// agar reload saat offline tetap menampilkan aplikasi.
const VERSI = 'pos-v1'
const CACHE_ASET = `${VERSI}-aset`
const CACHE_HALAMAN = `${VERSI}-halaman`
const HALAMAN_PUBLIK = new Set(['/', '/pesanan', '/login'])

try {
  // Daftar aset dibuat saat build oleh plugin Vite (sw-manifest.js).
  importScripts('/sw-manifest.js')
} catch {
  self.__POS_PRECACHE = []
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_ASET)
      const daftar = Array.isArray(self.__POS_PRECACHE)
        ? self.__POS_PRECACHE
        : []
      // addAll gagal total bila satu aset hilang; simpan yang berhasil saja.
      await Promise.allSettled(daftar.map((url) => cache.add(url)))
      try {
        const res = await fetch('/')
        if (res.ok) {
          const halaman = await caches.open(CACHE_HALAMAN)
          await halaman.put('/', res.clone())
        }
      } catch {
        // offline saat instalasi: cache halaman diisi saat kunjungan pertama
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const kunci = await caches.keys()
      await Promise.all(
        kunci
          .filter((nama) => !nama.startsWith(VERSI))
          .map((nama) => caches.delete(nama)),
      )
      await self.clients.claim()
    })(),
  )
})

async function navigasi(req) {
  const cache = await caches.open(CACHE_HALAMAN)
  try {
    const res = await fetch(req)
    if (res.ok) await cache.put(req, res.clone())
    return res
  } catch {
    return (
      (await caches.match(req)) ?? (await caches.match('/')) ?? Response.error()
    )
  }
}

async function aset(req) {
  const cache = await caches.open(CACHE_ASET)
  const tersimpan = await cache.match(req)
  if (tersimpan) return tersimpan
  try {
    const res = await fetch(req)
    if (res.ok) await cache.put(req, res.clone())
    return res
  } catch {
    return Response.error()
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  if (req.mode === 'navigate') {
    if (!HALAMAN_PUBLIK.has(url.pathname)) return
    event.respondWith(navigasi(req))
    return
  }

  if (
    url.pathname.startsWith('/assets/') ||
    url.pathname === '/logo.svg' ||
    url.pathname === '/prisma.svg'
  ) {
    event.respondWith(aset(req))
  }
})
