import { describe, expect, it } from 'vitest'

import { hapusHeaderTokenSesi } from '#/lib/auth-native-guard'
import {
  NATIVE_AUTH_HEADER,
  headerAuthNative,
  idTokenUntukKlienNative,
  permintaanAuthNative,
} from '#/server/auth-native'
import {
  responsAuthNative,
  responsAuthWeb,
  tanpaTokenSesi,
} from '#/server/auth-response'
import type { SignInSocialResult } from '#/types/auth'

const tokenDenganPayload = (payload: Record<string, unknown>) => {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
    'base64url',
  )
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.tanda-tangan`
}

const hasil: SignInSocialResult = {
  user: { id: 'u1', name: 'Uji', email: 'uji@example.test', image: null },
  session: { token: 'token-sesi' },
  setCookie: 'session=abc; HttpOnly; Path=/',
}

describe('auth native — pemisahan jalur token', () => {
  it('menerima idToken dengan aud client native (string atau array)', () => {
    expect(
      idTokenUntukKlienNative(
        tokenDenganPayload({ aud: 'native-client' }),
        'native-client',
      ),
    ).toBe(true)
    expect(
      idTokenUntukKlienNative(
        tokenDenganPayload({ aud: ['web-client', 'native-client'] }),
        'native-client',
      ),
    ).toBe(true)
  })

  it('menolak idToken web, malformed, atau client native kosong', () => {
    expect(
      idTokenUntukKlienNative(
        tokenDenganPayload({ aud: 'web-client' }),
        'native-client',
      ),
    ).toBe(false)
    expect(idTokenUntukKlienNative('bukan-jwt', 'native-client')).toBe(false)
    expect(idTokenUntukKlienNative('a.b.c', 'native-client')).toBe(false)
    expect(idTokenUntukKlienNative('a.b.c', undefined)).toBe(false)
  })

  it('respons web tidak pernah memuat session/token', () => {
    expect(responsAuthWeb(hasil)).toEqual({ user: hasil.user })
    expect(responsAuthWeb(hasil)).not.toHaveProperty('session')
  })

  it('respons native memuat session untuk bearer', () => {
    expect(responsAuthNative(hasil)).toEqual({
      user: hasil.user,
      session: hasil.session,
    })
  })

  it('menghapus token sesi dari respons get-session/list-sessions', () => {
    expect(
      tanpaTokenSesi({
        session: { id: 's1', token: 'rahasia', userId: 'u1' },
        user: { id: 'u1' },
      }),
    ).toEqual({
      session: { id: 's1', userId: 'u1' },
      user: { id: 'u1' },
    })
    expect(
      tanpaTokenSesi([
        { id: 's1', token: 'rahasia-1' },
        { id: 's2', token: 'rahasia-2' },
      ]),
    ).toEqual([{ id: 's1' }, { id: 's2' }])
  })

  it('menghapus header set-auth-token dan expose-nya', () => {
    const headers = new Headers({
      'set-auth-token': 'token-sesi',
      'access-control-expose-headers': 'set-auth-token, x-lain',
    })
    hapusHeaderTokenSesi(headers)
    expect(headers.get('set-auth-token')).toBeNull()
    expect(headers.get('access-control-expose-headers')).toBe('x-lain')
  })

  it('header internal acak tidak bisa dipalsukan', () => {
    expect(permintaanAuthNative(headerAuthNative())).toBe(true)
    expect(
      permintaanAuthNative(
        new Headers({ [NATIVE_AUTH_HEADER]: 'nilai-palsu' }),
      ),
    ).toBe(false)
    expect(permintaanAuthNative(new Headers())).toBe(false)
  })
})
