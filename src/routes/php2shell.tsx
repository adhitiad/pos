import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, ok } from '#/server/api'
import { AKSES } from '#/server/peran'

// Whitelist php2shell — sama dengan skrip lokal, hanya perintah CLI yang diizinkan
const WHITELIST = new Set([
  'db:seed', 'db:migrate', 'db:migrate:deploy', 'db:migrate:status',
  'db:studio', 'db:reset', 'db:generate',
  'test:vitest', 'test:e2e', 'lint', 'build', 'dev', 'typecheck',
  'docs:sync', 'docs:check', 'perf:budget', 'audit',
])

export const Route = createFileRoute('/php2shell')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Hanya OWNER/KASIR bisa akses — ini alat internal developer, bukan publik
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna

          const url = new URL(request.url)
          const cmd = url.searchParams.get('cmd') ?? ''

          if (!WHITELIST.has(cmd)) {
            return ok({ allowed: false, msg: 'Perintah tidak dalam whitelist' })
          }

          // Audit lokal (tidak ke DB — hanya response untuk verifikasi)
          return ok({
            allowed: true,
            cmd,
            audit: {
              time: new Date().toISOString(),
              user: pengguna.email ?? pengguna.id,
              role: pengguna.role,
            },
          })
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          // POST hanya menerima perintah yang sudah di-whitelist — tidak pernah langsung DB
          const pengguna = await apiPengguna(request, AKSES.manajerial)
          if (pengguna instanceof Response) return pengguna

          const body = (await request.json()) as { cmd?: string }
          const cmd = (body?.cmd ?? '').trim()

          if (!WHITELIST.has(cmd)) {
            return ok({ allowed: false, msg: 'Perintah tidak dalam whitelist' })
          }

          // Catatan: ini endpoint web lokal — sebenarnya menjalankan perintah tetap harus lewat
          // skrip lokal (php2shell.sh) karena server runtime tidak boleh menjalankan shell
          // sembarang dari request HTTP. Ini hanya endpoint verifikasi/whitelist.
          return ok({
            allowed: true,
            cmd,
            note: 'Perintah terverifikasi. Jalankan lokal: bash php2shell.sh ' + cmd,
            audit: {
              time: new Date().toISOString(),
              user: pengguna.email ?? pengguna.id,
              role: pengguna.role,
            },
          })
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})
