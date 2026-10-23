import { prisma } from '#/db'

// Notifikasi antar pengguna (kasir ↔ owner) disimpan di DB supaya pengajuan
// tidak hilang saat perangkat kasir berganti. Isi `judul`/`pesan` memakai
// bahasa Indonesia (bahasa kerja operasional) sementara label UI diterjemahkan
// lewat `messages/*.json`.
export type TipeNotifikasi = 'PENGAJUAN' | 'SETUJUI' | 'TOLAK' | 'INFO'

export type PesanNotifikasi = {
  tipe: TipeNotifikasi
  judul: string
  pesan: string
  entitasId?: string | null
}

// Simpan satu notifikasi untuk satu pengguna.
export async function kirimNotifikasi(
  userId: string,
  pesan: PesanNotifikasi,
): Promise<void> {
  if (!userId) return
  await prisma.notifikasi.create({
    data: {
      userId,
      judul: pesan.judul,
      pesan: pesan.pesan,
      tipe: pesan.tipe,
      entitasId: pesan.entitasId ?? null,
    },
  })
}

// Kirim notifikasi ke banyak pengguna sekaligus (mis. seluruh owner).
export async function kirimNotifikasiBanyak(
  userIds: string[],
  pesan: PesanNotifikasi,
): Promise<void> {
  const unik = [...new Set(userIds.filter(Boolean))]
  if (unik.length === 0) return
  await prisma.notifikasi.createMany({
    data: unik.map((userId) => ({
      userId,
      judul: pesan.judul,
      pesan: pesan.pesan,
      tipe: pesan.tipe,
      entitasId: pesan.entitasId ?? null,
    })),
  })
}

// Daftar notifikasi tersimpan milik pengguna (terbaru lebih dulu).
export async function notifikasiTersimpan(userId: string) {
  return await prisma.notifikasi.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
}

// Tandai notifikasi sudah dibaca (dipanggil saat pengguna menandainya di UI).
export async function tandaiNotifikasiDibaca(ids: string[]): Promise<void> {
  const unik = [...new Set(ids.filter(Boolean))]
  if (unik.length === 0) return
  await prisma.notifikasi.updateMany({
    where: { id: { in: unik } },
    data: { dibaca: true },
  })
}

// Tandai semua notifikasi tentang satu entitas (mis. pengajuan yang baru
// diputuskan owner) sebagai sudah dibaca.
export async function tandaiEntitasDibaca(
  userId: string,
  entitasId: string,
): Promise<void> {
  await prisma.notifikasi.updateMany({
    where: { userId, entitasId },
    data: { dibaca: true },
  })
}
