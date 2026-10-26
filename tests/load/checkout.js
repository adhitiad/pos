// Uji beban checkout bersamaan (k6).
//
// Jalankan lewat `bun run test:load` — wrapper itu membuat sesi KASIR
// sementara di database, menjalankan k6, lalu menghapus sesinya lagi.
// Skrip ini juga bisa dipakai langsung:
//
//   TOKEN=<session.token> BASE_URL=http://localhost:3000 k6 run tests/load/checkout.js
//
// Token bisa dibuat manual dari tabel `session` (lihat docs/PERFORMA.md).
// Skrip memilih otomatis produk tanpa modifier yang stoknya cukup, lalu
// memposting transaksi TUNAI qty 1 secara paralel. Tujuannya menguji jalur
// kritis: penomoran harian atomik, potong stok, jurnal, dan pembayaran.
import http from 'k6/http'
import { check, fail } from 'k6'
import { Counter, Trend } from 'k6/metrics'

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const TOKEN = __ENV.TOKEN
const VUS = Number(__ENV.VUS || 10)
const ITERASI = Number(__ENV.ITERASI || 5)
const STOK_MIN = Number(__ENV.STOK_MIN || 200)
const SUMMARY_PATH = __ENV.SUMMARY_PATH

if (!TOKEN) {
  fail('TOKEN wajib diisi (session.token KASIR/OWNER)')
}

const gagalCheckout = new Counter('checkout_gagal')
const durasiCheckout = new Trend('checkout_durasi', true)

export const options = {
  scenarios: {
    checkout: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: ITERASI,
      maxDuration: '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500', 'p(99)<3000'],
    checkout_gagal: ['count==0'],
  },
}

export function setup() {
  const headers = {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  }
  const res = http.get(`${BASE_URL}/api/v1/kasir-data`, { headers })
  if (res.status !== 200) {
    fail(`Gagal memuat kasir-data (HTTP ${res.status}): ${res.body}`)
  }
  const produk = (res.json('data.produk') || []).filter(
    (p) => Array.isArray(p.modifierGrup) && p.modifierGrup.length === 0,
  )
  const dipilih = produk
    .filter((p) => Number(p.stok) >= STOK_MIN)
    .sort((a, b) => Number(b.stok) - Number(a.stok))[0]
  if (!dipilih) {
    fail(
      `Tidak ada produk tanpa modifier dengan stok >= ${STOK_MIN}. ` +
        'Seed ulang database atau turunkan STOK_MIN/VUS/ITERASI.',
    )
  }
  return {
    produkId: dipilih.id,
    produkNama: dipilih.nama,
    stokAwal: Number(dipilih.stok),
    headers,
  }
}

export default function (data) {
  const kunci = `k6-${__VU}-${__ITER}-${Date.now()}`
  const body = JSON.stringify({
    items: [{ produkId: data.produkId, qty: 1 }],
    metodeBayar: 'TUNAI',
    // Cukup untuk menutup total + pajak; server menghitung ulang.
    uangDiterima: 999_999_999,
    idempotencyKey: kunci,
  })

  const res = http.post(`${BASE_URL}/api/v1/transaksi`, body, {
    headers: data.headers,
    tags: { name: 'checkout' },
  })

  durasiCheckout.add(res.timings.duration)
  const sukses = check(res, {
    'checkout 201': (r) => r.status === 201,
    'punya nomor transaksi': (r) => Boolean(r.json('data.nomor')),
  })
  if (!sukses) {
    gagalCheckout.add(1)
    if (__ITER === 0 && __VU === 1) {
      console.error(`Contoh kegagalan: HTTP ${res.status} — ${res.body}`)
    }
  }
}

export function handleSummary(data) {
  const ringkas = {
    baseUrl: BASE_URL,
    vus: VUS,
    iterasi: ITERASI,
    checkoutGagal: data.metrics.checkout_gagal
      ? data.metrics.checkout_gagal.values.count
      : 0,
    httpReqFailed: data.metrics.http_req_failed
      ? data.metrics.http_req_failed.values.rate
      : null,
    p95Ms: data.metrics.http_req_duration
      ? data.metrics.http_req_duration.values['p(95)']
      : null,
    p99Ms: data.metrics.http_req_duration
      ? data.metrics.http_req_duration.values['p(99)']
      : null,
  }
  console.log(`RINGKASAN ${JSON.stringify(ringkas)}`)
  if (!SUMMARY_PATH) return {}
  return {
    [SUMMARY_PATH]: JSON.stringify(ringkas, null, 2),
  }
}
