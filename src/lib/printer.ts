// Printer struk ESC/POS via Web Serial.
// Objek port diambil dari cache sesi (lib/printer-scan); metadata perangkat
// disimpan ke database lewat lib/printer-daftar. Bila belum ada printer,
// pengguna diarahkan memindai.

import { dukunganSerial as dukungan, portUntukCetak } from './printer-scan'
import type { PortSerial } from '#/types/printer'

export function dukunganSerial(): boolean {
  return dukungan()
}

const ESC = '\x1b'

export async function cetakEscpos(
  baris: string[],
  portPilihan?: PortSerial,
  lebarKolom = 32,
): Promise<void> {
  if (!dukunganSerial()) {
    throw new Error('Web Serial tidak didukung browser ini')
  }
  let port = portPilihan
  if (!port) {
    const hasil = await portUntukCetak()
    if (!hasil) {
      throw new Error(
        'Printer belum dipindai. Buka menu Pindai printer lalu hubungkan printer thermal.',
      )
    }
    port = hasil.port
  }
  await port.open({ baudRate: 9600 })
  if (!port.writable) {
    await port.close()
    throw new Error('Port printer tidak bisa ditulis')
  }
  const writer = port.writable.getWriter()
  try {
    const enc = new TextEncoder()
    const muatan: Uint8Array[] = []
    muatan.push(enc.encode(`${ESC}@`)) // inisialisasi printer
    for (const b of baris) {
      muatan.push(enc.encode(b.padEnd(lebarKolom) + '\n'))
    }
    muatan.push(enc.encode('\n\n\n')) // advance kertas
    muatan.push(enc.encode(`${ESC}i`)) // potong kertas (full cut)
    for (const chunk of muatan) {
      await writer.write(chunk)
    }
  } finally {
    writer.releaseLock()
    await port.close()
  }
}
