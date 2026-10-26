import type { UKURAN_KERTAS_TERMAL } from '#/lib/ukuran-kertas'

export type PortSerial = SerialPort

export type JalurPrinter = 'usb' | 'bluetooth' | 'wifi' | 'serial'

/** Entri printer hasil pindai; objek port cache sesi, metadata bisa ke database. */
export interface PrinterPerangkat {
  id: string
  nama: string
  sumber: 'serial'
  jalur?: JalurPrinter
  vendorId?: number
  vendorName?: string
  productId?: number
  productName?: string
  serialNumber?: string
  baudRate: number
  dipindaiPada: string
}

export interface UkuranKertasTermal {
  id: string
  lebarMm: number
  tinggiMm: number
}

/**
 * Id varian kertas termal. Diturunkan dari konstanta `UKURAN_KERTAS_TERMAL`
 * agar daftar id tetap satu sumber kebenaran (tidak diduplikasi manual).
 */
export type IdUkuranKertasTermal = (typeof UKURAN_KERTAS_TERMAL)[number]['id']
