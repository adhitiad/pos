import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { prisma } from '#/db'
import { parsePersenPengaturan } from '#/lib/persen'
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

  it('kasir tidak boleh mengubah pengaturan non-operasional', async () => {
    await expect(
      setPengaturan(
        { kunci: 'nama_toko', nilai: 'Diubah Kasir' },
        undefined,
        'KASIR',
      ),
    ).rejects.toThrow('FORBIDDEN')
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

  it('tarif pajak menerima 0–100 dan menolak kosong/invalid', () => {
    expect(parsePersenPengaturan('0')).toBe(0)
    expect(parsePersenPengaturan('100')).toBe(100)
    expect(parsePersenPengaturan('10.5')).toBe(10.5)
    expect(parsePersenPengaturan('')).toBeNull()
    expect(parsePersenPengaturan('   ')).toBeNull()
    expect(parsePersenPengaturan('abc')).toBeNull()
    expect(parsePersenPengaturan('-1')).toBeNull()
    expect(parsePersenPengaturan('101')).toBeNull()

    expect(
      SetPengaturanSchema.parse({ kunci: 'pajak_resto_persen', nilai: '11' }),
    ).toEqual({ kunci: 'pajak_resto_persen', nilai: '11' })
    expect(() =>
      SetPengaturanSchema.parse({ kunci: 'pajak_resto_persen', nilai: '' }),
    ).toThrow()
    expect(() =>
      SetPengaturanSchema.parse({ kunci: 'pajak_retail_persen', nilai: '101' }),
    ).toThrow()
    expect(() =>
      SetPengaturanSchema.parse({ kunci: 'pajak_persen', nilai: 'abc' }),
    ).toThrow()
  })

  it('mode_fnb dan stok_dikurangi_saat hanya menerima enum', () => {
    expect(
      SetPengaturanSchema.parse({ kunci: 'mode_fnb', nilai: 'true' }),
    ).toEqual({ kunci: 'mode_fnb', nilai: 'true' })
    expect(() =>
      SetPengaturanSchema.parse({ kunci: 'mode_fnb', nilai: 'ya' }),
    ).toThrow()

    expect(
      SetPengaturanSchema.parse({
        kunci: 'stok_dikurangi_saat',
        nilai: 'payment',
      }),
    ).toEqual({ kunci: 'stok_dikurangi_saat', nilai: 'payment' })
    expect(() =>
      SetPengaturanSchema.parse({
        kunci: 'stok_dikurangi_saat',
        nilai: 'kapan-saja',
      }),
    ).toThrow()
  })
})
