import { createFileRoute } from '@tanstack/react-router'

import { apiError, apiPengguna, bacaJsonTerbatas, ok } from '#/server/api'
import { AKSES } from '#/server/peran'
import { rateLimit, rateLimitKunci } from '#/server/rateLimit'
import { memberDariTelepon } from '#/server/member'
import { buatPesananDraf, daftarPesananDraf } from '#/server/pesananDraf'
import { BuatPesananDrafSchema } from '#/validations/pesanan-draf'

// Public: buat pesanan dine-in draft (customer kirim ke kasir review)
// Kasir: lihat daftar draft yang menunggu
export const Route = createFileRoute('/api/v1/pesan-dinein')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          // Kasir melihat daftar draft
          const pengguna = await apiPengguna(request, AKSES.operasional)
          if (pengguna instanceof Response) return pengguna
          const rl = await rateLimit(request, 100)
          if (rl) return rl
          return ok(await daftarPesananDraf())
        } catch (e) {
          return apiError(e)
        }
      },
      POST: async ({ request }) => {
        try {
          // Publik: customer buat draft dine-in
          const rl = await rateLimit(request, 10)
          if (rl) return rl
          const body = await bacaJsonTerbatas(request, 256 * 1024)
          const data = BuatPesananDrafSchema.parse(body)

          // Batasi per nomor telepon juga, agar satu nomor tidak bisa
          // membanjiri antrean walau berganti IP.
          if (data.telepon) {
            const rlTelp = await rateLimitKunci(
              `pesan-dinein:telp:${data.telepon}`,
              5,
              60_000,
            )
            if (rlTelp) return rlTelp
          }

          // Cari member via telepon bila ada. ID member dari body diabaikan
          // sepenuhnya (schema publik tidak memuat memberId).
          const member = data.telepon
            ? await memberDariTelepon(data.telepon)
            : null

          const hasil = await buatPesananDraf(data, {
            memberId: member?.id,
          })

          // Respons publik tidak boleh membocorkan identitas/poin member.
          return ok(
            {
              id: hasil.id,
              mejaId: hasil.mejaId,
              mejaNomor: hasil.mejaNomor,
              nama: hasil.nama,
              telepon: hasil.telepon,
              catatan: hasil.catatan,
              status: hasil.status,
              itemCount: hasil.itemCount,
              subtotal: hasil.subtotal,
              dibuatPada: hasil.dibuatPada,
            },
            201,
          )
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})
