import { GalatDomain } from './galat.js'
import type {
  BarisBayar,
  BarisHitung,
  EntriJurnal,
  HasilPembayaran,
  ItemHitung,
  MetodeBayar,
  PembayaranMasuk,
  ProdukHitung,
} from '#/types/transaksi'

// Kode akun di Chart of Accounts (lihat prisma/seed.ts)
export const AKUN = {
  kas: '1100',
  persediaanBahan: '1200',
  pajakKeluaran: '2100',
  pendapatanPenjualan: '4100',
  pendapatanAntar: '4200',
  hpp: '5100',
} as const

// Tegakkan aturan modifier grup di server: modifier harus milik produk itu,
// jumlah per grup tidak boleh melebihi `max`, dan grup `wajib`/`min` harus
// terpenuhi (`min` efektif = max(min, 1) bila `wajib`). OW-12.
function validasiModifier(item: ItemHitung, produk: ProdukHitung) {
  const grupProduk = new Map(
    produk.produkModifierGrup.map((pg) => [pg.grup.id, pg.grup]),
  )
  const modifierKeGrup = new Map<string, string>()
  for (const pg of produk.produkModifierGrup) {
    for (const m of pg.grup.modifiers) modifierKeGrup.set(m.id, pg.grup.id)
  }
  const terpilih = new Map<string, number>()
  for (const mod of item.modifiers ?? []) {
    const grupId = modifierKeGrup.get(mod.modifierId)
    if (!grupId) throw new GalatDomain('Modifier tidak sesuai produk')
    terpilih.set(grupId, (terpilih.get(grupId) ?? 0) + mod.qty)
  }
  for (const [grupId, jumlah] of terpilih) {
    const grup = grupProduk.get(grupId)!
    if (jumlah > grup.max) {
      throw new GalatDomain(`Modifier ${grup.nama} maksimal ${grup.max}`)
    }
  }
  for (const pg of produk.produkModifierGrup) {
    const minimal = pg.grup.wajib ? Math.max(1, pg.grup.min) : pg.grup.min
    if ((terpilih.get(pg.grup.id) ?? 0) < minimal) {
      throw new GalatDomain(`Modifier ${pg.grup.nama} minimal ${minimal}`)
    }
  }
}

// Peta modifierId → hargaTambahan dari seluruh modifier grup produk.
export function petaHargaModifier(daftarProduk: ProdukHitung[]) {
  const hargaModifier = new Map<string, number>()
  for (const p of daftarProduk) {
    for (const pg of p.produkModifierGrup) {
      for (const m of pg.grup.modifiers) {
        hargaModifier.set(m.id, m.hargaTambahan.toNumber())
      }
    }
  }
  return hargaModifier
}

// Validasi & hitung tiap baris item: subtotal (harga + modifier) dan
// HPP dari resep (qty × Σ(jumlah bahan × harga satuan)).
export function hitungBaris(
  items: ItemHitung[],
  petaProduk: Map<string, ProdukHitung>,
  hargaModifier: Map<string, number>,
): BarisHitung[] {
  return items.map((item) => {
    const produk = petaProduk.get(item.produkId)
    if (!produk) throw new GalatDomain('Produk tidak ditemukan')
    if (!produk.aktif) throw new GalatDomain('Produk tidak tersedia')
    if (produk.stok < item.qty) {
      throw new GalatDomain('Stok produk tidak mencukupi')
    }
    validasiModifier(item, produk)
    const harga = produk.harga.toNumber()
    const tambahanModifier = (item.modifiers ?? []).reduce(
      (s, mod) => s + (hargaModifier.get(mod.modifierId) ?? 0) * mod.qty,
      0,
    )
    const subtotal = harga * item.qty + tambahanModifier

    let hppSatuan = 0
    const kebutuhan = produk.resep.map((r) => {
      const jumlah = r.jumlah.toNumber()
      hppSatuan += jumlah * r.bahan.hargaSatuan.toNumber()
      return {
        bahanId: r.bahanId,
        nama: r.bahan.nama,
        butuh: jumlah * item.qty,
      }
    })
    for (const k of kebutuhan) {
      const bahan = produk.resep.find((r) => r.bahanId === k.bahanId)!.bahan
      if (bahan.stok.toNumber() < k.butuh) {
        throw new GalatDomain('Stok bahan baku tidak mencukupi')
      }
    }

    return {
      produkId: produk.id,
      namaProduk: produk.nama,
      harga,
      qty: item.qty,
      subtotal,
      hpp: Math.round(hppSatuan * item.qty),
      kebutuhan,
      modifiers: item.modifiers ?? [],
    }
  })
}

