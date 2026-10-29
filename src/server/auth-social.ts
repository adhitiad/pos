import { auth } from '#/lib/auth'
import type { AuthContext } from '@better-auth/core'
import { dispatchAuthEndpoint } from 'better-auth/api'

import { env } from '#/env'
import { headerAuthNative, idTokenUntukKlienNative } from './auth-native.js'
import type { SignInSocialInput } from '#/validations/auth-social'
import type { SignInSocialResult } from '#/types/auth'

export async function signInSocial(
  input: SignInSocialInput,
): Promise<SignInSocialResult> {
  // Endpoint web tidak boleh menerima ID token yang diterbitkan untuk
  // client native. Tolak bila audiensnya client native.
  if (idTokenUntukKlienNative(input.idToken, env.GOOGLE_NATIVE_CLIENT_ID)) {
    throw new Error('FORBIDDEN')
  }
  const ctx = (await auth.$context) as unknown as AuthContext
  let response: unknown
  try {
    response = await dispatchAuthEndpoint(auth.api.signInSocial, {
      context: ctx,
      body: {
        provider: input.provider,
        idToken: {
          token: input.idToken,
          accessToken: input.accessToken ?? undefined,
          user: {},
        },
        callbackURL: input.callbackURL,
      },
      // Hanya panggilan internal ini yang boleh memakai jalur idToken Better
      // Auth; request HTTP langsung dari browser ditolak plugin guard.
      headers: headerAuthNative(),
      method: 'POST',
      asResponse: true,
    })
  } catch (e) {
    if (e instanceof Error) throw e
    throw new Error('UNKNOWN')
  }

  if (!(response instanceof Response)) {
    throw new Error('UNKNOWN')
  }

  if (!response.ok) {
    const status = response.status
    let message = 'Terjadi kesalahan'
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      if (body.error?.message) message = body.error.message
    } catch {}
    if (status === 401) throw new Error('UNAUTHORIZED')
    if (status === 403) throw new Error('FORBIDDEN')
    throw new Error(message)
  }

  const data = (await response.json()) as {
    token?: string
    user?: { id: string; name: string; email: string; image?: string | null }
  }

  if (!data.token || !data.user) {
    throw new Error('UNKNOWN')
  }

  return {
    user: data.user,
    session: { token: data.token },
    setCookie: response.headers.get('set-cookie') ?? null,
  }
}
