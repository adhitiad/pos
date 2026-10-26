import { prisma } from '#/db'

import { bacaTokenMeja } from './mejaToken.js'
import { postingTransaksi, ringkasHasil } from '#/server/transaksi'
import { GalatDomain } from './galat.js'
import { kirimNotifikasi, kirimNotifikasiBanyak } from './notifikasiPesan.js'
import {
  BuatPesananDrafSchema,
  UpdatePesananDrafSchema,
  FinalisasiPesananDrafSchema,
  BatalPesananDrafSchema,
} from '#/validations/pesanan-draf'
import type {
  BuatPesananDrafInput,
  UpdatePesananDrafInput,
  FinalisasiPesananDrafInput,
  BatalPesananDrafInput,
} from '#/validations/pesanan-draf'
import type {
  DraftItemDetail,
  DraftItemJson,
  PesananDrafDetail,
  PesananDrafRingkas,
} from '#/types/pesanan-draf'

export type {
  DraftItemJson,
  PesananDrafDetail,
  PesananDrafRingkas,
} from '#/types/pesanan-draf'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

// ─── Meja Ketersediaan (publik) ───

// Ketersediaan meja untuk halaman pemesanan publik.
// Menunjukkan berapa banyak meja terisi vs tersedia (tanpa data sensitif).
export async function mejaKetersediaan() {
  const semuaMeja = await prisma.meja.findMany({
    where: { aktif: true },
    orderBy: { nomor: 'asc' },
    select: { id: true, nomor: true, nama: true },
  })

  // Meja yang sedang ada pesanan aktif (bukan SELESAI/DIBATALKAN)
  const mejaTerisi = await prisma.meja.findMany({
    where: {
      aktif: true,
      transaksi: {
        some: {
          statusPesanan: { notIn: ['SELESAI', 'DIBATALKAN'] },
        },
      },
    },
    select: { id: true },
  })

  const occupiedIds = new Set(mejaTerisi.map((m) => m.id))

  return {
    total: semuaMeja.length,
    terisi: occupiedIds.size,
    kosong: semuaMeja.length - occupiedIds.size,
    daftar: semuaMeja.map((m) => ({
      id: m.id,
      nomor: m.nomor,
      nama: m.nama,
      tersedia: !occupiedIds.has(m.id),
    })),
  }
}

// ─── Buat Draft Dine-In (publik) ───

// Customer kirim pesanan dine-in → draft untuk review kasir.
// Hanya field aman diterima; stok tidak akan dipotong sampai finalisasi.
export async function buatPesananDraf(
  input: BuatPesananDrafInput,
  opsi?: { memberId?: string },
): Promise<PesananDrafRingkas> {
  const data = BuatPesananDrafSchema.parse(input)

  // Dine-in publik hanya lewat QR bertanda tangan; tabel diturunkan dari token.
  const { mejaId } = bacaTokenMeja(data.mejaToken)

  const meja = await prisma.meja.findUnique({
    where: { id: mejaId },
    select: { id: true, aktif: true, nomor: true, nama: true },
  })
  if (!meja) throw new GalatDomain('Meja tidak ditemukan')
  if (!meja.aktif) throw new GalatDomain('Meja tidak tersedia')

  // Member hanya boleh diturunkan server dari sesi/telepon tepercaya, bukan
  // dari ID kiriman klien publik.
  const memberId = opsi?.memberId
  if (memberId) {
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { id: true },
    })
    if (!member) throw new GalatDomain('Member tidak ditemukan')
  }

  // Ambil harga produk & modifier untuk items (snapshot saat order)
  const itemsDenganHarga = await lookupItemPrices(data.items)
  const subtotal = hitungSubtotal(itemsDenganHarga)

  const draft = await prisma.pesananDraf.create({
    data: {
      mejaId,
      memberId: memberId ?? null,
      nama: data.nama ?? null,
      telepon: data.telepon ?? null,
      catatan: data.catatan ?? null,
      itemsJson: itemsDenganHarga,
      subtotal,
    },
    include: {
      meja: { select: { nomor: true, nama: true } },
      member: { select: { id: true, nama: true, tier: true, poin: true } },
    },
  })

  // Notifikasi ke seluruh kasir & owner
  const petugas = await prisma.user.findMany({
    where: { role: { in: ['OWNER', 'KASIR'] } },
    select: { id: true },
  })
  const itemCount = itemsDenganHarga.reduce((s, i) => s + i.qty, 0)
  await kirimNotifikasiBanyak(
    petugas.map((u) => u.id),
    {
      tipe: 'INFO',
      judul: 'Pesanan dine-in baru',
      pesan: `Pesanan dine-in${
        draft.meja ? ` (meja ${draft.meja.nomor})` : ''
      } ${itemCount} item, Rp${rupiah(subtotal)}.`,
      entitasId: draft.id,
    },
  )

  return ringkasanDraf(draft, itemCount)
}

