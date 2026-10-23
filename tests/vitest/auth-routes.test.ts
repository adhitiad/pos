import { beforeEach, describe, expect, it, vi } from 'vitest'

import { Route as NativeRoute } from '../../src/routes/api/v1/auth-native'
import { Route as WebRoute } from '../../src/routes/api/v1/auth-social'
import { klienNativeId } from '#/server/auth-native'
import { signInSocial } from '#/server/auth-social'

vi.mock('#/server/api', () => ({
  ok: (data: unknown, status = 200) =>
    Response.json({ ok: true, data }, { status }),
  gagal: (code: string, message: string, status: number) =>
    Response.json({ ok: false, error: { code, message } }, { status }),
  apiError: (e: unknown) =>
    Response.json(
      { ok: false, error: { code: 'UNKNOWN', message: String(e) } },
      { status: 500 },
    ),
}))

vi.mock('#/server/rateLimit', () => ({
  rateLimit: vi.fn(async () => null),
}))

vi.mock('#/server/auth-native', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return { ...actual, klienNativeId: vi.fn(() => 'native-client') }
})

vi.mock('#/server/auth-social', () => ({
  signInSocial: vi.fn(),
}))

type Handler = (ctx: { request: Request }) => Promise<Response>

const handlerDari = (route: typeof WebRoute | typeof NativeRoute) =>
  (
    route.options.server as unknown as {
      handlers: { POST: Handler }
    }
  ).handlers.POST

const webPost = handlerDari(WebRoute)
const nativePost = handlerDari(NativeRoute)

const tokenDenganPayload = (payload: Record<string, unknown>) => {
  const header = Buffer.from(JSON.stringify({ alg: 'RS256' })).toString(
    'base64url',
  )
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${header}.${body}.tanda-tangan`
}

const requestAuth = (idToken: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/v1/auth-native', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({
      provider: 'google',
      idToken,
      callbackURL: '/',
    }),
  })

const hasil = {
  user: { id: 'u1', name: 'Uji', email: 'uji@example.test', image: null },
  session: { token: 'token-sesi' },
  setCookie: 'session=abc; HttpOnly; Path=/',
}

describe('route auth — pemisahan web/native', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(signInSocial).mockResolvedValue(hasil)
    vi.mocked(klienNativeId).mockReturnValue('native-client')
  })

  it('web tidak mendapat token walau mengirim x-client: expo palsu', async () => {
    const res = await webPost({
      request: requestAuth('id-token', { 'x-client': 'expo' }),
    })
    const body = (await res.json()) as {
      data: { user: unknown; session?: unknown }
    }

    expect(res.status).toBe(200)
    expect(body.data.user).toEqual(hasil.user)
    expect(body.data.session).toBeUndefined()
    expect(res.headers.get('set-cookie')).toContain('session=')
  })

  it('native dengan aud client native mendapat bearer token', async () => {
    const res = await nativePost({
      request: requestAuth(tokenDenganPayload({ aud: 'native-client' })),
    })
    const body = (await res.json()) as {
      data: { session: { token: string } }
    }

    expect(res.status).toBe(200)
    expect(body.data.session.token).toBe('token-sesi')
    expect(res.headers.get('set-cookie')).toBeNull()
  })

  it('native menolak token web dan tidak membuat sesi', async () => {
    const res = await nativePost({
      request: requestAuth(tokenDenganPayload({ aud: 'web-client' })),
    })

    expect(res.status).toBe(401)
    expect(signInSocial).not.toHaveBeenCalled()
  })

  it('native menolak bila client ID native belum dikonfigurasi', async () => {
    vi.mocked(klienNativeId).mockReturnValue(undefined)

    const res = await nativePost({
      request: requestAuth(tokenDenganPayload({ aud: 'native-client' })),
    })

    expect(res.status).toBe(503)
    expect(signInSocial).not.toHaveBeenCalled()
  })
})
