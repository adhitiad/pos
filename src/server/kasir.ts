import { prisma } from '#/db'
import { normalisasiBatasDiskon, KUNCI_DISKON_KASIR } from './diskon.js'
import { GalatDomain } from './galat.js'
import { KUNCI_PAJAK_SEMUA, tarifPajak } from './pajak.js'
import { FILTER_TRANSAKSI_TERJUAL } from './transaksiTerjual.js'
import { LaporanSchema } from '#/validations/kasir'
import type { LaporanInput } from '#/validations/kasir'

// ─── Data master untuk halaman kasir ───

export async function kasirData(kasirId?: string) {
  const awalHari = new Date()
  awalHari.setHours(0, 0, 0, 0)
  const [
    kategori,
    produk,
    member,
    delivery,
    hariIni,
    transaksiHariIni,
    pajakRow,
    shiftAktif,
  ] = await Promise.all([
    prisma.kategori.findMany({
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true },
    }),
    prisma.produk.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
        sku: true,
        barcode: true,
        gambar: true,
        harga: true,
        stok: true,
        kategoriId: true,
        kategori: { select: { nama: true } },
        resep: {
          select: { jumlah: true, bahan: { select: { hargaSatuan: true } } },
        },
        produkModifierGrup: {
          select: {
            grup: {
              select: {
                id: true,
                nama: true,
                wajib: true,
                min: true,
                max: true,
                modifiers: {
                  where: { aktif: true },
                  orderBy: { nama: 'asc' },
                  select: {
                    id: true,
                    nama: true,
                    hargaTambahan: true,
                    aktif: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.member.findMany({
      orderBy: { nama: 'asc' },
      select: {
        id: true,
        nama: true,
        telepon: true,
        poin: true,
        tier: true,
        diskonPersen: true,
      },
    }),
    prisma.delivery.findMany({
      where: { aktif: true },
      orderBy: { nama: 'asc' },
      select: { id: true, nama: true, tarif: true, estimasi: true },
    }),
    prisma.transaksi.aggregate({
      where: { tanggal: { gte: awalHari }, ...FILTER_TRANSAKSI_TERJUAL },
      _sum: { total: true },
      _count: { id: true },
    }),
    prisma.transaksi.findMany({
      where: { tanggal: { gte: awalHari }, ...FILTER_TRANSAKSI_TERJUAL },
      orderBy: { tanggal: 'desc' },
      take: 50,
      select: {
        id: true,
        nomor: true,
        tanggal: true,
        total: true,
        member: { select: { id: true, nama: true, telepon: true } },
        items: {
          select: {
            id: true,
            produkId: true,
            qty: true,
            harga: true,
            subtotal: true,
            produk: { select: { nama: true } },
          },
        },
      },
    }),
    prisma.pengaturan.findMany({
      where: {
        kunci: { in: [...KUNCI_PAJAK_SEMUA, 'mode_fnb', KUNCI_DISKON_KASIR] },
      },
    }),
    kasirId
      ? prisma.shift.findFirst({
          where: { kasirId, waktuTutup: null },
          select: { id: true, kasAwal: true, waktuBuka: true },
        })
      : Promise.resolve(null),
  ])
  const petaPajak: Record<string, string | undefined> = {}
  for (const r of pajakRow) petaPajak[r.kunci] = r.nilai
  const pajakAktif = tarifPajak(petaPajak, petaPajak.mode_fnb === 'true')
  const pajakPersen = pajakAktif.persen
  const pajakJenis = pajakAktif.jenis
  const diskonKasirMaksPersen = normalisasiBatasDiskon(
    petaPajak[KUNCI_DISKON_KASIR],
  )
  const cogsPerProduk = new Map<string, number>()
  for (const p of produk) {
    let cogs = 0
    for (const r of p.resep) {
      cogs += Number(r.jumlah) * Number(r.bahan.hargaSatuan.toNumber())
    }
    cogsPerProduk.set(p.id, cogs)
  }

  let kotor = 0
  for (const t of transaksiHariIni) {
    for (const i of t.items) {
      const cogs = cogsPerProduk.get(i.produkId ?? '') ?? 0
      kotor += (i.harga.toNumber() - cogs) * i.qty
    }
  }
  const bersih = kotor // biaya operasional belum tercatat
  return {
    pajakPersen,
    pajakJenis,
    diskonKasirMaksPersen,
    shiftAktif: shiftAktif
      ? {
          id: shiftAktif.id,
          kasAwal: shiftAktif.kasAwal.toNumber(),
          waktuBuka: shiftAktif.waktuBuka.toISOString(),
        }
      : null,
    bolehBayar: !!shiftAktif,
    kategori: kategori.map((k) => ({ id: k.id, nama: k.nama })),
    produk: produk.map((p) => ({
      id: p.id,
      nama: p.nama,
      sku: p.sku,
      barcode: p.barcode,
      gambar: p.gambar,
      harga: p.harga.toNumber(),
      stok: p.stok,
      kategoriId: p.kategoriId,
      kategoriNama: p.kategori?.nama ?? null,
      modifierGrup: p.produkModifierGrup.map((pg) => ({
        id: pg.grup.id,
        nama: pg.grup.nama,
        wajib: pg.grup.wajib,
        min: pg.grup.min,
        max: pg.grup.max,
        modifiers: pg.grup.modifiers.map((m) => ({
          id: m.id,
          nama: m.nama,
          hargaTambahan: m.hargaTambahan.toNumber(),
          aktif: m.aktif,
        })),
      })),
    })),
    member: member.map((m) => ({
      id: m.id,
      nama: m.nama,
      telepon: m.telepon,
      poin: m.poin,
      tier: m.tier,
      diskonPersen: m.diskonPersen?.toNumber() ?? null,
    })),
    delivery: delivery.map((d) => ({
      id: d.id,
      nama: d.nama,
      tarif: d.tarif.toNumber(),
      estimasi: d.estimasi,
    })),
    penjualanHariIni: {
      total: hariIni._sum.total?.toNumber() ?? 0,
      jumlah: hariIni._count.id,
    },
    keuntunganHariIni: {
      kotor,
      bersih,
    },
    transaksiHariIni: transaksiHariIni.map((t) => ({
      id: t.id,
      nomor: t.nomor,
      tanggal: t.tanggal.toISOString(),
      total: t.total.toNumber(),
      member: t.member
        ? { id: t.member.id, nama: t.member.nama, telepon: t.member.telepon }
        : null,
      items: t.items.map((i) => ({
        id: i.id,
        produkId: i.produkId,
        produkNama: i.produk?.nama ?? '-',
        qty: i.qty,
        harga: i.harga.toNumber(),
        subtotal: i.subtotal.toNumber(),
      })),
    })),
  }
}

// ─── Laporan buku besar ───

export async function laporanBukuBesar(input: LaporanInput) {
  const data = LaporanSchema.parse(input)
  const awal = new Date(`${data.dari}T00:00:00`)
  const akhir = new Date(`${data.sampai}T23:59:59.999`)
  if (akhir < awal) throw new GalatDomain('Rentang tanggal tidak valid')

  const akun = await prisma.akun.findMany({
    orderBy: { kode: 'asc' },
    select: { id: true, kode: true, nama: true, tipe: true },
  })
  const filterAkun = data.akunId ? { akunId: data.akunId } : {}

  // Saldo awal per akun (sebelum periode)
  const pembuka = await prisma.jurnalDetail.groupBy({
    by: ['akunId'],
    where: { jurnal: { tanggal: { lt: awal } }, ...filterAkun },
    _sum: { debit: true, kredit: true },
  })

  // Mutasi periode
  const entri = await prisma.jurnalDetail.findMany({
    where: { jurnal: { tanggal: { gte: awal, lte: akhir } }, ...filterAkun },
    select: {
      id: true,
      akunId: true,
      debit: true,
      kredit: true,
      jurnal: { select: { nomor: true, tanggal: true, keterangan: true } },
      akun: { select: { kode: true, nama: true, tipe: true } },
    },
    orderBy: [{ jurnal: { tanggal: 'asc' } }, { jurnal: { nomor: 'asc' } }],
  })

  // Neraca saldo (total mutasi periode per akun)
  const trial = await prisma.jurnalDetail.groupBy({
    by: ['akunId'],
    where: { jurnal: { tanggal: { gte: awal, lte: akhir } }, ...filterAkun },
    _sum: { debit: true, kredit: true },
  })

  const infoAkun = new Map(akun.map((a) => [a.id, a]))
  return {
    akun: akun.map((a) => ({
      id: a.id,
      kode: a.kode,
      nama: a.nama,
      tipe: a.tipe,
    })),
    pembuka: pembuka.map((p) => ({
      akunId: p.akunId,
      debit: p._sum.debit?.toNumber() ?? 0,
      kredit: p._sum.kredit?.toNumber() ?? 0,
    })),
    entri: entri.map((e) => ({
      id: e.id,
      tanggal: e.jurnal.tanggal.toISOString(),
      jurnalNomor: e.jurnal.nomor,
      keterangan: e.jurnal.keterangan,
      akunId: e.akunId,
      kode: e.akun.kode,
      nama: e.akun.nama,
      tipe: e.akun.tipe,
      debit: e.debit.toNumber(),
      kredit: e.kredit.toNumber(),
    })),
    trial: trial.map((t) => ({
      akunId: t.akunId,
      kode: infoAkun.get(t.akunId)?.kode ?? '',
      nama: infoAkun.get(t.akunId)?.nama ?? '',
      tipe: infoAkun.get(t.akunId)?.tipe ?? '',
      debit: t._sum.debit?.toNumber() ?? 0,
      kredit: t._sum.kredit?.toNumber() ?? 0,
    })),
  }
}
