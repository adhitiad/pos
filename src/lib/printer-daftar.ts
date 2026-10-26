import { daftarkanPrinterPerangkatFn } from '#/server/percetakanFn'
import type { HasilSimpanPerangkat } from '#/types/percetakan'
import type { JalurPrinter, PrinterPerangkat } from '#/types/printer'

export type { HasilSimpanPerangkat } from '#/types/percetakan'

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

function statusGalat(e: unknown): number | null {
  if (e instanceof Response) return e.status
  if (e && typeof e === 'object') {
    if ('status' in e && typeof e.status === 'number') return e.status
    if ('statusCode' in e && typeof e.statusCode === 'number') {
      return e.statusCode
    }
  }
  return null
}

function bolehRetry(e: unknown): boolean {
  const status = statusGalat(e)
  if (status !== null) return status >= 500
  return e instanceof TypeError
}

function galatSesi(e: unknown): boolean {
  if (!(e instanceof Error)) return false
  return e.message === 'UNAUTHORIZED' || e.message === 'FORBIDDEN'
}

// Simpan/segarkan perangkat hasil pindai ke database. Kegagalan sinkronisasi
// tidak boleh menghentikan pemakaian printer dari cache sesi. Ringkasan
// dikembalikan agar pemanggil bisa menampilkan/meneruskan kegagalan.
export async function simpanPerangkatPrinter(
  daftar: PrinterPerangkat[],
): Promise<HasilSimpanPerangkat> {
  const hasil = await Promise.allSettled(
    daftar.map(async (printer) => {
      try {
        return await daftarkanPrinterPerangkatFn({ data: keInput(printer) })
      } catch (e) {
        if (!bolehRetry(e)) throw e
        return daftarkanPrinterPerangkatFn({ data: keInput(printer) })
      }
    }),
  )

  let berhasil = 0
  let gagal = 0
  hasil.forEach((item, i) => {
    if (item.status === 'fulfilled') {
      berhasil += 1
      return
    }
    gagal += 1
    // Sesi berakhir di tengah pindai bukan kegagalan yang perlu dilaporkan.
    if (galatSesi(item.reason)) return
    // Hanya jalur + jenis error; jangan catat serial/vendor/ID perangkat.
    const status = statusGalat(item.reason)
    console.warn('[printer] sinkronisasi perangkat gagal', {
      jalur: daftar[i]?.jalur ?? 'serial',
      penyebab:
        status !== null
          ? `HTTP ${status}`
          : item.reason instanceof Error
            ? item.reason.name
            : 'unknown',
    })
  })
  return { berhasil, gagal }
}
