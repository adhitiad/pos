import type { SignInSocialResult } from '#/types/auth'

// Web hanya boleh menerima user + cookie httpOnly. Token bearer tidak pernah
// dimasukkan ke body respons web, termasuk bila klien mengirim header palsu.
export function responsAuthWeb(result: SignInSocialResult) {
  return { user: result.user }
}

// Endpoint native terpisah boleh mengembalikan token karena request sudah
// diverifikasi lewat audiens ID token client native.
export function responsAuthNative(result: SignInSocialResult) {
  return { user: result.user, session: result.session }
}

// Better Auth mengembalikan `session.token` di /get-session dan
// /list-sessions. Token itu setara bearer, jadi jangan pernah sampai ke web
// yang hanya boleh memakai cookie httpOnly. Hapus secara rekursif dari bentuk
// { session, user } maupun array sesi.
export function tanpaTokenSesi<T>(data: T): T {
  if (Array.isArray(data)) {
    return data.map((item) => tanpaTokenSesi(item)) as T
  }
  if (!data || typeof data !== 'object') return data
  const obj = { ...(data as Record<string, unknown>) }
  delete obj.token
  if ('session' in obj) obj.session = tanpaTokenSesi(obj.session)
  return obj as T
}
