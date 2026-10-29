import { prisma } from '#/db'
import { UKURAN_KERTAS_DEFAULT, ukuranKertasDari } from '#/lib/ukuran-kertas'

import { catatAudit } from './audit.js'
import { hapusAset } from './cloudinary.js'
import { normalisasiBatasDiskon } from './diskon.js'
import { kirimAlertFraud } from './fraudAlert.js'
import {
  KUNCI_PAJAK_RETAIL,
  KUNCI_PAJAK_RESTO,
  normalisasiPersen,
  pilihNilaiPajak,
} from './pajak.js'
import { SetPengaturanSchema } from '#/validations/pengaturan'
import type { Role } from '#/generated/prisma/enums.js'
import type { IdentitasApp } from '#/types/pengaturan'
import type {
  SetPengaturanInput,
  StrukOtomatis,
} from '#/validations/pengaturan'

const strukOtomatisDari = (nilai: string | undefined): StrukOtomatis =>
  nilai === 'cetak' || nilai === 'pdf' ? nilai : 'nonaktif'

// Kunci operasional harian yang boleh diubah kasir. Semua kunci lain
// (pajak, diskon, identitas, mode review, dsb.) hanya owner.
export const KUNCI_PENGATURAN_OPERASIONAL = [
  'toko_aktif',
  'jam_buka',
  'jam_tutup',
] as const

// Ambil seluruh pengaturan sebagai map + nilai yang sudah dipakai UI.
export async function pengaturanData() {
  const rows = await prisma.pengaturan.findMany({ orderBy: { kunci: 'asc' } })
  const peta: Record<string, string | undefined> = {}
  for (const r of rows) peta[r.kunci] = r.nilai
  return {
    modeFnb: peta.mode_fnb === 'true',
    riwayatBelanja: peta.riwayat_belanja_aktif !== 'false',
    namaToko: peta.nama_toko ?? 'POS',
    judulApp: peta.judul_app ?? '',
    logoUrl: peta.logo_url ?? '',
    ikonUrl: peta.ikon_url ?? '',
    strukOtomatis: strukOtomatisDari(peta.struk_otomatis),
    ukuranKertasTermal: ukuranKertasDari(
      peta.ukuran_kertas_termal ?? UKURAN_KERTAS_DEFAULT,
    ).id,
    deskripsiApp: peta.deskripsi_app ?? '',
    // Tarif pajak (%) per mode; dipakai server saat posting & ditampilkan di UI.
    // PB1 untuk mode F&B (restoran/cafe), PPN untuk retail.
    pajakRestoPersen: normalisasiPersen(
      pilihNilaiPajak(peta, KUNCI_PAJAK_RESTO),
    ),
    pajakRetailPersen: normalisasiPersen(
      pilihNilaiPajak(peta, KUNCI_PAJAK_RETAIL),
    ),
    // Batas diskon manual KASIR (SEC-22). OWNER boleh melewati ambang ini,
    // tetapi diskon di atasnya tetap dicatat ke audit log.
    diskonKasirMaksPersen: normalisasiBatasDiskon(
      peta.diskon_kasir_maks_persen,
    ),
    // Jam buka/tutup toko (HH:MM). Kosong = tidak dibatasi jam.
    // `toko_aktif` = false menutup toko sepenuhnya untuk pemesanan.
    jamBuka: peta.jam_buka ?? null,
    jamTutup: peta.jam_tutup ?? null,
    tokoAktif: peta.toko_aktif !== 'false',
    // Kebijakan review transaksi: `kasir` (self-approve) atau `owner`.
    reviewTransaksiMode:
      peta.review_transaksi_mode === 'owner' ? 'owner' : 'kasir',
    semua: peta,
  }
}

// Kebijakan review transaksi saat ini (dipakai guard `reviewTransaksi`).
export async function modeReviewTransaksi(): Promise<'kasir' | 'owner'> {
  const row = await prisma.pengaturan.findUnique({
    where: { kunci: 'review_transaksi_mode' },
    select: { nilai: true },
  })
  return row?.nilai === 'owner' ? 'owner' : 'kasir'
}

