import { describe, expect, it } from 'vitest'

import { tokenCronSah } from '#/server/cronAuth'

describe('tokenCronSah', () => {
  const secret = 'cron-secret-uji-1234567890'

  it('menerima bearer yang cocok', () => {
    expect(tokenCronSah(`Bearer ${secret}`, secret)).toBe(true)
  })

  it('menolak secret kosong, header salah, atau beda panjang', () => {
    expect(tokenCronSah(`Bearer ${secret}`, undefined)).toBe(false)
    expect(tokenCronSah(null, secret)).toBe(false)
    expect(tokenCronSah(secret, secret)).toBe(false)
    expect(tokenCronSah(`Bearer ${secret}x`, secret)).toBe(false)
    expect(tokenCronSah('Bearer secret-lain-1234567890', secret)).toBe(false)
  })
})
