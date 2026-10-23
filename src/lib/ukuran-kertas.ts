export interface UkuranKertasTermal {
  id: string
  lebarMm: number
  tinggiMm: number
}

// Semua varian fisik yang diminta dipisah agar lebar/tinggi tidak ambigu.
export const UKURAN_KERTAS_TERMAL = [
  { id: '57x30', lebarMm: 57, tinggiMm: 30 },
  { id: '57x37', lebarMm: 57, tinggiMm: 37 },
  { id: '58x37', lebarMm: 58, tinggiMm: 37 },
  { id: '58x40', lebarMm: 58, tinggiMm: 40 },
  { id: '57x47', lebarMm: 57, tinggiMm: 47 },
  { id: '58x50', lebarMm: 58, tinggiMm: 50 },
  { id: '80x40', lebarMm: 80, tinggiMm: 40 },
  { id: '80x47', lebarMm: 80, tinggiMm: 47 },
  { id: '80x50', lebarMm: 80, tinggiMm: 50 },
  { id: '80x60', lebarMm: 80, tinggiMm: 60 },
  { id: '80x70', lebarMm: 80, tinggiMm: 70 },
  { id: '80x80', lebarMm: 80, tinggiMm: 80 },
] as const satisfies readonly UkuranKertasTermal[]

export type IdUkuranKertasTermal = (typeof UKURAN_KERTAS_TERMAL)[number]['id']

export const ID_UKURAN_KERTAS_TERMAL = UKURAN_KERTAS_TERMAL.map(
  (u) => u.id,
) as [IdUkuranKertasTermal, ...IdUkuranKertasTermal[]]

export const UKURAN_KERTAS_DEFAULT: IdUkuranKertasTermal = '58x40'

export function ukuranKertasDari(id: string | undefined): UkuranKertasTermal {
  return (
    UKURAN_KERTAS_TERMAL.find((u) => u.id === id) ??
    UKURAN_KERTAS_TERMAL.find((u) => u.id === UKURAN_KERTAS_DEFAULT)!
  )
}

export function labelUkuranKertas(u: UkuranKertasTermal): string {
  return `${u.lebarMm} × ${u.tinggiMm} mm`
}

export function lebarKolomEscPos(u: UkuranKertasTermal): number {
  return u.lebarMm >= 80 ? 48 : 32
}

export function ukuranKertasPoin(u: UkuranKertasTermal): {
  width: number
  height: number
} {
  const mmKePoin = 72 / 25.4
  return {
    width: Math.round(u.lebarMm * mmKePoin),
    height: Math.round(u.tinggiMm * mmKePoin),
  }
}
