import { daftarkanPrinterPerangkatFn } from '#/server/percetakanFn'
import type { JalurPrinter, PrinterPerangkat } from '#/types/printer'

const KONEKSI: Record<JalurPrinter, 'USB' | 'BLUETOOTH' | 'WIFI' | 'SERIAL'> = {
  usb: 'USB',
  bluetooth: 'BLUETOOTH',
  wifi: 'WIFI',
  serial: 'SERIAL',
}

function keInput(printer: PrinterPerangkat) {
  return {
    nama: printer.nama,
    tipe: 'ESC_POS' as const,
    perangkat: printer.id,
    koneksi: KONEKSI[printer.jalur ?? 'serial'],
    vendorId:
      printer.vendorId === undefined
        ? undefined
        : `0x${printer.vendorId.toString(16).padStart(4, '0')}`,
    vendorName: printer.vendorName,
    serialNumber: printer.serialNumber,
    productName: printer.productName,
    aktif: true,
  }
}

// Simpan/segarkan perangkat hasil pindai ke database. Kegagalan sinkronisasi
// tidak boleh menghentikan pemakaian printer dari cache sesi.
export async function simpanPerangkatPrinter(
  daftar: PrinterPerangkat[],
): Promise<void> {
  await Promise.allSettled(
    daftar.map((printer) =>
      daftarkanPrinterPerangkatFn({ data: keInput(printer) }),
    ),
  )
}
