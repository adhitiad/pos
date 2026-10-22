import type { StrukPayload } from '#/types/percetakan'

const LEBAR = 32

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const tengah = (teks: string): string => {
  const isi = teks.slice(0, LEBAR)
  const kiri = Math.floor((LEBAR - isi.length) / 2)
  return `${' '.repeat(Math.max(0, kiri))}${isi}`
}

const kiriKanan = (kiri: string, kanan: string): string => {
  const kananAman = kanan.slice(0, LEBAR)
  if (kananAman.length >= LEBAR) return kananAman
  const kiriAman = kiri.slice(0, Math.max(0, LEBAR - kananAman.length - 1))
  const spasi = ' '.repeat(
    Math.max(0, LEBAR - kiriAman.length - kananAman.length),
  )
  return `${kiriAman}${spasi}${kananAman}`
}

const waktu = (iso: string): string =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

// Struk uji memakai bentuk payload yang sama dengan struk asli, tetapi
// pesanan & member diisi data dummy. Tidak menyentuh database/transaksi.
export function strukUji(sekarang = new Date()): StrukPayload {
  const tanggal = sekarang.toISOString()
  const tanggalNomor = tanggal.slice(0, 10).replace(/-/g, '')
  const subtotal = 58_000
  const diskon = 5_000
  const pajak = 5_300
  const total = subtotal - diskon + pajak
  return {
    nomor: `TEST-${tanggalNomor}-0001`,
    tanggal,
    items: [
      {
        nama: 'Kopi Susu Gula Aren',
        qty: 2,
        harga: 18_000,
        subtotal: 36_000,
        modifier: [{ nama: 'Less Sugar', qty: 1, tambahan: 0, catatan: null }],
      },
      {
        nama: 'Croissant Butter',
        qty: 1,
        harga: 22_000,
        subtotal: 22_000,
        modifier: [],
      },
    ],
    subtotal,
    diskon,
    pajak,
    pajakJenis: 'PB1',
    ongkir: 0,
    total,
    metodeBayar: 'TUNAI',
    pembayaran: [{ metode: 'TUNAI', jumlah: total }],
    uangDiterima: 60_000,
    kembalian: 60_000 - total,
    memberNama: 'Member Demo',
    catatan: 'Pesanan contoh untuk uji printer',
  }
}

// Susun baris ESC/POS 32 kolom dari payload struk. Dipakai test print dan
// bisa dipakai ulang untuk struk asli yang memakai StrukPayload.
export function barisStrukUji(
  payload: StrukPayload,
  namaToko: string,
): string[] {
  const baris: string[] = [
    tengah(namaToko || 'POS'),
    tengah('STRUK UJI / TEST PRINT'),
    tengah(payload.nomor),
    tengah(waktu(payload.tanggal)),
  ]

  if (payload.memberNama) baris.push(tengah(`Member: ${payload.memberNama}`))
  baris.push('-'.repeat(LEBAR))

  for (const item of payload.items) {
    baris.push(
      kiriKanan(`${item.nama} x${item.qty}`, `Rp${rupiah(item.subtotal)}`),
    )
    for (const modifier of item.modifier) {
      const tambahan =
        modifier.tambahan > 0 ? ` (Rp${rupiah(modifier.tambahan)})` : ''
      baris.push(
        `  + ${modifier.nama}${modifier.qty > 1 ? ` x${modifier.qty}` : ''}${tambahan}`,
      )
    }
  }

  baris.push('-'.repeat(LEBAR))
  baris.push(kiriKanan('Subtotal', `Rp${rupiah(payload.subtotal)}`))
  if (payload.diskon > 0) {
    baris.push(kiriKanan('Diskon', `-Rp${rupiah(payload.diskon)}`))
  }
  if (payload.pajak > 0) {
    baris.push(
      kiriKanan(
        `Pajak${payload.pajakJenis ? ` ${payload.pajakJenis}` : ''}`,
        `Rp${rupiah(payload.pajak)}`,
      ),
    )
  }
  if (payload.ongkir > 0) {
    baris.push(kiriKanan('Ongkir', `Rp${rupiah(payload.ongkir)}`))
  }
  baris.push(kiriKanan('Total', `Rp${rupiah(payload.total)}`))

  baris.push('-'.repeat(LEBAR))
  if (payload.pembayaran.length > 0) {
    for (const bayar of payload.pembayaran) {
      baris.push(
        kiriKanan(`Bayar (${bayar.metode})`, `Rp${rupiah(bayar.jumlah)}`),
      )
    }
  } else {
    baris.push(kiriKanan('Metode', payload.metodeBayar))
  }
  if (payload.uangDiterima != null) {
    baris.push(kiriKanan('Tunai diterima', `Rp${rupiah(payload.uangDiterima)}`))
  }
  if (payload.kembalian != null && payload.kembalian > 0) {
    baris.push(kiriKanan('Kembalian', `Rp${rupiah(payload.kembalian)}`))
  }
  if (payload.catatan) baris.push(payload.catatan)

  baris.push('')
  baris.push(tengah('*** DATA UJI / DUMMY ***'))
  baris.push(tengah('Terima kasih telah berbelanja'))
  return baris
}