// ─── Daftar Draft (kasir) ───

// Kasir melihat draft yang masih MENUNGGU (belum final).
export async function daftarPesananDraf(): Promise<PesananDrafRingkas[]> {
  const drafts = await prisma.pesananDraf.findMany({
    where: { status: 'MENUNGGU' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      meja: { select: { nomor: true, nama: true } },
      member: { select: { id: true, nama: true, tier: true, poin: true } },
    },
  })

  return drafts.map((d) => {
    const items = d.itemsJson as Array<Record<string, unknown>>
    const itemCount = items.reduce((s, i) => s + (Number(i.qty) || 0), 0)
    return ringkasanDraf(d, itemCount)
  })
}

// ─── Detail Draft (kasir) ───

// Kasir melihat detail lengkap draft termasuk items.
export async function detailPesananDraf(
  id: string,
): Promise<PesananDrafDetail> {
  const draft = await prisma.pesananDraf.findUnique({
    where: { id },
    include: {
      meja: { select: { nomor: true, nama: true } },
      member: { select: { id: true, nama: true, tier: true, poin: true } },
    },
  })
  if (!draft) throw new GalatDomain('Pesanan draf tidak ditemukan')
  if (draft.status !== 'MENUNGGU')
    throw new GalatDomain('Pesanan draf sudah tidak tersedia untuk review')

  const items = await detailItems(draft.itemsJson)
  const itemCount = items.reduce((s, i) => s + i.qty, 0)

  return {
    ...ringkasanDraf(draft, itemCount),
    items,
  }
}

// ─── Update Draft (kasir — tambah/kurangi item) ───

// Kasir memodifikasi item draft: items baru mengganti items lama.
// Qty 0 = hapus item. Subtotal dihitung ulang.
export async function updatePesananDraf(
  kasirId: string,
  input: UpdatePesananDrafInput,
): Promise<PesananDrafRingkas> {
  const data = UpdatePesananDrafSchema.parse(input)

  const draft = await prisma.pesananDraf.findUnique({
    where: { id: data.id },
    select: {
      id: true,
      status: true,
      mejaId: true,
      memberId: true,
      nama: true,
      telepon: true,
      catatan: true,
      itemsJson: true,
      subtotal: true,
      createdAt: true,
      meja: { select: { nomor: true, nama: true } },
      member: { select: { id: true, nama: true, tier: true, poin: true } },
    },
  })
  if (!draft) throw new GalatDomain('Pesanan draf tidak ditemukan')
  if (draft.status !== 'MENUNGGU')
    throw new GalatDomain('Pesanan draf sudah final atau dibatalkan')

  // Filter qty 0 (hapus item), lookup harga, hitung ulang subtotal
  const itemsBersih = data.items.filter((i) => i.qty > 0)
  const itemsDenganHarga = await lookupItemPrices(itemsBersih)
  const subtotal = hitungSubtotal(itemsDenganHarga)
  const itemCount = itemsDenganHarga.reduce((s, i) => s + i.qty, 0)

  const updated = await prisma.pesananDraf.update({
    where: { id: data.id },
    data: {
      itemsJson: itemsDenganHarga,
      subtotal,
      catatan: data.catatan ?? undefined,
    },
    include: {
      meja: { select: { nomor: true, nama: true } },
      member: { select: { id: true, nama: true, tier: true, poin: true } },
    },
  })

  // Notifikasi ke kasir yang update (jika berbeda)
  if (kasirId) {
    await kirimNotifikasi(kasirId, {
      tipe: 'INFO',
      judul: 'Pesanan dine-in diperbarui',
      pesan: `Draft #${draft.id.slice(0, 8)} diupdate. Subtotal: Rp${rupiah(subtotal)}.`,
      entitasId: draft.id,
    })
  }

  return ringkasanDraf(updated, itemCount)
}

