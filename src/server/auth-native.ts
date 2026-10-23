import { randomBytes } from 'node:crypto'

import { env } from '#/env'

// Header internal hanya untuk panggilan server-ke-server dari endpoint native
// ke Better Auth. Nilainya acak per proses dan tidak pernah dikirim ke klien.
export const NATIVE_AUTH_HEADER = 'x-pos-native-auth'
const NATIVE_AUTH_SECRET = randomBytes(32).toString('hex')

export function headerAuthNative(): Headers {
  return new Headers({ [NATIVE_AUTH_HEADER]: NATIVE_AUTH_SECRET })
}

export function permintaanAuthNative(headers: Headers | undefined): boolean {
  return headers?.get(NATIVE_AUTH_HEADER) === NATIVE_AUTH_SECRET
}

// Client ID native harus berbeda dari client ID web. Bila sama, token web juga
// akan lolos pemeriksaan audiens sehingga endpoint native tidak aman.
export function klienNativeId(): string | undefined {
  const native = env.GOOGLE_NATIVE_CLIENT_ID
  if (!native || !env.GOOGLE_CLIENT_ID || native === env.GOOGLE_CLIENT_ID) {
    return undefined
  }
  return native
}

function payloadIdToken(idToken: string): Record<string, unknown> | null {
  const bagian = idToken.split('.')
  if (bagian.length !== 3) return null
  try {
    const base64 = bagian[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = Buffer.from(base64, 'base64').toString('utf8')
    const payload: unknown = JSON.parse(json)
    return payload && typeof payload === 'object'
      ? (payload as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

// Better Auth sudah memverifikasi tanda tangan/issuer/audiens sebelum fungsi
// ini dipakai. Di sini kita hanya memastikan token memang diterbitkan untuk
// client ID native, bukan client ID web.
export function idTokenUntukKlienNative(
  idToken: string,
  clientId: string | undefined,
): boolean {
  if (!clientId) return false
  const payload = payloadIdToken(idToken)
  if (!payload) return false
  const aud = payload.aud
  if (Array.isArray(aud)) return aud.includes(clientId)
  return aud === clientId
}
