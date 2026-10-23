import { prisma } from '#/db'
import { UKURAN_KERTAS_DEFAULT, ukuranKertasDari } from '#/lib/ukuran-kertas'

import { catatAudit } from './audit.js'
import { hapusAset } from './cloudinary.js'
import { normalisasiBatasDiskon } from './diskon.js'
import {
  KUNCI_PAJAK_RETAIL,
  KUNCI_PAJAK_RESTO,
  normalisasiPersen,
  pilihNilaiPajak,
} from './pajak.js'
import { SetPengaturanSchema } from '#/validations/pengaturan'
import type { IdentitasApp } from '#/types/pengaturan'
import type {
  SetPengaturanInput,
  StrukOtomatis,
} from '#/validations/pengaturan'

const strukOtomatisDari = (nilai: string | undefined): StrukOtomatis =>
  nilai === 'cetak' || nilai === 'pdf' ? nilai : 'nonaktif'

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
    semua: peta,
  }
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
) {
  const data = SetPengaturanSchema.parse(input)
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
  }
  return { kunci: data.kunci, nilai: data.nilai }
}