// Logo aplikasi bersifat publik (dipakai header, footer, landing, struk).
export async function logoUrl(): Promise<string> {
  const row = await prisma.pengaturan.findUnique({
    where: { kunci: 'logo_url' },
    select: { nilai: true },
  })
  return row?.nilai ?? ''
}

// Identitas publik aplikasi: judul & ikon dipakai head/favicon/manifest,
// header, footer, dan struk. Ikon jatuh ke logo bila owner belum mengisi.
export async function identitasApp(): Promise<IdentitasApp> {
  const rows = await prisma.pengaturan.findMany({
    where: {
      kunci: {
        in: ['judul_app', 'nama_toko', 'ikon_url', 'logo_url', 'deskripsi_app'],
      },
    },
    select: { kunci: true, nilai: true },
  })
  const peta: Record<string, string> = {}
  for (const r of rows) peta[r.kunci] = r.nilai
  const judul = peta.judul_app || peta.nama_toko || 'POS'
  const logo = peta.logo_url || ''
  return {
    judul,
    ikonUrl: peta.ikon_url || logo,
    logoUrl: logo,
    deskripsi: peta.deskripsi_app || '',
  }
}

// Set/perbarui satu pengaturan (upsert). Perubahan pengaturan (mis. tarif
// pajak, mode F&B, nama toko) dicatat ke audit log (AUDIT-02).
export async function setPengaturan(
  input: SetPengaturanInput,
  aktorId?: string,
  aktorPeran?: Role,
) {
  const data = SetPengaturanSchema.parse(input)
  if (
    aktorPeran !== undefined &&
    aktorPeran !== 'OWNER' &&
    !(KUNCI_PENGATURAN_OPERASIONAL as readonly string[]).includes(data.kunci)
  ) {
    throw new Error('FORBIDDEN')
  }
  const lama = await prisma.pengaturan.findUnique({
    where: { kunci: data.kunci },
    select: { nilai: true },
  })
  await prisma.pengaturan.upsert({
    where: { kunci: data.kunci },
    update: { nilai: data.nilai },
    create: { kunci: data.kunci, nilai: data.nilai },
  })
  if (
    (data.kunci === 'logo_url' || data.kunci === 'ikon_url') &&
    lama?.nilai &&
    lama.nilai !== data.nilai &&
    lama.nilai.includes('res.cloudinary.com')
  ) {
    try {
      await hapusAset(lama.nilai)
    } catch {
      // best-effort: logo lama gagal dihapus bukan galat fatal
    }
  }
  if (lama?.nilai !== data.nilai) {
    await catatAudit({
      aktorId,
      aksi: 'pengaturan.ubah',
      entitas: 'Pengaturan',
      entitasId: data.kunci,
      sebelum: { kunci: data.kunci, nilai: lama?.nilai ?? null },
      sesudah: { kunci: data.kunci, nilai: data.nilai },
    })
    // Pajak/diskon/mode review/status toko mengubah perhitungan uang atau
    // alur persetujuan → kirim alert fraud (log + webhook opsional).
    if (
      data.kunci.startsWith('pajak_') ||
      data.kunci.startsWith('diskon_') ||
      data.kunci === 'review_transaksi_mode' ||
      data.kunci === 'toko_aktif'
    ) {
      void kirimAlertFraud({
        jenis: 'pengaturan.sensitif',
        pesan: `Pengaturan sensitif "${data.kunci}" diubah`,
        aktorId,
        entitasId: data.kunci,
        detail: { sebelum: lama?.nilai ?? null, sesudah: data.nilai },
      })
    }
  }
  return { kunci: data.kunci, nilai: data.nilai }
}

// ─── Feature flag via tabel pengaturan ───
// Fitur disimpan sebagai kunci `fitur_<nama> = "true"|"false"`.
// Opsional per-peran: `fitur_<nama>_<peran_lower>` (mis. fitur_promo_kasir),
// yang hadir prioritas lebih tinggi daripada kunci global.
// Tanpa deploy ulang, owner dapat menampilkan/sembunyikan fitur baru.
export const PREFEKSI_FITUR = 'fitur_'

export function kunciFitur(kunci: string): string {
  return `${PREFEKSI_FITUR}${kunci}`
}