// Pajak keluaran dari tarif persen atas pokok setelah diskon manual & poin.
// Nilai dari klien tidak dipakai; server menghitung sendiri. Pure function.
export function hitungPajak(pokok: number, persen: number) {
  const tarif = Math.min(Math.max(0, persen), 100)
  return Math.max(0, Math.round((Math.max(0, pokok) * tarif) / 100))
}

// Hitung baris pembayaran (split atau tunggal) + kembalian.
// Kembalian dihitung server; klien tidak boleh mengirimnya.
export function hitungPembayaran(input: {
  total: number
  metodeBayar: MetodeBayar
  pembayaran?: PembayaranMasuk[]
  uangDiterima?: number
}): HasilPembayaran {
  const { total } = input
  let barisBayar: BarisBayar[] = []
  let uangDiterimaTotal: number | null = null
  let kembalian = 0

  if (total > 0) {
    if (input.pembayaran && input.pembayaran.length > 0) {
      const jumlahBayar = input.pembayaran.reduce((s, p) => s + p.jumlah, 0)
      if (jumlahBayar !== total) {
        throw new GalatDomain(
          `Total pembayaran (${jumlahBayar}) tidak sama dengan total tagihan (${total})`,
        )
      }
      barisBayar = input.pembayaran.map((p) => {
        if (p.metode !== 'TUNAI') {
          return { metode: p.metode, jumlah: p.jumlah, uangDiterima: null }
        }
        const diterima = p.uangDiterima ?? p.jumlah
        if (diterima < p.jumlah) {
          throw new GalatDomain('Uang tunai diterima kurang dari jumlah tunai')
        }
        uangDiterimaTotal = (uangDiterimaTotal ?? 0) + diterima
        return { metode: p.metode, jumlah: p.jumlah, uangDiterima: diterima }
      })
    } else {
      if (input.metodeBayar === 'TUNAI' && input.uangDiterima != null) {
        if (input.uangDiterima < total) {
          throw new GalatDomain('Uang diterima kurang dari total tagihan')
        }
        uangDiterimaTotal = input.uangDiterima
      }
      barisBayar = [
        {
          metode: input.metodeBayar,
          jumlah: total,
          uangDiterima: uangDiterimaTotal,
        },
      ]
    }
    if (uangDiterimaTotal != null) {
      const totalTunai = barisBayar
        .filter((b) => b.metode === 'TUNAI')
        .reduce((s, b) => s + b.jumlah, 0)
      kembalian = uangDiterimaTotal - totalTunai
    }
  }

  return {
    barisBayar,
    uangDiterimaTotal,
    kembalian,
    metodeUtama: barisBayar[0]?.metode ?? input.metodeBayar,
  }
}

// Bangun entri jurnal berimbang dari komponen nilai transaksi.
// Melempar error internal (bukan GalatDomain) bila CoA belum lengkap
// atau jurnal tidak berimbang.
export function bangunEntriJurnal(input: {
  idAkun: Map<string, string>
  subtotal: number
  diskonTotal: number
  ongkir: number
  pajak: number
  hppTotal: number
  total: number
}): EntriJurnal[] {
  for (const kode of Object.values(AKUN)) {
    if (!input.idAkun.get(kode)) {
      throw new Error(`Akun ${kode} belum ada di Chart of Accounts`)
    }
  }
  const entri: EntriJurnal[] = [
    { akunId: input.idAkun.get(AKUN.kas)!, debit: input.total, kredit: 0 },
    {
      akunId: input.idAkun.get(AKUN.pendapatanPenjualan)!,
      debit: 0,
      kredit: input.subtotal - input.diskonTotal,
    },
  ]
  if (input.ongkir > 0) {
    entri.push({
      akunId: input.idAkun.get(AKUN.pendapatanAntar)!,
      debit: 0,
      kredit: input.ongkir,
    })
  }
  if (input.pajak > 0) {
    entri.push({
      akunId: input.idAkun.get(AKUN.pajakKeluaran)!,
      debit: 0,
      kredit: input.pajak,
    })
  }
  if (input.hppTotal > 0) {
    entri.push({
      akunId: input.idAkun.get(AKUN.hpp)!,
      debit: input.hppTotal,
      kredit: 0,
    })
    entri.push({
      akunId: input.idAkun.get(AKUN.persediaanBahan)!,
      debit: 0,
      kredit: input.hppTotal,
    })
  }
  const totalDebit = entri.reduce((s, e) => s + e.debit, 0)
  const totalKredit = entri.reduce((s, e) => s + e.kredit, 0)
  if (totalDebit !== totalKredit) {
    throw new Error(
      `Jurnal tidak berimbang: debit ${totalDebit} vs kredit ${totalKredit}`,
    )
  }
  return entri
}
