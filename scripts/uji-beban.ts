import { spawn, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'

import { prisma } from '../src/db.js'

// Wrapper `bun run test:load`: buat sesi KASIR sementara, jalankan k6, lalu
// hapus sesi. Token tidak pernah ditulis ke disk dan kedaluwarsa 1 jam bila
// proses mati sebelum cleanup.
const BASE_URL = (process.env.BASE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
)

function emailBeban(): string {
  if (process.env.LOAD_EMAIL) return process.env.LOAD_EMAIL
  const kasir = (process.env.KASIR_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  const owner = (process.env.OWNER_EMAILS ?? '')
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  const email = kasir[0] ?? owner[0]
  if (!email) {
    throw new Error(
      'LOAD_EMAIL kosong dan KASIR_EMAILS/OWNER_EMAILS tidak diisi.',
    )
  }
  return email
}

const email = emailBeban()

// Cek k6 sebelum membuat sesi agar tidak ada baris sesi yang tertinggal bila
// biner belum terpasang (di Windows `cmd` membalas exit 1, bukan ENOENT).
const cekK6 = spawnSync('k6', ['version'], {
  shell: process.platform === 'win32',
  stdio: 'ignore',
})
if (cekK6.error || cekK6.status !== 0) {
  console.error(
    'k6 tidak ditemukan. Pasang dari https://k6.io/docs/get-started/installation/ ' +
      'lalu jalankan ulang `bun run test:load`.',
  )
  process.exit(1)
}

const pengguna = await prisma.user.findUnique({
  where: { email },
  select: { id: true, email: true, role: true },
})
if (!pengguna) {
  throw new Error(`Pengguna ${email} tidak ada. Jalankan \`bun run db:seed\`.`)
}

const token = randomBytes(32).toString('hex')
const sekarang = new Date()
const sesi = await prisma.session.create({
  data: {
    id: randomBytes(16).toString('hex'),
    token,
    userId: pengguna.id,
    expiresAt: new Date(sekarang.getTime() + 60 * 60_000),
    createdAt: sekarang,
    updatedAt: sekarang,
    userAgent: 'uji-beban-k6',
  },
  select: { id: true },
})

let kodeKeluar = 1
try {
  console.log(
    `▶ k6 checkout sebagai ${pengguna.email} (${pengguna.role}) → ${BASE_URL}`,
  )
  kodeKeluar = await new Promise<number>((resolve, reject) => {
    const proses = spawn('k6', ['run', 'tests/load/checkout.js'], {
      env: { ...process.env, BASE_URL, TOKEN: token },
      stdio: 'inherit',
      // Windows butuh shell agar `k6` dari PATH (.exe/.cmd) bisa ditemukan.
      shell: process.platform === 'win32',
    })
    proses.on('error', reject)
    proses.on('close', (kode) => resolve(kode ?? 1))
  })
  if (kodeKeluar !== 0) {
    console.error(
      'Uji beban gagal. Pastikan dev server berjalan dan stok produk cukup.',
    )
  }
} catch (e) {
  if (e instanceof Error && /ENOENT|not found/i.test(e.message)) {
    console.error(
      'k6 tidak ditemukan. Pasang dari https://k6.io/docs/get-started/installation/ ' +
        'lalu jalankan ulang `bun run test:load`.',
    )
  } else {
    throw e
  }
} finally {
  await prisma.session.delete({ where: { id: sesi.id } }).catch(() => {})
  await prisma.$disconnect()
}

process.exitCode = kodeKeluar