export function kunciFiturPeran(kunci: string, peran: Role): string {
  return `${PREFEKSI_FITUR}${kunci}_${peran.toLowerCase()}`
}

// Daftar semua fitur + status aktif/inaktif.
export async function daftarFitur(): Promise<Record<string, boolean>> {
  const rows = await prisma.pengaturan.findMany({
    where: { kunci: { startsWith: PREFEKSI_FITUR } },
    select: { kunci: true, nilai: true },
  })
  const hasil: Record<string, boolean> = {}
  for (const r of rows) {
    const nama = r.kunci.slice(PREFEKSI_FITUR.length)
    hasil[nama] = r.nilai === 'true'
  }
  return hasil
}

// Set/perbarui status fitur (hanya owner). Nilai harus 'true' atau 'false'.
// Opsional `peran` menyimpan kunci per-role.
export async function setFitur(
  input: {
    kunci: string
    nilai: boolean
    peran?: Role
  },
  aktorId?: string,
) {
  const { kunci, nilai, peran } = input
  const kunciDb = peran ? kunciFiturPeran(kunci, peran) : kunciFitur(kunci)
  const lama = await prisma.pengaturan.findUnique({
    where: { kunci: kunciDb },
    select: { nilai: true },
  })
  await prisma.pengaturan.upsert({
    where: { kunci: kunciDb },
    update: { nilai: String(nilai) },
    create: { kunci: kunciDb, nilai: String(nilai) },
  })
  if (lama?.nilai !== String(nilai)) {
    await catatAudit({
      aktorId,
      aksi: 'pengaturan.fitur.ubah',
      entitas: 'Pengaturan',
      entitasId: kunciDb,
      sebelum: { kunci: kunciDb, nilai: lama?.nilai ?? null },
      sesudah: { kunci: kunciDb, nilai: String(nilai) },
    })
  }
  return { kunci: kunciDb, nilai: String(nilai) }
}

// ─── Cek status buka/tutup toko ───
// Mengambil pengaturan jam buka/tutup dan mengecek apakah waktu sekarang
// berada dalam rentang buka. `toko_aktif = false` selalu menutup.
// Jika jam_buka/jam_tutup kosong, toko selalu buat (asalkan toko_aktif).
export const cekTokoBuka = async (): Promise<{
  buka: boolean
  alasan?: string
  jamBuka?: string | null
  jamTutup?: string | null
}> => {
  const rows = await prisma.pengaturan.findMany({
    where: { kunci: { in: ['toko_aktif', 'jam_buka', 'jam_tutup'] } },
    select: { kunci: true, nilai: true },
  })
  const peta: Record<string, string | undefined> = {}
  for (const r of rows) peta[r.kunci] = r.nilai

  const aktif = peta.toko_aktif !== 'false'
  const jamBuka = peta.jam_buka ?? null
  const jamTutup = peta.jam_tutup ?? null

  if (!aktif) {
    return { buka: false, alasan: 'Toko tutup', jamBuka, jamTutup }
  }

  if (!jamBuka && !jamTutup) {
    return { buka: true, jamBuka: null, jamTutup: null }
  }

  const sekarang = new Date()
  const sekarangMenit = sekarang.getHours() * 60 + sekarang.getMinutes()

  const parseJam = (jam: string | null): number | null => {
    if (!jam) return null
    const [h, m] = jam.split(':').map(Number)
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null
    return h * 60 + m
  }

  const bukaMenit = parseJam(jamBuka)
  const tutupMenit = parseJam(jamTutup)

  if (bukaMenit === null || tutupMenit === null) {
    return { buka: true, jamBuka, jamTutup }
  }

  // Jika tutup < buka (mis. 22:00 buka, 02:00 tutup) artinya melewati malam.
  let buka: boolean
  if (tutupMenit <= bukaMenit) {
    // Melewati tengah malam: buka dari jamBuka hingga 23:59, dan 00:00 hingga jamTutup
    buka = sekarangMenit >= bukaMenit || sekarangMenit < tutupMenit
  } else {
    buka = sekarangMenit >= bukaMenit && sekarangMenit < tutupMenit
  }

  return {
    buka,
    alasan: buka ? undefined : 'Di luar jam buka toko',
    jamBuka,
    jamTutup,
  }
}
