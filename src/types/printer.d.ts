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
