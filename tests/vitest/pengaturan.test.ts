import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { pengaturanData, setPengaturan } from '#/server/pengaturan'
import { SetPengaturanSchema } from '#/validations/pengaturan'

let asli!: Awaited<ReturnType<typeof pengaturanData>>

beforeAll(async () => {
  asli = await pengaturanData()
})

const pulihkan = async (
  kunci:
    | 'judul_app'
    | 'mode_fnb'
    | 'nama_toko'
    | 'struk_otomatis'
    | 'ukuran_kertas_termal',
  nilai: string | undefined,
) => {
  if (nilai === undefined) {
    await prisma.pengaturan.deleteMany({ where: { kunci } })
  } else {
    await setPengaturan({ kunci, nilai })
  }
}

afterAll(async () => {
  await pulihkan('judul_app', asli.semua.judul_app)
  await pulihkan('mode_fnb', asli.semua.mode_fnb)
  await pulihkan('nama_toko', asli.semua.nama_toko)
  await pulihkan('struk_otomatis', asli.semua.struk_otomatis)
  await pulihkan('ukuran_kertas_termal', asli.semua.ukuran_kertas_termal)
})

describe('pengaturan', () => {
  it('set lalu baca kembali nilai teks', async () => {
    await setPengaturan({ kunci: 'judul_app', nilai: 'Judul Uji' })
    const d = await pengaturanData()
    expect(d.judulApp).toBe('Judul Uji')
    expect(d.semua.judul_app).toBe('Judul Uji')
  })

  it('mode_fnb diserialkan ke boolean', async () => {
    await setPengaturan({ kunci: 'mode_fnb', nilai: 'false' })
    expect((await pengaturanData()).modeFnb).toBe(false)
    await setPengaturan({ kunci: 'mode_fnb', nilai: 'true' })
    expect((await pengaturanData()).modeFnb).toBe(true)
  })

  it('nilai default saat baris belum ada', async () => {
    await prisma.pengaturan.deleteMany({ where: { kunci: 'nama_toko' } })
    expect((await pengaturanData()).namaToko).toBe('POS')
  })

  it('struk_otomatis divalidasi dan dibaca sebagai mode', async () => {
    await prisma.pengaturan.deleteMany({ where: { kunci: 'struk_otomatis' } })
    expect((await pengaturanData()).strukOtomatis).toBe('nonaktif')

    await setPengaturan({ kunci: 'struk_otomatis', nilai: 'pdf' })
    expect((await pengaturanData()).strukOtomatis).toBe('pdf')

    expect(() =>
      SetPengaturanSchema.parse({ kunci: 'struk_otomatis', nilai: 'salah' }),
    ).toThrow()
  })

  it('ukuran kertas thermal divalidasi dan dibaca kembali', async () => {
    await prisma.pengaturan.deleteMany({
      where: { kunci: 'ukuran_kertas_termal' },
    })
    expect((await pengaturanData()).ukuranKertasTermal).toBe('58x40')

    await setPengaturan({
      kunci: 'ukuran_kertas_termal',
      nilai: '80x80',
    })
    expect((await pengaturanData()).ukuranKertasTermal).toBe('80x80')

    expect(() =>
      SetPengaturanSchema.parse({
        kunci: 'ukuran_kertas_termal',
        nilai: '99x99',
      }),
    ).toThrow()
  })
})
