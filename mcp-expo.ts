#!/usr/bin/env bun
/**
 * MCP Server — Integrasi POS ke Expo Mobile.
 *
 * Menyediakan akses baca ke dokumen penting + barriers (guardrails keamanan)
 * yang wajib dipatuhi aplikasi Expo (React Native) saat berkomunikasi
 * dengan backend POS.
 *
 * Dokumen yang diekspor:
 *   - docs/API.md            → kontrak REST resmi web & Expo
 *   - docs/README.md         → indeks dokumentasi
 *   - docs/EXPO.md           → panduan integrasi mobile (Expo)
 *   - docs/PRD-AI.md         → kontrak kerja agen/LLM + invariant teknis
 *   - docs/OPERASIONAL.md    → checklist operasional produksi
 *
 * Barriers (diekspor sebagai satu paket):
 *   - Peran & akses (OWNER / KASIR / MEMBER)
 *   - Autentikasi (web cookie vs native bearer token)
 *   - Rate limit
 *   - Pembatasan mobile (tanpa akses Prisma langsung, tanpa perhitungan uang di klien)
 *   - Offline / idempotensi
 *   - Printer perangkat
 *
 * Dijalankan dengan Bun:
 *   bun run E:/code/pos/mcp-expo.ts
 *
 * Protokol: MCP over stdio (JSON-RPC 2.0)
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { createInterface } from 'node:readline'

const ROOT = import.meta.dirname
const DOCS = join(ROOT, 'docs')

const DOC_PATHS = {
  api: join(DOCS, 'API.md'),
  readme: join(DOCS, 'README.md'),
  expo: join(DOCS, 'EXPO.md'),
  prdAi: join(DOCS, 'PRD-AI.md'),
  operasional: join(DOCS, 'OPERASIONAL.md'),
} as const

type DocKey = keyof typeof DOC_PATHS

function readDoc(key: DocKey): string {
  const p = DOC_PATHS[key]
  if (!existsSync(p)) return `[File tidak ditemukan: ${p}]`
  return readFileSync(p, 'utf-8')
}

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id: number | string | null
  method: string
  params?: Record<string, unknown>
}

function send(id: number | string | null, result: unknown): void {
  const msg = JSON.stringify({ jsonrpc: '2.0', id, result })
  process.stdout.write(
    `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`,
  )
}

function sendError(
  id: number | string | null,
  code: number,
  message: string,
): void {
  const msg = JSON.stringify({
    jsonrpc: '2.0',
    id,
    error: { code, message },
  })
  process.stdout.write(
    `Content-Length: ${Buffer.byteLength(msg)}\r\n\r\n${msg}`,
  )
}

// ──────────────────────────────────────────────────────────────
// BARRIERS / GUARDRAILS untuk Expo Mobile
// ──────────────────────────────────────────────────────────────

const BARRIERS = `
# BARRIERS — Guardrails Integrasi Expo Mobile (POS)

## 1. Peran & Akses (diambil dari docs/API.md + PRD-AI.md)
Peran user: OWNER | KASIR | MEMBER. User baru = MEMBER, kecuali email di
OWNER_EMAILS → OWNER. Naik pangkat hanya via Prisma Studio.

| Peran | Boleh | Tidak boleh |
|-------|-------|-------------|
| OWNER | Semua master data (produk, kategori, bahan, supplier, member, meja, modifier, pengaturan), transaksi, shift, retur, opname, laporan, unggah, notifikasi | — |
| KASIR | kasir-data, transaksi, meja (baca), pengaturan (baca), shift, retur, opname, pesan, saya, notifikasi | Master data tulis (produk/kategori/bahan/supplier/member/setting) |
| MEMBER | saya (profil), pesanan online publik, notifikasi pribadi | Semua mutasi kasir & master data toko |

Guard wajib: requireOwner / requireKasir di src/server/*.ts. REST route hanya
guard → validasi → fungsi murni → envelope. Jangan buat matriks peran baru di route.

## 2. Autentikasi (web vs native)
- Web: hanya cookie httpOnly via Better Auth. Respons web TIDAK boleh memuat bearer token.
  Jalur /sign-in/social dengan idToken Publik diblokir.
- Expo / native: pakai POST /api/v1/auth-native (Google native idToken).
  Dapatkan session.token → simpan di expo-secure-store (BUKAN AsyncStorage).
  Setiap request kirim header: Authorization: Bearer <token>.
  Header x-client bukan security boundary dan tidak dipakai.
- session.token disembunyikan dari /api/auth/get-session dan /api/auth/list-sessions.

## 3. Rate Limit
- Default: 100 token/menit per IP+endpoint, bucket idle 30 menit.
- Endpoint sensitif lebih kecil: auth-native 5/menit, pesan 10/menit,
  app-icon 60/menit. Balas 429 + Retry-After.
- Printer/percetakan dibatasi per user: GET 60/menit, mutasi 20/menit.
- Batas body: pesan/transaksi 256 KB, device-visit/webhook 16 KB; lebih → 413.

## 4. Pembatasan Mobile (wajib)
- Expo DILARANG mengakses Prisma atau DB langsung.
- Expo DILARANG meniru perhitungan server (harga, pajak, diskon, total).
  Semua uang dihitung server. Klien tidak boleh mengirim nominal akhir.
- Uang = integer rupiah di semua DTO. ID = cuid().
- Error DB mentah tidak boleh ke klien; kirim pesan aman + ref log.
- Semua respons envelope: { ok: true, data } atau { ok: false, error: { code, message } }.

## 5. Offline / Idempotensi
- Transaksi simpan idempotencyKey unik. Retry dari antrean luring tidak
  membuat transaksi ganda.
- Klien wajib menyertakan idempotencyKey + dibuatOffline + waktuKlien
  (±24 jam dari jam server) saat kirim ulang antrean offline.

## 6. Printer Perangkat
- Endpoint printer/percetakan dibatasi per user. Metadata perangkat (vendorId,
  vendorName, serialNumber, productName) bersifat informatif, BUKAN bukti
  identitas/otorisasi. Jangan gunakan untuk keputusan akses.
- Maks 20 perangkat per pengguna (409 LIMIT_PERANGKAT).
- Default printer per akun; default user lain tidak berubah.

## 7. Error Handling
- Kode error: UNAUTHORIZED (401), FORBIDDEN (403), BAD_REQUEST (400),
  DOMAIN (422), TOO_MANY_REQUESTS (429), INTERNAL (500).
- Pesan error server sudah aman (Bahasa Indonesia). Tampilkan apa adanya.

## 8. Invariant Domain (PRD-AI.md)
- Transaksi posting harus atomik (stok, jurnal, nomor struk, audit tidak terpisah).
- Setiap transaksi uang menghasilkan jurnal seimbang. Jangan tulis jurnal dari klien.
- Kurangi stok lewat operasi teragregasi/atomik; cegah oversell.
- Pesanan online tidak memotong stok/poin/jurnal sampai dibayarPada diisi.
- Single-tenant: satu toko per deployment, tidak ada tokoId.

## 9. Migrasi & Deploy
- Produksi hanya bun run db:migrate:deploy. db:push / db:seed dilarang produksi.
- Jangan commit .env* selain .env.example.
- Gate: tsc --noEmit, lint, check, docs:check, test:vitest, test:e2e, build, perf:budget.
`

const TOOLS = [
  {
    name: 'expo_api_docs',
    description:
      'Baca dokumen kontrak API resmi (docs/API.md) untuk web & Expo.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'expo_readme',
    description: 'Baca indeks dokumentasi (docs/README.md).',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'expo_expo_docs',
    description: 'Baca panduan integrasi Expo/mobile (docs/EXPO.md).',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'expo_prd_ai',
    description:
      'Baca kontrak kerja agen/LLM + invariant teknis (docs/PRD-AI.md).',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'expo_operasional',
    description: 'Baca checklist operasional produksi (docs/OPERASIONAL.md).',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'expo_barriers',
    description:
      'Baca barriers / guardrails keamanan yang wajib dipatuhi aplikasi Expo saat terintegrasi dengan backend POS.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
  {
    name: 'expo_all_docs',
    description:
      'Baca seluruh dokumen (API, README, EXPO, PRD-AI, OPERASIONAL) dalam satu respons.',
    inputSchema: { type: 'object' as const, properties: {} },
  },
]

function handleToolCall(
  name: string,
  _args: Record<string, unknown>,
): { content: Array<{ type: string; text: string }> } {
  let text: string

  switch (name) {
    case 'expo_api_docs':
      text = readDoc('api')
      break
    case 'expo_readme':
      text = readDoc('readme')
      break
    case 'expo_expo_docs':
      text = readDoc('expo')
      break
    case 'expo_prd_ai':
      text = readDoc('prdAi')
      break
    case 'expo_operasional':
      text = readDoc('operasional')
      break
    case 'expo_barriers':
      text = BARRIERS
      break
    case 'expo_all_docs': {
      const parts = [
        `========== docs/API.md ==========\n${readDoc('api')}`,
        `========== docs/README.md ==========\n${readDoc('readme')}`,
        `========== docs/EXPO.md ==========\n${readDoc('expo')}`,
        `========== docs/PRD-AI.md ==========\n${readDoc('prdAi')}`,
        `========== docs/OPERASIONAL.md ==========\n${readDoc('operasional')}`,
        `========== BARRIERS (Guardrails Expo) ==========\n${BARRIERS}`,
      ]
      text = parts.join('\n\n')
      break
    }
    default:
      text = `[Tool tidak dikenal: ${name}]`
  }

  return { content: [{ type: 'text', text }] }
}

function handleRequest(req: JsonRpcRequest): void {
  switch (req.method) {
    case 'initialize':
      send(req.id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'pos-expo-integration',
          version: '1.0.0',
        },
      })
      break

    case 'notifications/initialized':
      break

    case 'tools/list':
      send(req.id, { tools: TOOLS })
      break

    case 'tools/call': {
      const params = req.params as {
        name: string
        arguments?: Record<string, unknown>
      }
      const result = handleToolCall(params.name, params.arguments ?? {})
      send(req.id, result)
      break
    }

    default:
      sendError(req.id, -32601, `Method tidak dikenal: ${req.method}`)
  }
}

// ─── Baca JSON-RPC via stdin (MCP over stdio) ───

let buffer = ''

const rl = createInterface({ input: process.stdin })
rl.on('line', (line) => {
  buffer += line

  if (line.trim() === '') {
    return
  }

  try {
    const parsed = JSON.parse(buffer.trim()) as JsonRpcRequest
    buffer = ''
    handleRequest(parsed)
  } catch {
    // Belum lengkap, tunggu baris berikutnya
  }
})

process.stderr.write('[pos-expo-integration MCP] Server siap.\n')
