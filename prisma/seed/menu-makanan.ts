import type { BahanPaket, MenuProduk } from './dasar.js'
import { parseHarga } from './dasar.js'

// Menu makanan: corndog, tteokbokki, dan varian sosis.
export function menuMakanan(b: BahanPaket): MenuProduk[] {
  return [
    {
      nama: 'Corndog Mozza Coklat',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 50 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.coklat, jumlah: 20 },
      ],
    },
    {
      nama: 'Corndog Mozza Vanilla',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 50 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.vanila, jumlah: 5 },
      ],
    },
    {
      nama: 'Corndog Mozza Choco Crunchy',
      harga: parseHarga('25.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 60 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.coklat, jumlah: 25 },
      ],
    },
    {
      nama: 'Corndog Greentea Crunchy',
      harga: parseHarga('25.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 50 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.matcha, jumlah: 5 },
      ],
    },
    {
      nama: 'Corndog Mozza Greentea',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 50 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.matcha, jumlah: 3 },
      ],
    },
    {
      nama: 'Corndog Mozza Tiramisu Crunchy',
      harga: parseHarga('25.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 60 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.tiramisu, jumlah: 5 },
      ],
    },
    {
      nama: 'Corndog Mozzarella Taro',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 60 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.kelapa, jumlah: 20 },
      ],
    },
    {
      nama: 'Corndog Mozza Strawberry',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 50 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.strober, jumlah: 5 },
      ],
    },
    {
      nama: 'Corndog Mozza Taro',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 60 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.kelapa, jumlah: 10 },
      ],
    },
    {
      nama: 'Corndog Coklat Kacang',
      harga: parseHarga('20.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.coklat, jumlah: 20 },
        { bahanId: b.kacang, jumlah: 10 },
      ],
    },

    // Tteokbokki
    {
      nama: 'Tteokbokki Original',
      harga: parseHarga('20.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 40 },
        { bahanId: b.kopiHitam, jumlah: 10 },
        { bahanId: b.gulaPasir, jumlah: 5 },
      ],
    },
    {
      nama: 'Tteokbokki Rose',
      harga: parseHarga('24.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.terigu, jumlah: 40 },
        { bahanId: b.kopiHitam, jumlah: 10 },
        { bahanId: b.susuKental, jumlah: 15 },
        { bahanId: b.gulaPasir, jumlah: 5 },
      ],
    },

    // Corndog mini
    {
      nama: 'corndog moza asin',
      harga: parseHarga('13.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 30 },
        { bahanId: b.terigu, jumlah: 20 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 30 },
      ],
    },
    {
      nama: 'Corndog Moza Manis',
      harga: parseHarga('13.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 30 },
        { bahanId: b.terigu, jumlah: 20 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 30 },
        { bahanId: b.gulaPasir, jumlah: 5 },
      ],
    },
    {
      nama: 'corndog sosis',
      harga: parseHarga('10.667'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.sosis, jumlah: 30 },
        { bahanId: b.terigu, jumlah: 20 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 30 },
      ],
    },
    {
      nama: 'corndog sosis dan moza',
      harga: parseHarga('16.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.sosis, jumlah: 30 },
        { bahanId: b.keju, jumlah: 20 },
        { bahanId: b.terigu, jumlah: 20 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 30 },
      ],
    },

    // Mozzarella & sosis
    {
      nama: 'Corndog Mozarella',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 80 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
      ],
    },
    {
      nama: 'Corndog Full Sosis',
      harga: parseHarga('17.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.sosis, jumlah: 60 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
      ],
    },
    {
      nama: 'Corndog 1/2 Sosis Mozza',
      harga: parseHarga('18.667'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.sosis, jumlah: 30 },
        { bahanId: b.keju, jumlah: 40 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
      ],
    },
    {
      nama: 'Corndog full Sosis Ayam',
      harga: parseHarga('16.000'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.sosis, jumlah: 60 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
      ],
    },

    // Sweet corndog
    {
      nama: 'Corndog Coklat Vanilla',
      harga: parseHarga('21.334'),
      kategori: 'makanan',
      bahan: [
        { bahanId: b.keju, jumlah: 50 },
        { bahanId: b.terigu, jumlah: 30 },
        { bahanId: b.telur, jumlah: 1 },
        { bahanId: b.minyak, jumlah: 50 },
        { bahanId: b.vanila, jumlah: 5 },
      ],
    },
  ]
}
