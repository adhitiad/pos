import { prisma } from '#/db'
import type { Prisma } from '#/generated/prisma/client.js'
import {
  KunjunganQuerySchema,
  RecordPageVisitSchema,
} from '#/validations/kunjungan'
import type {
  GrupKunjungan,
  KunjunganQueryInput,
  RecordPageVisitInput,
} from '#/validations/kunjungan'
import type { BarisKunjungan, DataKunjungan } from '#/types/kunjungan'

// Cek role user bila userId disertakan. Owner & kasir dikecualikan dari pencatatan.
async function resolveUserType(
  userId?: string,
): Promise<'member' | 'non-member' | null> {
  if (!userId) return 'non-member'
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  if (!user) return 'non-member'
  if (user.role === 'OWNER' || user.role === 'KASIR') return null // dikecualikan
  return 'member'
}

// Normalisasi path analytics: hanya path relatif internal (`/...`), tanpa
// scheme/host/query/hash, dipotong di 200 karakter. `null` bila tak valid.
export function normalkanPath(
  masukan: string | null | undefined,
): string | null {
  if (!masukan) return null
  let nilai = masukan.trim()
  if (!nilai) return null
  if (/^https?:\/\//i.test(nilai)) {
    try {
      nilai = new URL(nilai).pathname
    } catch {
      return null
    }
  }
  if (nilai.startsWith('//')) return null
  if (!nilai.startsWith('/')) nilai = `/${nilai}`
  nilai = nilai.split(/[?#]/)[0]
  if (nilai.length > 200) return null
  return nilai
}

export async function recordPageVisit(input: RecordPageVisitInput) {
  const data = RecordPageVisitSchema.parse(input)

  // Owner & kasir dikecualikan dari analytics
  const userType = await resolveUserType(data.userId)
  if (userType === null) return

  await prisma.pageVisit.create({
    data: {
      path: data.path,
      userId: data.userId ?? null,
      userType,
      ipAddress: data.ipAddress ?? null,
      userAgent: data.userAgent ?? null,
    },
  })
}

export function kunciPeriodeKunjungan(tgl: Date, grup: GrupKunjungan): string {
  const y = tgl.getFullYear()
  const m = String(tgl.getMonth() + 1).padStart(2, '0')
  const d = String(tgl.getDate()).padStart(2, '0')
  if (grup === 'tahunan') return String(y)
  if (grup === 'bulanan') return `${y}-${m}`
  if (grup === 'mingguan') {
    const dCopy = new Date(
      Date.UTC(tgl.getFullYear(), tgl.getMonth(), tgl.getDate()),
    )
    const hari = dCopy.getUTCDay() || 7
    dCopy.setUTCDate(dCopy.getUTCDate() + 4 - hari)
    const awalTahun = new Date(Date.UTC(dCopy.getUTCFullYear(), 0, 1))
    const minggu = Math.ceil(
      ((dCopy.getTime() - awalTahun.getTime()) / 86_400_000 + 1) / 7,
    )
    return `${dCopy.getUTCFullYear()}-W${String(minggu).padStart(2, '0')}`
  }
  return `${y}-${m}-${d}`
}

export async function kunjunganData(
  input: KunjunganQueryInput,
): Promise<DataKunjungan> {
  const data = KunjunganQuerySchema.parse(input)
  const awal = data.dari ? new Date(`${data.dari}T00:00:00`) : undefined
  const akhir = data.sampai
    ? new Date(`${data.sampai}T23:59:59.999`)
    : undefined

  const where: Prisma.PageVisitWhereInput = {
    ...(awal && { createdAt: { gte: awal } }),
    ...(akhir && { createdAt: { lte: akhir } }),
    ...(data.userType && { userType: data.userType }),
  }

  // Hanya kolom yang dipakai untuk rekap; halaman terpopuler diagregasi di SQL.
  const [visits, halamanRaw] = await Promise.all([
    prisma.pageVisit.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, userId: true, userType: true },
    }),
    prisma.pageVisit.groupBy({
      by: ['path'],
      where,
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 10,
    }),
  ])

  const petaPeriode = new Map<string, BarisKunjungan>()
  const petaUserType = new Map<string, number>()
  const penggunaSet = new Set<string>()

  for (const v of visits) {
    const tgl = new Date(v.createdAt)
    const periode = kunciPeriodeKunjungan(tgl, data.grup)
    const cur = petaPeriode.get(periode) ?? {
      tanggal: periode,
      jumlahKunjungan: 0,
      jumlahPenggunaUnik: 0,
      perUserType: [],
    }
    cur.jumlahKunjungan += 1
    if (v.userId) {
      penggunaSet.add(v.userId)
    }
    const utCur = cur.perUserType.find(
      (u: { userType: string; jumlah: number }) => u.userType === v.userType,
    )
    if (utCur) utCur.jumlah += 1
    else cur.perUserType.push({ userType: v.userType, jumlah: 1 })
    petaPeriode.set(periode, cur)

    const gtCur = petaUserType.get(v.userType) ?? 0
    petaUserType.set(v.userType, gtCur + 1)
  }

  const totalPenggunaUnik = penggunaSet.size

  const totalKunjungan = visits.length
  const hariCount = petaPeriode.size
  const rataRataPerHari =
    hariCount > 0 ? Math.round(totalKunjungan / hariCount) : 0

  const deret = [...petaPeriode.values()].sort((a, b) =>
    a.tanggal.localeCompare(b.tanggal),
  )
  const halamanTerpopuler = halamanRaw.map((h) => ({
    path: h.path,
    jumlah: h._count.path,
  }))

  // PageVisit tidak menyimpan klasifikasi/os → selalu 'tidak diketahui'.
  const perKlasifikasi =
    totalKunjungan > 0
      ? [{ klasifikasi: 'tidak diketahui', jumlah: totalKunjungan }]
      : []
  const perOS =
    totalKunjungan > 0
      ? [{ os: 'tidak diketahui', jumlah: totalKunjungan }]
      : []

  const dariStr = data.dari ?? ''
  const sampaiStr = data.sampai ?? ''

  return {
    dari: dariStr,
    sampai: sampaiStr,
    grup: data.grup,
    ringkasan: {
      totalKunjungan,
      totalPenggunaUnik,
      rataRataPerHari,
      perUserType: [...petaUserType.entries()].map(([userType, jumlah]) => ({
        userType,
        jumlah,
      })),
      perKlasifikasi,
      perOS,
    },
    deret,
    halamanTerpopuler,
  }
}
