// Facade publik modul transaksi. Logika dipecah agar tiap file < 397 baris:
//   poin.ts            — konstanta poin + hitungRedeem/hitungDiskonMember
//   penomoran.ts       — nomor urut harian (transaksi/jurnal)
//   postingHitung.ts   — kalkulasi murni (baris, pembayaran, entri jurnal)
//   postingTransaksi.ts— orkestrasi posting atomik
//   ringkasTransaksi.ts— serializer JSON-aman untuk klien
//   dapur.ts           — KDS (dapur), ubah status, cetak struk
export {
  hitungDiskonMember,
  hitungRedeem,
  POIN_NILAI_RUPIAH,
  RUPIAH_PER_POIN,
} from './poin.js'
export { postingTransaksi } from './postingTransaksi.js'
export { ringkasHasil } from './ringkasTransaksi.js'
export { cetakStruk, dapurData, updateStatusPesanan } from './dapur.js'
