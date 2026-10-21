import type { BahanPaket, MenuProduk } from './dasar.js'
import { parseHarga } from './dasar.js'

// Menu hottang, soft crepes, dan minuman.
export function menuMinuman(b: BahanPaket): MenuProduk[] {
  return [
    // Hottang
    {
      nama: 'Hottang Full Mozzarella',
      harga: parseHarga('25.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 80 },
        { bahanId: b.kentang, jumlah: 50 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 30 },
      ],
    },
    {
      nama: 'Hottang Full Sosis',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.sosis, jumlah: 60 },
        { bahanId: b.kentang, jumlah: 50 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 30 },
      ],
    },
    {
      nama: 'Hottang 1/2 Sosis Mozza',
      harga: parseHarga('22.667'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.sosis, jumlah: 30 },
        { bahanId: b.keju, jumlah: 40 },
        { bahanId: b.kentang, jumlah: 50 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 30 },
      ],
    },
    {
      nama: 'Hottang Sosis Ayam',
      harga: parseHarga('20.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.sosis, jumlah: 50 },
        { bahanId: b.kentang, jumlah: 50 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 30 },
      ],
    },

    // Soft crepes
    {
      nama: 'Crepes Coklat',
      harga: parseHarga('10.667'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.coklat, jumlah: 15 },
      ],
    },
    {
      nama: 'Crepes Vanila',
      harga: parseHarga('10.667'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.vanila, jumlah: 3 },
      ],
    },
    {
      nama: 'Crepes Choco Crunchy',
      harga: parseHarga('12.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.coklat, jumlah: 15 },
      ],
    },
    {
      nama: 'Crepes Tiramisu Crunchy',
      harga: parseHarga('12.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.tiramisu, jumlah: 5 },
      ],
    },
    {
      nama: 'Crepes Greentea',
      harga: parseHarga('10.667'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.matcha, jumlah: 5 },
      ],
    },
    {
      nama: 'Crepes Nutella',
      harga: parseHarga('18.666'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.kacang, jumlah: 10 },
        { bahanId: b.coklat, jumlah: 15 },
      ],
    },
    {
      nama: 'Crepes Strawberry',
      harga: parseHarga('10.667'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.strober, jumlah: 5 },
      ],
    },
    {
      nama: 'Crepes Taro',
      harga: parseHarga('10.667'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.kelapa, jumlah: 5 },
      ],
    },
    {
      nama: 'Crepes Greentea Crunchy',
      harga: parseHarga('12.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.matcha, jumlah: 5 },
      ],
    },
    {
      nama: 'Crepes Pistachio',
      harga: parseHarga('20.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 25 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 20 },
        { bahanId: b.pistachio, jumlah: 10 },
      ],
    },

    // Minuman
    {
      nama: 'Pink Lava PW',
      harga: parseHarga('16.000'),
      kategori: 'minuman',
      bahan: [
        { bahanId: b.soda, jumlah: 100 },
        { bahanId: b.strober, jumlah: 10 },
        { bahanId: b.gulaPasir, jumlah: 10 },
      ],
    },
    {
      nama: 'Mojito Orange PW',
      harga: parseHarga('12.000'),
      kategori: 'minuman',
      bahan: [
        { bahanId: b.soda, jumlah: 100 },
        { bahanId: b.jeruk, jumlah: 20 },
        { bahanId: b.gulaPasir, jumlah: 10 },
      ],
    },
    {
      nama: 'Sticky Milk PW',
      harga: parseHarga('13.334'),
      kategori: 'minuman',
      bahan: [
        { bahanId: b.susu, jumlah: 100 },
        { bahanId: b.gulaPasir, jumlah: 10 },
        { bahanId: b.susuKental, jumlah: 10 },
      ],
    },
    {
      nama: 'Rainbow Mojito',
      harga: parseHarga('13.334'),
      kategori: 'minuman',
      bahan: [
        { bahanId: b.soda, jumlah: 100 },
        { bahanId: b.melon, jumlah: 15 },
        { bahanId: b.jeruk, jumlah: 15 },
        { bahanId: b.fanta, jumlah: 50 },
      ],
    },
    {
      nama: 'Creamy Chill PW',
      harga: parseHarga('16.000'),
      kategori: 'minuman',
      bahan: [
        { bahanId: b.susu, jumlah: 80 },
        { bahanId: b.gulaPasir, jumlah: 10 },
        { bahanId: b.susuKental, jumlah: 10 },
      ],
    },
    {
      nama: 'Air Mineral',
      harga: parseHarga('6.667'),
      kategori: 'minuman',
      bahan: [],
    },
    {
      nama: 'Cookies N Cream',
      harga: parseHarga('14.667'),
      kategori: 'minuman',
      bahan: [
        { bahanId: b.susu, jumlah: 80 },
        { bahanId: b.gulaPasir, jumlah: 10 },
        { bahanId: b.coklat, jumlah: 15 },
      ],
    },
    {
      nama: 'Bengbeng Latte',
      harga: parseHarga('16.000'),
      kategori: 'minuman',
      bahan: [
        { bahanId: b.kopi, jumlah: 20 },
        { bahanId: b.susu, jumlah: 80 },
        { bahanId: b.gulaPasir, jumlah: 10 },
      ],
    },
    {
      nama: 'PW Kopsu',
      harga: parseHarga('16.000'),
      kategori: 'minuman',
      bahan: [
        { bahanId: b.kopi, jumlah: 20 },
        { bahanId: b.susu, jumlah: 80 },
        { bahanId: b.gulaPasir, jumlah: 10 },
      ],
    },
  ]
}
