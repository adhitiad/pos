// Uji beban endpoint laporan & buku besar (k6).
//
// Jalankan lewat `bun run test:load` (wrapper uji-beban.ts) atau langsung:
//
//   TOKEN=<session.token> BASE_URL=http://localhost:3000 k6 run tests/load/laporan.js
//
// Token bisa dibuat manual dari tabel `session`. Skrip memuat kasir-data untuk
// menentukan rentang tanggal yang aman (dari data transaksi pertama), lalu
// meminta laporan penjualan + buku besar secara paralel. Tujuannya menguji jalur
// baca berat: agregasi transaksi, jurnal, dan ekspor CSV.
import http from 'k6/http'
import { check, fail } from 'k6'
import { Counter, Trend } from 'k6/metrics'

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const TOKEN = __ENV.TOKEN
const VUS = Number(__ENV.VUS || 6)
const ITERASI = Number(__ENV.ITERASI || 4)

if (!TOKEN) {
  fail('TOKEN wajib diisi (session.token KASIR/OWNER)')
}

const gagalLaporan = new Counter('laporan_gagal')
const durasiLaporan = new Trend('laporan_durasi', true)

export const options = {
  scenarios: {
    laporan: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: ITERASI,
      maxDuration: '3m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2500', 'p(99)<5000'],
    laporan_gagal: ['count==0'],
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
  const data = res.json('data') || {}
  const sekarang = new Date()
  const dariAwalTahun = new Date(sekarang.getFullYear(), 0, 1)
    .toISOString()
    .slice(0, 10)
  const sampai = sekarang.toISOString().slice(0, 10)
  return {
    headers,
    dari: dariAwalTahun,
    sampai,
  }
}

export default function (data) {
  const tag = { name: 'laporan-penjualan' }
  const resPenjualan = http.get(
    `${BASE_URL}/api/v1/laporan-penjualan?dari=${data.dari}&sampai=${data.sampai}&grup=harian`,
    { headers: data.headers, tags },
  )

  durasiLaporan.add(resPenjualan.timings.duration)

  const suksesPenjualan = check(resPenjualan, {
    'laporan penjualan 200': (r) => r.status === 200,
    'laporan penjualan punya data': (r) => Array.isArray(r.json('data')),
  })
  if (!suksesPenjualan) {
    gagalLaporan.add(1)
    if (__ITER === 0 && __VU === 1) {
      console.error(
        `Contoh kegagalan laporan penjualan: HTTP ${resPenjualan.status} — ${resPenjualan.body}`,
      )
    }
  }

  const tagBukuBesar = { name: 'laporan-buku-besar' }
  const resBukuBesar = http.get(
    `${BASE_URL}/api/v1/laporan?dari=${data.dari}&sampai=${data.sampai}`,
    { headers: data.headers, tags: tagBukuBesar },
  )
  durasiLaporan.add(resBukuBesar.timings.duration)

  const suksesBukuBesar = check(resBukuBesar, {
    'laporan buku besar 200': (r) => r.status === 200,
  })
  if (!suksesBukuBesar) {
    gagalLaporan.add(1)
    if (__ITER === 0 && __VU === 1) {
      console.error(
        `Contoh kegagalan buku besar: HTTP ${resBukuBesar.status} — ${resBukuBesar.body}`,
      )
    }
  }
}

export function handleSummary(data) {
  const ringkas = {
    baseUrl: BASE_URL,
    vus: VUS,
    iterasi: ITERASI,
    laporanGagal: data.metrics.laporan_gagal
      ? data.metrics.laporan_gagal.values.count
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
  console.log(`RINGKASAN LAPORAN ${JSON.stringify(ringkas)}`)
  const SUMMARY_PATH = __ENV.SUMMARY_PATH
  if (!SUMMARY_PATH) return {}
  return {
    [SUMMARY_PATH]: JSON.stringify(ringkas, null, 2),
  }
}
