// Pemindaian printer perangkat (Web Serial). Objek SerialPort hanya hidup di
// memori + sessionStorage; metadata perangkat disegarkan ke database lewat
// lib/printer-daftar. sessionStorage hilang saat tab/browser ditutup; logout
// memanggil hapusCachePrinter().
import type { PrinterPerangkat } from '#/types/printer'

const KUNCI = 'pos_printer_perangkat'
const KUNCI_TERPILIH = 'pos_printer_terpilih'

const portTersimpan = new Map<string, SerialPort>()
const pendengar = new Set<(daftar: PrinterPerangkat[]) => void>()
let memori: PrinterPerangkat[] | null = null

const VENDOR: Record<number, string> = {
  0x0416: 'Winbond',
  0x1a86: 'QinHeng',
  0x0403: 'FTDI',
  0x10c4: 'Silicon Labs',
  0x04b8: 'Epson',
  0x0519: 'Star Micronics',
  0x0dd4: 'Custom',
  0x1504: 'Citizen',
  0x0483: 'STMicro',
  0x2341: 'Arduino',
}

export function dukunganSerial(): boolean {
  if (typeof navigator === 'undefined') return false
  return 'serial' in navigator
}

function heks(nilai: number | undefined): string | undefined {
  return nilai === undefined ? undefined : `0x${nilai.toString(16)}`
}

function idPerangkat(port: SerialPort, indeks: number): string {
  const info = port.getInfo()
  return `serial-${info.usbVendorId ?? 0}-${info.usbProductId ?? 0}-${indeks}`
}

function entriDariPort(port: SerialPort, indeks: number): PrinterPerangkat {
  const info = port.getInfo()
  const vendor = info.usbVendorId ? VENDOR[info.usbVendorId] : undefined
  const nomor = info.usbProductId ? heks(info.usbProductId) : `#${indeks + 1}`
  return {
    id: idPerangkat(port, indeks),
    nama: vendor ? `${vendor} ${nomor}` : `Printer serial ${indeks + 1}`,
    sumber: 'serial',
    jalur: info.usbVendorId ? 'usb' : 'serial',
    vendorId: info.usbVendorId,
    vendorName: vendor,
    productId: info.usbProductId,
    baudRate: 9600,
    dipindaiPada: new Date().toISOString(),
  }
}

function sebarkan(daftar: PrinterPerangkat[]): void {
  for (const dengar of pendengar) dengar(daftar)
}

function simpanDaftar(daftar: PrinterPerangkat[]): void {
  memori = daftar
  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage.setItem(KUNCI, JSON.stringify(daftar))
    } catch {
      // storage penuh/diblokir: cache memori tetap dipakai selama tab hidup
    }
  }
  sebarkan(daftar)
}

function bacaDaftar(): PrinterPerangkat[] {
  if (memori) return memori
  if (typeof window === 'undefined') return []
  try {
    const mentah = window.sessionStorage.getItem(KUNCI)
    const parsed: unknown = mentah ? JSON.parse(mentah) : []
    memori = Array.isArray(parsed)
      ? parsed
          .filter(
            (x): x is PrinterPerangkat =>
              !!x &&
              typeof x === 'object' &&
              typeof (x as PrinterPerangkat).id === 'string' &&
              typeof (x as PrinterPerangkat).nama === 'string',
          )
          .map((x) => ({
            ...x,
            jalur: x.jalur ?? (x.vendorId ? 'usb' : 'serial'),
          }))
      : []
  } catch {
    memori = []
  }
  return memori
}

export function daftarPrinterSesi(): PrinterPerangkat[] {
  return bacaDaftar()
}

export function berlanggananPrinter(
  dengar: (daftar: PrinterPerangkat[]) => void,
): () => void {
  pendengar.add(dengar)
  return () => pendengar.delete(dengar)
}

// Pindai senyap: hanya port yang sudah pernah diizinkan browser. Tidak butuh
// gesture, aman dipanggil otomatis tepat setelah owner/kasir login.
export async function pindaiPrinterOtomatis(): Promise<PrinterPerangkat[]> {
  if (!dukunganSerial()) {
    simpanDaftar([])
    return []
  }
  try {
    const ports = await navigator.serial.getPorts()
    const daftar = ports.map((port, indeks) => {
      const entri = entriDariPort(port, indeks)
      portTersimpan.set(entri.id, port)
      return entri
    })
    simpanDaftar(daftar)
    return daftar
  } catch {
    simpanDaftar([])
    return []
  }
}

// Hubungkan printer baru. Wajib dipanggil dari klik pengguna (gesture).
export async function tambahPrinterDenganIzin(): Promise<PrinterPerangkat> {
  if (!dukunganSerial()) {
    throw new Error(
      'Browser ini belum mendukung Web Serial. Gunakan Chrome atau Edge desktop.',
    )
  }
  const port = await navigator.serial.requestPort()
  const lama = bacaDaftar()
  const entri = entriDariPort(port, lama.length)
  portTersimpan.set(entri.id, port)
  const daftar = [...lama.filter((x) => x.id !== entri.id), entri]
  simpanDaftar(daftar)
  setPrinterTerpilih(entri.id)
  return entri
}

export function setPrinterTerpilih(id: string): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(KUNCI_TERPILIH, id)
  sebarkan(bacaDaftar())
}

export function printerTerpilih(): PrinterPerangkat | null {
  const daftar = bacaDaftar()
  if (daftar.length === 0) return null
  const id =
    typeof window === 'undefined'
      ? null
      : window.sessionStorage.getItem(KUNCI_TERPILIH)
  return daftar.find((x) => x.id === id) ?? daftar[0]
}

async function ambilPort(entri: PrinterPerangkat): Promise<SerialPort | null> {
  const langsung = portTersimpan.get(entri.id)
  if (langsung) return langsung
  if (!dukunganSerial()) return null
  try {
    const ports = await navigator.serial.getPorts()
    const port = ports.find((p, indeks) => idPerangkat(p, indeks) === entri.id)
    if (port) portTersimpan.set(entri.id, port)
    return port ?? null
  } catch {
    return null
  }
}

export async function portUntukCetak(): Promise<{
  entri: PrinterPerangkat
  port: SerialPort
} | null> {
  const entri = printerTerpilih()
  if (!entri) return null
  const port = await ambilPort(entri)
  return port ? { entri, port } : null
}

export function hapusCachePrinter(): void {
  memori = []
  portTersimpan.clear()
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(KUNCI)
    window.sessionStorage.removeItem(KUNCI_TERPILIH)
  }
  sebarkan([])
}