// ─── Finalisasi Draft (kasir → Transaksi POS) ───

// Kasir men-finalisasi draft → buat Transaksi POS penuh via postingTransaksi.
// Stock, jurnal, poin semua diproses atomik di postingTransaksi.
export async function finalisasiPesananDraf(
  kasirId: string,
  input: FinalisasiPesananDrafInput,
) {
  const data = FinalisasiPesananDrafSchema.parse(input)

  const draft = await prisma.pesananDraf.findUnique({
    where: { id: data.id },
    include: {
      meja: { select: { id: true, nomor: true, nama: true } },
      member: { select: { id: true, nama: true, tier: true, poin: true } },
    },
  })
  if (!draft) throw new GalatDomain('Pesanan draf tidak ditemukan')
  if (draft.status !== 'MENUNGGU')
    throw new GalatDomain('Pesanan draf sudah final atau dibatalkan')

  const items = draft.itemsJson as Array<{
    produkId: string
    qty: number
    modifiers?: Array<{
      modifierId: string
      qty: number
      catatan?: string
    }>
  }>

  if (items.length === 0) {
    throw new GalatDomain('Tidak dapat memfinalisasi pesanan kosong')
  }

  // Kasir/owner boleh memilihkan meja (mis. meja tanpa QR). Meja harus aktif;
  // publik tetap tidak punya jalur ini karena route finalisasi ber-guard staf.
  let mejaId = draft.mejaId ?? undefined
  if (data.mejaId) {
    const meja = await prisma.meja.findFirst({
      where: { id: data.mejaId, aktif: true },
      select: { id: true },
    })
    if (!meja) throw new GalatDomain('Meja tidak ditemukan atau tidak aktif')
    mejaId = meja.id
  }

  // Finalisasi: posting sebagai Transaksi POS (kasir final yang jadi kasirId)
  const hasil = await postingTransaksi(
    {
      items,
      memberId: draft.memberId ?? undefined,
      mejaId,
      statusPesanan: 'MENUNGGU',
      metodeBayar: 'TUNAI',
      catatan: draft.catatan || `Dine-in finalisasi oleh kasir`,
    },
    kasirId,
    {
      aktor: { id: kasirId, peran: 'KASIR' },
    },
  )

  // Link draft ke transaksi
  await prisma.pesananDraf.update({
    where: { id: draft.id },
    data: {
      status: 'FINAL',
      finalisasiPada: new Date(),
      transaksiId: hasil.transaksi.id,
      ...(mejaId ? { mejaId } : {}),
    },
  })

  const ringkas = ringkasHasil(hasil)
  return {
    transaksi: ringkas,
    transaksiId: hasil.transaksi.id,
    nomor: ringkas.nomor,
    draftId: draft.id,
  }
}

// ─── Batal Draft (kasir atau owner) ───

export async function batalPesananDraf(
  input: BatalPesananDrafInput,
): Promise<{ id: string; status: string }> {
  const data = BatalPesananDrafSchema.parse(input)

  const draft = await prisma.pesananDraf.findUnique({
    where: { id: data.id },
    select: { id: true, status: true },
  })
  if (!draft) throw new GalatDomain('Pesanan draf tidak ditemukan')
  if (draft.status !== 'MENUNGGU')
    throw new GalatDomain('Hanya draft MENUNGGU yang bisa dibatalkan')

  const updated = await prisma.pesananDraf.update({
    where: { id: data.id },
    data: { status: 'DIBATALKAN' },
  })

  return { id: updated.id, status: updated.status }
}

