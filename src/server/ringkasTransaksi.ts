import type { HasilTransaksiRingkas } from '#/types/transaksi'

// Bentuk ringkas & JSON-aman untuk klien (web Fn & REST mobile).
// Dipakai transaksiFn dan POST /api/v1/transaksi agar kontrak sama.
export function ringkasHasil(hasil: HasilTransaksiRingkas) {
  return {
    transaksiId: hasil.transaksi.id,
    nomor: hasil.transaksi.nomor,
    tanggal: hasil.transaksi.tanggal.toISOString(),
    subtotal: hasil.transaksi.subtotal.toNumber(),
    diskon: hasil.transaksi.diskon.toNumber(),
    diskonMember: hasil.diskonMember,
    pajak: hasil.transaksi.pajak.toNumber(),
    pajakJenis: hasil.transaksi.pajakJenis,
    ongkir: hasil.transaksi.ongkir.toNumber(),
    total: hasil.transaksi.total.toNumber(),
    metodeBayar: hasil.transaksi.metodeBayar,
    mejaId: hasil.transaksi.mejaId,
    statusPesanan: hasil.transaksi.statusPesanan,
    uangDiterima: hasil.transaksi.uangDiterima?.toNumber() ?? null,
    kembalian: hasil.transaksi.kembalian?.toNumber() ?? null,
    cetakOwner: hasil.transaksi.cetakOwner ?? 0,
    cetakKasir: hasil.transaksi.cetakKasir ?? 0,
    pembayaran: hasil.transaksi.pembayaran.map((p) => ({
      metode: p.metode,
      jumlah: p.jumlah.toNumber(),
      uangDiterima: p.uangDiterima?.toNumber() ?? null,
    })),
    itemCount: hasil.transaksi.items.reduce((s, i) => s + i.qty, 0),
    items: hasil.transaksi.items.map((i) => ({
      nama: i.namaProduk,
      qty: i.qty,
      harga: i.harga.toNumber(),
      modifiers: (i.modifiers ?? []).map((m) => ({
        modifier: m.modifier.nama,
        tambahan: m.hargaTambahan.toNumber(),
        qty: m.qty,
        catatan: m.catatan,
      })),
    })),
    jurnalId: hasil.jurnal.id,
    jurnalNomor: hasil.jurnal.nomor,
    hpp: hasil.hpp,
    memberNama: hasil.memberInfo?.nama ?? null,
    memberTotalBelanja: hasil.memberInfo?.totalBelanja ?? null,
    memberTier: hasil.memberInfo?.tier ?? null,
    // True bila ini replay idempoten (retry antrean offline).
    replay: hasil.replay ?? false,
  }
}
