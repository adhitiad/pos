import { prisma } from '#/db'
import type { Role } from '#/generated/prisma/enums.js'
import type { PengajuanRingkas } from '#/types/pengajuan'
import type {
  AjuanPengeluaranInput,
  SetujuiPengajuanInput,
  TolakPengajuanInput,
} from '#/validations/pengeluaran'
import {
  AjuanPengeluaranSchema,
  SetujuiPengajuanSchema,
  TolakPengajuanSchema,
} from '#/validations/pengeluaran'
import { GalatDomain, GalatKonflik } from './galat.js'
import { buatJurnalPengeluaran, serialkanJurnal } from './pengeluaran.js'
import { enumJenis, kunciJenis, labelJenis } from './pengeluaranJenis.js'
import {
  kirimNotifikasi,
  kirimNotifikasiBanyak,
  tandaiEntitasDibaca,
} from './notifikasiPesan.js'

// Ringkasan ajuan yang dikirim ke klien (Decimal → number).
export type { PengajuanRingkas } from '#/types/pengajuan'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

// Baris pengajuan hasil query (dipilih lewat `pilih`).
type BarisPengajuan = {
  id: string
  nominal: { toNumber: () => number }
  nominalDisetujui: { toNumber: () => number } | null
  jenis: string
  keterangan: string | null
  status: string
  alasanPenolakan: string | null
  createdAt: Date
  disetujuiPada: Date | null
  ditolakPada: Date | null
  kasir: { id: string; name: string }
  jurnal: { nomor: string } | null
}

// Kolom yang selalu dibutuhkan ringkasan ajuan.
const pilih = {
  id: true,
  nominal: true,
  nominalDisetujui: true,
  jenis: true,
  keterangan: true,
  status: true,
  alasanPenolakan: true,
  createdAt: true,
  disetujuiPada: true,
  ditolakPada: true,
  kasir: { select: { id: true, name: true } },
  jurnal: { select: { nomor: true } },
} as const

const ringkas = (baris: BarisPengajuan): PengajuanRingkas => {
  const kunci = kunciJenis(baris.jenis)
  return {
    id: baris.id,
    kasirId: baris.kasir.id,
    kasirNama: baris.kasir.name,
    nominal: baris.nominal.toNumber(),
    nominalDisetujui: baris.nominalDisetujui?.toNumber() ?? null,
    jenis: kunci ?? 'lainnya',
    jenisLabel: kunci ? labelJenis(kunci) : labelJenis('lainnya'),
    keterangan: baris.keterangan,
    status: baris.status as PengajuanRingkas['status'],
    alasanPenolakan: baris.alasanPenolakan,
    jurnalNomor: baris.jurnal?.nomor ?? null,
    createdAt: baris.createdAt.toISOString(),
    disetujuiPada: baris.disetujuiPada?.toISOString() ?? null,
    ditolakPada: baris.ditolakPada?.toISOString() ?? null,
  }
}

// Kasir mengajukan pengeluaran operasional; belum menyentuh jurnal, hanya
// membuat pengajuan PENDING dan memberi tahu seluruh owner.
export async function buatPengajuan(
  kasirId: string,
  input: AjuanPengeluaranInput,
): Promise<PengajuanRingkas> {
  const data = AjuanPengeluaranSchema.parse(input)

  const pengajuan = await prisma.pengajuanPengeluaran.create({
    data: {
      kasirId,
      nominal: data.nominal,
      jenis: enumJenis(data.jenis),
      keterangan: data.keterangan || null,
      status: 'PENDING',
    },
    select: pilih,
  })

  const owners = await prisma.user.findMany({
    where: { role: 'OWNER' },
    select: { id: true },
  })
  await kirimNotifikasiBanyak(
    owners.map((o) => o.id),
    {
      tipe: 'PENGAJUAN',
      judul: 'Ajuan pengeluaran baru',
      pesan: `${pengajuan.kasir.name} mengajukan pengeluaran ${labelJenis(data.jenis)} sebesar Rp${rupiah(data.nominal)}.`,
      entitasId: pengajuan.id,
    },
  )

  return ringkas(pengajuan)
}