// ─── Helpers ───

// Lookup harga produk & modifier, kembalikan items dengan harga penuh
async function lookupItemPrices(
  items: Array<{
    produkId: string
    qty: number
    modifiers?: Array<{
      modifierId: string
      qty: number
      catatan?: string
    }>
  }>,
): Promise<DraftItemJson[]> {
  if (items.length === 0) return []

  const produkIds = [...new Set(items.map((i) => i.produkId))]
  const modifierIds = [
    ...new Set(
      items.flatMap((i) => (i.modifiers ?? []).map((m) => m.modifierId)),
    ),
  ]

  const [produk, modifier] = await Promise.all([
    prisma.produk.findMany({
      where: { id: { in: produkIds } },
      select: { id: true, nama: true, harga: true },
    }),
    prisma.modifier.findMany({
      where: { id: { in: modifierIds } },
      select: { id: true, nama: true, hargaTambahan: true },
    }),
  ])

  const petaProduk = new Map(produk.map((p) => [p.id, p]))
  const petaModifier = new Map(modifier.map((m) => [m.id, m]))

  return items.map((item) => {
    const p = petaProduk.get(item.produkId)
    const harga = p?.harga.toNumber() ?? 0
    const mods = (item.modifiers ?? []).map((mod) => {
      const m = petaModifier.get(mod.modifierId)
      return {
        modifierId: mod.modifierId,
        modifierNama: m?.nama ?? '',
        qty: mod.qty,
        catatan: mod.catatan ?? null,
        hargaTambahan: m?.hargaTambahan.toNumber() ?? 0,
      }
    })
    return {
      produkId: item.produkId,
      namaProduk: p?.nama ?? '-',
      harga,
      qty: item.qty,
      modifiers: mods,
    }
  })
}

// Hitung subtotal dari items (pure function, testable)
export function hitungSubtotal(items: DraftItemJson[]): number {
  return items.reduce((total, item) => {
    const modul = item.modifiers.reduce(
      (s, mod) => s + mod.hargaTambahan * mod.qty,
      0,
    )
    return total + item.harga * item.qty + modul
  }, 0)
}

// Bentukkan items JSON menjadi detail lengkap (nama produk & modifier)
async function detailItems(itemsJson: unknown): Promise<DraftItemDetail[]> {
  const items = itemsJson as DraftItemJson[]
  return items.map((item) => ({
    produkId: item.produkId,
    namaProduk: item.namaProduk,
    harga: item.harga,
    qty: item.qty,
    modifiers: item.modifiers,
    subtotal:
      item.harga * item.qty +
      item.modifiers.reduce((s, m) => s + m.hargaTambahan * m.qty, 0),
  }))
}

// Bentuk ringkasan draft untuk klien (Decimal → number, nama relation)
function ringkasanDraf(
  d: {
    id: string
    mejaId: string | null
    memberId: string | null
    nama: string | null
    telepon: string | null
    catatan: string | null
    status: string
    subtotal: { toNumber: () => number }
    createdAt: Date
    meja?: { nomor: string; nama: string | null } | null
    member?: { id: string; nama: string; tier: string; poin: number } | null
  },
  itemCount: number,
): PesananDrafRingkas {
  return {
    id: d.id,
    mejaId: d.mejaId,
    mejaNomor: d.meja?.nomor ?? null,
    memberId: d.memberId,
    memberNama: d.member?.nama ?? null,
    memberTier: d.member?.tier ?? null,
    memberPoin: d.member?.poin ?? null,
    nama: d.nama,
    telepon: d.telepon,
    catatan: d.catatan,
    status: d.status,
    itemCount,
    subtotal: d.subtotal.toNumber(),
    dibuatPada: d.createdAt.toISOString(),
  }
}
