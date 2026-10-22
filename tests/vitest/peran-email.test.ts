import { describe, expect, it } from 'vitest'

import { peranDariEmail } from '#/lib/peran-email'

const daftar = {
  owner: 'adhitiadwima@gmail.com, owner2@toko.com',
  kasir: 'kasir1@toko.com',
}

describe('peranDariEmail', () => {
  it('email di OWNER_EMAILS → OWNER', () => {
    expect(peranDariEmail('adhitiadwima@gmail.com', daftar)).toBe('OWNER')
    expect(peranDariEmail('OWNER2@TOKO.COM', daftar)).toBe('OWNER')
  })

  it('email di KASIR_EMAILS → KASIR', () => {
    expect(peranDariEmail('kasir1@toko.com', daftar)).toBe('KASIR')
  })

  it('email tak terdaftar → null (peran tak diubah)', () => {
    expect(peranDariEmail('member@toko.com', daftar)).toBeNull()
    expect(peranDariEmail('', daftar)).toBeNull()
  })

  it('OWNER_EMAILS kosong → tak ada yang jadi OWNER', () => {
    expect(
      peranDariEmail('adhitiadwima@gmail.com', { owner: '', kasir: '' }),
    ).toBeNull()
  })
})
