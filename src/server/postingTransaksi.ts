import { prisma } from '#/db'
import { Prisma } from '#/generated/prisma/client.js'
import type { PostingTransaksiInput } from '#/validations/transaksi'
import { PostingTransaksiSchema } from '#/validations/transaksi'
import type { ProdukHitung } from '#/types/transaksi'
import { GalatDomain } from './galat.js'
import { RUPIAH_PER_POIN } from './poin.js'
import { kodeHarian, nomorBerikut } from './penomoran.js'
import { KUNCI_PAJAK_SEMUA, tarifPajak } from './pajak.js'
import {
  nilaiDiskonPoin,
  siapkanMember,
  terapkanPoinMember,
} from './postingMember.js'
import { muatReplayByKey } from './transaksiIdempotensi.js'
import {
  AKUN,
  bangunEntriJurnal,
  hitungBaris,
  hitungPajak,
  hitungPembayaran,
  petaHargaModifier,
} from './postingHitung.js'

// ─── Fungsi utama ───
// Membuat transaksi + kurangi stok produk & bahan + tulis jurnal,
// semuanya dalam SATU database transaction.
export async function postingTransaksi(
  input: PostingTransaksiInput,
  kasirId?: string,
) {
  const data = PostingTransaksiSchema.parse(input)

  // Retry dari antrean offline: kalau kunci idempotensi sama sudah pernah
  // terposting, kembalikan transaksi yang sama (tanpa potong stok lagi).
  if (data.idempotencyKey) {
    const replay = await muatReplayByKey(data.idempotencyKey)
    if (replay) return replay
  }

  // Nomor unik harian bisa tabrakan bila 2 kasir posting bersamaan,
  // ulangi seluruh transaction bila kena unique constraint (P2002).
  for (let percobaan = 1; percobaan <= 3; percobaan++) {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Muat produk + resep + bahan + modifier grup
        const ids = [...new Set(data.items.map((i) => i.produkId))]
        const daftarProduk = await tx.produk.findMany({
          where: { id: { in: ids } },
          include: {
            resep: { include: { bahan: true } },
            produkModifierGrup: {
              include: {
                grup: {
                  include: {
                    modifiers: { select: { id: true, hargaTambahan: true } },
                  },
                },
              },
            },
          },
        })
        const petaProduk = new Map<string, ProdukHitung>(
          daftarProduk.map((p) => [p.id, p]),
        )
        const hargaModifier = petaHargaModifier(daftarProduk)

        // 2. Validasi & hitung per item
        const baris = hitungBaris(data.items, petaProduk, hargaModifier)

        // 2b. Kebutuhan stok gabungan per produk & bahan. Item sama yang dipecah
        //     jadi banyak baris digabung dulu, lalu divalidasi terhadap snapshot
        //     (celah oversell OW-09). UPDATE di langkah 5 menjaga tetap atomik.
        const qtyProduk = new Map<string, number>()
        for (const b of baris) {
          qtyProduk.set(b.produkId, (qtyProduk.get(b.produkId) ?? 0) + b.qty)
        }
        const qtyBahan = new Map<string, number>()
        const stokBahan = new Map<string, number>()
        for (const p of daftarProduk) {
          for (const r of p.resep) {
            stokBahan.set(r.bahanId, r.bahan.stok.toNumber())
          }
        }
        for (const b of baris) {
          for (const k of b.kebutuhan) {
            qtyBahan.set(k.bahanId, (qtyBahan.get(k.bahanId) ?? 0) + k.butuh)
          }
        }
        for (const [id, qty] of qtyProduk) {
          if ((petaProduk.get(id)?.stok ?? 0) < qty) {
            throw new GalatDomain('Stok produk tidak mencukupi')
          }
        }
        for (const [id, qty] of qtyBahan) {
          if ((stokBahan.get(id) ?? 0) < qty) {
            throw new GalatDomain('Stok bahan baku tidak mencukupi')
          }
        }

        // 3. Total, diskon, ongkir, member
        const subtotal = baris.reduce((s, b) => s + b.subtotal, 0)
        const hppTotal = baris.reduce((s, b) => s + b.hpp, 0)
        const diskon = Math.min(data.diskon, subtotal)
        let ongkir = 0
        if (data.deliveryId) {
          const kurir = await tx.delivery.findUnique({
            where: { id: data.deliveryId },
          })
          if (!kurir) throw new GalatDomain('Layanan antar tidak ditemukan')
          if (!kurir.aktif)
            throw new GalatDomain('Layanan antar tidak tersedia')
          ongkir = kurir.tarif.toNumber()
        }
        // Meja dalam mode F&B / restoran (opsional; wajib aktif bila diisi)
        if (data.mejaId) {
          const meja = await tx.meja.findUnique({ where: { id: data.mejaId } })
          if (!meja) throw new GalatDomain('Meja tidak ditemukan')
          if (!meja.aktif) throw new GalatDomain('Meja tidak tersedia')
        }
        const member = await siapkanMember(tx, {
          memberId: data.memberId,
          tukarPoin: data.tukarPoin,
          subtotal,
          diskon,
        })
        const poinTerpakai = member.poinTerpakai
        const diskonMember = member.diskonMember
        const diskonPoin = nilaiDiskonPoin(poinTerpakai)
        const diskonTotal = diskon + diskonPoin + diskonMember
        if (diskonTotal > subtotal) {
          throw new GalatDomain('Diskon melebihi subtotal')
        }
        // Pajak dihitung server dari pengaturan (PB1 restoran/cafe vs PPN retail,
        // dipilih dari mode_fnb); nilai `pajak` dari klien diabaikan (OW-10).
        const barisPajak = await tx.pengaturan.findMany({
          where: { kunci: { in: [...KUNCI_PAJAK_SEMUA, 'mode_fnb'] } },
        })
        const petaPajak: Record<string, string | undefined> = {}
        for (const r of barisPajak) petaPajak[r.kunci] = r.nilai
        const tarifAktif = tarifPajak(petaPajak, petaPajak.mode_fnb === 'true')
        const pajak = hitungPajak(
          subtotal - diskon - diskonPoin,
          tarifAktif.persen,
        )

        // BIZ-01: get setting for when to reduce stock
        const stokPengaturan = await tx.pengaturan.findUnique({
          where: { kunci: 'stok_dikurangi_saat' },
        })
        const stokDikurangiSaat = stokPengaturan?.nilai ?? 'order'
        const harusMengurangiStok =
          stokDikurangiSaat === 'order' ||
          (stokDikurangiSaat === 'payment' && data.statusPesanan === 'LUNAS')
        const total = subtotal - diskonTotal + pajak + ongkir
        if (total < 0) {
          throw new GalatDomain('Total transaksi tidak boleh negatif')
        }
        const poinDapat = member.member
          ? Math.floor(total / RUPIAH_PER_POIN)
          : 0

        // 3b. Pembayaran: split (data.pembayaran) atau tunggal (data.metodeBayar).
        const bayar = hitungPembayaran({
          total,
          metodeBayar: data.metodeBayar,
          pembayaran: data.pembayaran,
          uangDiterima: data.uangDiterima,
        })

        // 4. Simpan transaksi + item + baris pembayaran (snapshot nama & harga)
        //    Bila kasir punya shift terbuka, transaksi terikat ke shift itu
        //    (rekap kas kasir; pesanan online tanpa kasir tetap null).
        const shiftTerbuka = kasirId
          ? await tx.shift.findFirst({
              where: { kasirId, waktuTutup: null },
              select: { id: true },
            })
          : null
        const nomor = await nomorBerikut(tx, 'transaksi', kodeHarian('POS'))
        const transaksi = await tx.transaksi.create({
          data: {
            nomor,
            memberId: data.memberId,
            kasirId: kasirId ?? null,
            shiftId: shiftTerbuka?.id ?? null,
            deliveryId: data.deliveryId,
            ongkir,
            subtotal,
            diskon: diskonTotal,
            pajak,
            pajakJenis: pajak > 0 ? tarifAktif.jenis : null,
            total,
            poinPakai: poinTerpakai,
            poinDapat,
            metodeBayar: bayar.metodeUtama,
            mejaId: data.mejaId,
            statusPesanan: data.statusPesanan,
            uangDiterima: bayar.uangDiterimaTotal,
            kembalian: bayar.uangDiterimaTotal != null ? bayar.kembalian : null,
            catatan: data.catatan,
            // Jejak offline & idempotensi: kunci retry, penanda luring, dan
            // waktu saat klien membuat transaksi.
            idempotencyKey: data.idempotencyKey ?? null,
            dibuatOffline: data.dibuatOffline,
            waktuKlien: data.waktuKlien ? new Date(data.waktuKlien) : null,
            // Disimpan agar replay idempoten mengembalikan angka sama persis.
            hpp: hppTotal,
            diskonMember,
            items: {
              create: baris.map((b) => ({
                produkId: b.produkId,
                namaProduk: b.namaProduk,
                harga: b.harga,
                qty: b.qty,
                subtotal: b.subtotal,
                // Modifier disimpan sebagai nested create (bukan loop tulis
                // terpisah) agar satu jalur tulis & hasil create langsung
                // memuat modifier tanpa query ulang.
                modifiers: {
                  create: b.modifiers.map((mod) => ({
                    modifierId: mod.modifierId,
                    qty: mod.qty,
                    catatan: mod.catatan,
                    hargaTambahan: hargaModifier.get(mod.modifierId) ?? 0,
                  })),
                },
              })),
            },
            pembayaran: {
              create: bayar.barisBayar.map((b) => ({
                metode: b.metode,
                jumlah: b.jumlah,
                uangDiterima: b.uangDiterima,
              })),
            },
          },
          include: {
            items: { include: { modifiers: { include: { modifier: true } } } },
            pembayaran: true,
          },
        })

        if (harusMengurangiStok) {
          // 5. Kurangi stok produk & bahan secara atomik (satu query per tabel):
          //    UPDATE bersyarat `stok >= qty` sehingga dua penjualan bersamaan
          //    tidak bisa membuat stok negatif (OW-18). Bila baris terpengaruh
          //    kurang dari yang diminta, batalkan seluruh transaksi.
          if (qtyProduk.size > 0) {
            const nilai = Prisma.join(
              [...qtyProduk].map(
                ([id, qty]) =>
                  Prisma.sql`(${id}::text, ${qty.toString()}::int)`,
              ),
            )
            const terpengaruh = await tx.$executeRaw`
                      UPDATE "Produk" AS p
                      SET "stok" = p."stok" - v.qty
                      FROM (VALUES ${nilai}) AS v(id, qty)
                      WHERE p."id" = v.id AND p."stok" >= v.qty
                    `
            if (terpengaruh !== qtyProduk.size) {
              throw new GalatDomain('Stok produk tidak mencukupi')
            }
          }
          if (qtyBahan.size > 0) {
            const nilai = Prisma.join(
              [...qtyBahan].map(
                ([id, qty]) =>
                  Prisma.sql`(${id}::text, ${qty.toString()}::numeric)`,
              ),
            )
            const terpengaruh = await tx.$executeRaw`
                      UPDATE "Bahan" AS b
                      SET "stok" = b."stok" - v.qty
                      FROM (VALUES ${nilai}) AS v(id, qty)
                      WHERE b."id" = v.id AND b."stok" >= v.qty
                    `
            if (terpengaruh !== qtyBahan.size) {
              throw new GalatDomain('Stok bahan baku tidak mencukupi')
            }
          }
        }
        // 6. Poin member: tukar (kurang) + dapat (tambah) + tier — satu
        //    operasi atomik (lihat postingMember.ts).
        const memberInfo = await terapkanPoinMember(tx, member, total)

        // 7. Jurnal berimbang
        const daftarAkun = await tx.akun.findMany({
          where: { kode: { in: Object.values(AKUN) } },
        })
        const idAkun = new Map(daftarAkun.map((a) => [a.kode, a.id]))
        const entri = bangunEntriJurnal({
          idAkun,
          subtotal,
          diskonTotal,
          ongkir,
          pajak,
          hppTotal,
          total,
        })
        const jurnal = await tx.jurnal.create({
          data: {
            nomor: await nomorBerikut(tx, 'jurnal', kodeHarian('JU')),
            keterangan: `Penjualan ${nomor}`,
            transaksiId: transaksi.id,
            entri: { create: entri },
          },
          include: { entri: { include: { akun: true } } },
        })

        return {
          transaksi,
          jurnal,
          hpp: hppTotal,
          diskonMember,
          memberInfo,
        }
      })
    } catch (e) {
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        // Tabrakan idempotensi: transaksi sama baru saja terposting (retry
        // bersamaan dari antrean offline) → kembalikan yang sudah ada.
        if (data.idempotencyKey) {
          const replay = await muatReplayByKey(data.idempotencyKey)
          if (replay) return replay
        }
        // Tabrakan nomor struk harian → ulangi (maks 3x).
        if (percobaan < 3) continue
      }
      throw e
    }
  }
  throw new Error('Gagal memposting transaksi setelah 3 percobaan')
}