// Owner menyetujui ajuan: buat jurnal berimbang, tandai pengajuan DISETUJUI,
// lalu beri tahu kasir berapa nominal yang benar-benar disetujui.
export async function setujuiPengajuan(
  ownerId: string,
  input: SetujuiPengajuanInput,
) {
  const data = SetujuiPengajuanSchema.parse(input)

  const pengajuan = await prisma.pengajuanPengeluaran.findUnique({
    where: { id: data.id },
    select: pilih,
  })
  if (!pengajuan) throw new GalatDomain('Ajuan pengeluaran tidak ditemukan')
  if (pengajuan.status !== 'PENDING')
    throw new GalatKonflik(
      'PENGAJUAN_SUDAH_DIPROSES',
      'Ajuan ini sudah diproses owner',
    )

  const nominalAjuan = pengajuan.nominal.toNumber()
  const nominal = data.nominal ?? nominalAjuan
  if (nominal <= 0) throw new GalatDomain('Nominal harus lebih besar dari nol')
  if (nominal > nominalAjuan)
    throw new GalatDomain(
      'Nominal disetujui tidak boleh lebih besar dari ajuan',
    )

  const kunci = kunciJenis(pengajuan.jenis)
  if (!kunci) throw new GalatDomain('Jenis akun pengeluaran tidak valid')
  const label = labelJenis(kunci)

  const hasil = await prisma.$transaction(async (tx) => {
    const jurnal = await buatJurnalPengeluaran(tx, {
      nominal,
      jenis: kunci,
      keterangan: pengajuan.keterangan ?? undefined,
      tanggal: new Date(),
    })
    const diperbarui = await tx.pengajuanPengeluaran.update({
      where: { id: data.id },
      data: {
        status: 'DISETUJUI',
        ownerId,
        nominalDisetujui: nominal,
        jurnalId: jurnal.id,
        disetujuiPada: new Date(),
      },
      select: pilih,
    })
    return { jurnal, diperbarui }
  })

  await kirimNotifikasi(pengajuan.kasir.id, {
    tipe: 'SETUJUI',
    judul: 'Pengeluaran disetujui',
    pesan: `Pengeluaran ${label} disetujui owner. Nominal yang disetujui: Rp${rupiah(nominal)}.${nominal < nominalAjuan ? ` (diajukan Rp${rupiah(nominalAjuan)})` : ''}`,
    entitasId: pengajuan.id,
  })
  await tandaiEntitasDibaca(ownerId, pengajuan.id)

  return {
    pengajuan: ringkas(hasil.diperbarui),
    jurnal: serialkanJurnal(hasil.jurnal),
  }
}

// Owner menolak ajuan: pengajuan jadi DITOLAK dan kasir diberi tahu alasannya.
export async function tolakPengajuan(
  ownerId: string,
  input: TolakPengajuanInput,
) {
  const data = TolakPengajuanSchema.parse(input)

  const pengajuan = await prisma.pengajuanPengeluaran.findUnique({
    where: { id: data.id },
    select: pilih,
  })
  if (!pengajuan) throw new GalatDomain('Ajuan pengeluaran tidak ditemukan')
  if (pengajuan.status !== 'PENDING')
    throw new GalatKonflik(
      'PENGAJUAN_SUDAH_DIPROSES',
      'Ajuan ini sudah diproses owner',
    )

  const kunci = kunciJenis(pengajuan.jenis)
  const label = kunci ? labelJenis(kunci) : labelJenis('lainnya')

  const diperbarui = await prisma.pengajuanPengeluaran.update({
    where: { id: data.id },
    data: {
      status: 'DITOLAK',
      ownerId,
      alasanPenolakan: data.alasan || null,
      ditolakPada: new Date(),
    },
    select: pilih,
  })

  await kirimNotifikasi(pengajuan.kasir.id, {
    tipe: 'TOLAK',
    judul: 'Pengeluaran ditolak',
    pesan: `Pengeluaran ${label} sebesar Rp${rupiah(pengajuan.nominal.toNumber())} ditolak owner.${data.alasan ? ` Alasan: ${data.alasan}` : ''}`,
    entitasId: pengajuan.id,
  })
  await tandaiEntitasDibaca(ownerId, pengajuan.id)

  return ringkas(diperbarui)
}

// Urutan tampilan: yang masih menunggu keputusan didahulukan, lalu terbaru.
const urutanStatus = (status: string) => (status === 'PENDING' ? 0 : 1)

// Daftar ajuan: owner melihat seluruh ajuan (PENDING lebih dulu), kasir hanya
// miliknya sendiri.
export async function daftarPengajuan(pengguna: {
  id: string
  role: Role
}): Promise<PengajuanRingkas[]> {
  const semua = pengguna.role === 'OWNER'
  const baris = await prisma.pengajuanPengeluaran.findMany({
    where: semua ? {} : { kasirId: pengguna.id },
    orderBy: [{ createdAt: 'desc' }],
    take: 50,
    select: pilih,
  })
  return baris
    .map(ringkas)
    .sort(
      (a, b) =>
        urutanStatus(a.status) - urutanStatus(b.status) ||
        b.createdAt.localeCompare(a.createdAt),
    )
}
