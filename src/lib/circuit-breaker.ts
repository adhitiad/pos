// Circuit breaker untuk panggilan layanan eksternal (Cloudinary, printer,
// dsb.). Saat error berturut-turut melewati ambang, permintaan berikutnya
// ditolak cepat tanpa menunggu timeout jaringan, sehingga satu layanan mati
// tidak menunda seluruh alur kasir.
//
// Status:
//   CLOSED    — normal, panggilan dilewatkan.
//   OPEN      — error terlalu banyak, panggilan ditolak segera.
//   HALF_OPEN — mencoba satu panggilan uji coba; sukses → CLOSED, gagal → OPEN.
export type StatusSirkuit = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

export interface OpsiSirkuit {
  // Jumlah error berturut-turut sebelum dibuka.
  ambangKegagalan?: number
  // Jeda sebelum mencoba kembali (ms).
  jedaPemulihanMs?: number
  // Label untuk debugging / log.
  nama?: string
}

const DEFAULT_AMBANG_KEGAGALAN = 5
const DEFAULT_JEDA_PEMULIHAN_MS = 30_000

class StatusGalatSirkuit extends Error {
  constructor(public readonly nama: string) {
    super(`Sirkuit ${nama} terbuka: layanan tidak tersedia sementara`)
    this.name = 'StatusGalatSirkuit'
  }
}

// ─── Sirkuit tunggal ───

export class Sirkuit {
  private status: StatusSirkuit = 'CLOSED'
  private kegagalanBerturut = 0
  private waktuDibuka = 0
  private readonly ambang: number
  private readonly jedaPemulihan: number
  private readonly nama: string

  constructor(opsi: OpsiSirkuit = {}) {
    this.ambang = Math.max(1, opsi.ambangKegagalan ?? DEFAULT_AMBANG_KEGAGALAN)
    this.jedaPemulihan = Math.max(
      1_000,
      opsi.jedaPemulihanMs ?? DEFAULT_JEDA_PEMULIHAN_MS,
    )
    this.nama = opsi.nama ?? 'sirkuit'
  }

  bacaStatus(): StatusSirkuit {
    if (this.status === 'OPEN') {
      const sekarang = Date.now()
      if (sekarang - this.waktuDibuka >= this.jedaPemulihan) {
        this.status = 'HALF_OPEN'
      }
    }
    return this.status
  }

  // Jalankan `fn` di dalam sirkuit. Bila sirkuit OPEN, ditolak segera.
  async jalankan<T>(fn: () => Promise<T>): Promise<T> {
    const st = this.bacaStatus()
    if (st === 'OPEN') {
      throw new StatusGalatSirkuit(this.nama)
    }
    try {
      const hasil = await fn()
      this.katakanSukses()
      return hasil
    } catch (e) {
      this.katakanGagal()
      throw e
    }
  }

  private katakanSukses(): void {
    this.kegagalanBerturut = 0
    if (this.status === 'HALF_OPEN') this.status = 'CLOSED'
  }

  private katakanGagal(): void {
    this.kegagalanBerturut += 1
    if (this.status === 'HALF_OPEN' || this.kegagalanBerturut >= this.ambang) {
      this.status = 'OPEN'
      this.waktuDibuka = Date.now()
    }
  }
}

// ─── Register sirkuit bersama ───

const sirkuit: Map<string, Sirkuit> = new Map()

export function dapatkanSirkuit(nama: string, opsi?: OpsiSirkuit): Sirkuit {
  let s = sirkuit.get(nama)
  if (!s) {
    s = new Sirkuit({ nama, ...opsi })
    sirkuit.set(nama, s)
  }
  return s
}

export { StatusGalatSirkuit }
