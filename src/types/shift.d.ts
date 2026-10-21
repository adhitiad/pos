import type { dataShift } from '#/server/shift'

export type DataShift = Awaited<ReturnType<typeof dataShift>>
export type ShiftRingkas = DataShift['riwayat'][number]
