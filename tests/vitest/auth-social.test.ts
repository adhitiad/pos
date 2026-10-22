import { describe, expect, it, beforeEach, vi } from 'vitest'

import { signInSocial } from '../../src/server/auth-social.js'
import { dispatchAuthEndpoint } from 'better-auth/api'
import { auth } from '#/lib/auth'

vi.mock('#/lib/auth', () => ({
  auth: {
    $context: Promise.resolve({}),
    api: { signInSocial: {} },
  },
}))

vi.mock('better-auth/api', () => ({
  dispatchAuthEndpoint: vi.fn(),
}))

describe('signInSocial', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user and session on valid idToken', async () => {
    const mockResponse = new Response(
      JSON.stringify({
        token: 'session-token-123',
        user: {
          id: 'user-1',
          name: 'Test User',
          email: 'test@example.com',
          image: null,
        },
      }),
      {
        status: 200,
        headers: { 'set-cookie': 'session=abc123; HttpOnly; Path=/' },
      },
    )

    vi.mocked(dispatchAuthEndpoint).mockResolvedValue(mockResponse)

    const result = await signInSocial({
      provider: 'google',
      idToken: 'valid-id-token',
      callbackURL: '/',
    })

    expect(result).toEqual({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      },
      session: { token: 'session-token-123' },
      setCookie: 'session=abc123; HttpOnly; Path=/',
    })

    expect(vi.mocked(dispatchAuthEndpoint)).toHaveBeenCalledWith(
      auth.api.signInSocial,
      expect.objectContaining({
        method: 'POST',
        body: expect.objectContaining({
          provider: 'google',
          idToken: expect.objectContaining({
            token: 'valid-id-token',
          }),
        }),
      }),
    )
  })

  it('throws UNAUTHORIZED on 401 response', async () => {
    const mockResponse = new Response(
      JSON.stringify({
        error: { code: 'INVALID_TOKEN', message: 'Invalid id token' },
      }),
      { status: 401 },
    )

    vi.mocked(dispatchAuthEndpoint).mockResolvedValue(mockResponse)

    await expect(
      signInSocial({
        provider: 'google',
        idToken: 'invalid-token',
        callbackURL: '/',
      }),
    ).rejects.toThrow('UNAUTHORIZED')
  })

  it('throws FORBIDDEN on 403 response', async () => {
    const mockResponse = new Response(
      JSON.stringify({
        error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email not verified' },
      }),
      { status: 403 },
    )

    vi.mocked(dispatchAuthEndpoint).mockResolvedValue(mockResponse)

    await expect(
      signInSocial({
        provider: 'google',
        idToken: 'valid-but-unverified-token',
        callbackURL: '/',
      }),
    ).rejects.toThrow('FORBIDDEN')
  })

  it('throws generic message on non-ok response without error body', async () => {
    const mockResponse = new Response(null, { status: 500 })

    vi.mocked(dispatchAuthEndpoint).mockResolvedValue(mockResponse)

    await expect(
      signInSocial({
        provider: 'google',
        idToken: 'some-token',
        callbackURL: '/',
      }),
    ).rejects.toThrow('Terjadi kesalahan')
  })
})
