import { prisma } from './dasar.js'

// Master data pendukung: kategori, member, kurir, akun buku besar, pengaturan,
// printer, supplier, meja, dan grup modifier.
export async function seedMaster() {
  const [makanan, minuman] = await Promise.all([
    prisma.kategori.create({
      data: { nama: 'Makanan', deskripsi: 'Aneka makanan' },
    }),
    prisma.kategori.create({
      data: { nama: 'Minuman', deskripsi: 'Aneka minuman' },
    }),
  ])

  // Member contoh (email dipakai agar endpoint `/api/v1/saya` bisa diuji).
  await prisma.member.createMany({
    data: [
      {
        nama: 'Budi Santoso',
        telepon: '081234567890',
        email: 'budi@example.com',
        alamat: 'Jl. Merdeka No. 1',
        poin: 0,
      },
      {
        nama: 'Siti Rahma',
        telepon: '081298765432',
        email: 'siti@example.com',
        alamat: 'Jl. Melati No. 8',
        poin: 350,
        totalBelanja: 3_500_000,
        diskonPersen: 5,
        tier: 'SILVER',
      },
      {
        nama: 'Andi Pratama',
        telepon: '081377788899',
        email: 'andi@example.com',
        alamat: 'Jl. Kenanga No. 3',
        poin: 1_250,
        totalBelanja: 12_500_000,
        diskonPersen: 10,
        tier: 'GOLD',
      },
    ],
  })

  // Kurir / layanan antar.
  await Promise.all([
    prisma.delivery.create({
      data: { nama: 'Kurir Toko', tarif: 5000, estimasi: '30-60 menit' },
    }),
    prisma.delivery.create({
      data: { nama: 'GoSend', tarif: 12000, estimasi: '1-2 jam' },
    }),
  ])

  // Chart of Accounts (buku besar).
  await prisma.akun.createMany({
    data: [
      { kode: '1100', nama: 'Kas', tipe: 'ASET' },
      { kode: '1200', nama: 'Persediaan Bahan', tipe: 'ASET' },
      { kode: '2100', nama: 'Pajak Keluaran', tipe: 'KEWAJIBAN' },
      { kode: '3100', nama: 'Modal Pemilik', tipe: 'MODAL' },
      { kode: '4100', nama: 'Pendapatan Penjualan', tipe: 'PENDAPATAN' },
      { kode: '4200', nama: 'Pendapatan Jasa Antar', tipe: 'PENDAPATAN' },
      { kode: '5100', nama: 'Beban Pokok Penjualan (HPP)', tipe: 'BEBAN' },
      { kode: '2200', nama: 'Hutang Usaha', tipe: 'KEWAJIBAN' },
      { kode: '5200', nama: 'Beban Belanja', tipe: 'BEBAN' },
      { kode: '5300', nama: 'Beban Operasional Kasir', tipe: 'BEBAN' },
      { kode: '5400', nama: 'Beban Operasional Toko', tipe: 'BEBAN' },
      { kode: '5900', nama: 'Beban Lainnya', tipe: 'BEBAN' },
    ],
  })

  // Pengaturan aplikasi (flag fitur).
  await prisma.pengaturan.createMany({
    data: [
      { kunci: 'mode_fnb', nilai: 'false' },
      { kunci: 'riwayat_belanja_aktif', nilai: 'true' },
      { kunci: 'nama_toko', nilai: 'POS Demo' },
      { kunci: 'printer_escpos', nilai: 'false' },
      { kunci: 'ukuran_kertas_termal', nilai: '58x40' },
      { kunci: 'judul_app', nilai: 'POS Berkah' },
      { kunci: 'logo_url', nilai: '/logo.svg' },
      {
        kunci: 'deskripsi_app',
        nilai: 'Sistem kasir modern untuk usaha kuliner dan ritel.',
      },
      { kunci: 'pajak_persen', nilai: '0' },
      // PB1 restoran/cafe (mode F&B) & PPN retail — dibebankan ke pelanggan.
      { kunci: 'pajak_resto_persen', nilai: '0' },
      { kunci: 'pajak_retail_persen', nilai: '0' },
      { kunci: 'stok_dikurangi_saat', nilai: 'order' },
    ],
  })

  // Printer contoh: satu default (dipakai antrean cetak), satu non-default.
  await prisma.printer.createMany({
    data: [
      {
        nama: 'Printer Kasir 1',
        tipe: 'ESC_POS',
        lokasi: 'Kasir 1',
        default: true,
        aktif: true,
      },
      {
        nama: 'Printer Dapur',
        tipe: 'ESC_POS',
        lokasi: 'Dapur',
        default: false,
        aktif: true,
      },
    ],
  })

  // Supplier contoh (dipakai form pembelian bahan + hutang usaha).
  await prisma.supplier.createMany({
    data: [
      { nama: 'Toko Grosir Sumber Makmur', kontak: '0812-1111-2222' },
      { nama: 'Pasar Besar Kemasan', kontak: '0812-3333-4444' },
    ],
  })

  // Meja untuk mode F&B.
  await prisma.meja.createMany({
    data: [
      { nomor: '1', nama: 'Meja 1' },
      { nomor: '2', nama: 'Meja 2' },
      { nomor: '3', nama: 'Meja Sudut' },
    ],
  })

  // Grup modifier + pilihan (mode F&B).
  const topping = await prisma.modifierGrup.create({
    data: { nama: 'Topping', wajib: false, min: 0, max: 3, aktif: true },
  })
  const manis = await prisma.modifierGrup.create({
    data: { nama: 'Tingkat Manis', wajib: true, min: 1, max: 1, aktif: true },
  })
  const ukuran = await prisma.modifierGrup.create({
    data: { nama: 'Ukuran', wajib: false, min: 0, max: 1, aktif: true },
  })
  await prisma.modifier.createMany({
    data: [
      { grupId: topping.id, nama: 'Extra Keju', hargaTambahan: 5000 },
      { grupId: topping.id, nama: 'Extra Sosis', hargaTambahan: 4000 },
      { grupId: manis.id, nama: 'Tanpa Gula', hargaTambahan: 0 },
      { grupId: manis.id, nama: 'Normal', hargaTambahan: 0 },
      { grupId: manis.id, nama: 'Less Sugar', hargaTambahan: 0 },
      { grupId: ukuran.id, nama: 'Reguler', hargaTambahan: 0 },
      { grupId: ukuran.id, nama: 'Large', hargaTambahan: 5000 },
    ],
  })

  return { makanan: makanan.id, minuman: minuman.id }
}
