import type { Role } from '#/generated/prisma/enums.js'

export interface Pengguna {
  id: string
  name: string
  email: string
  image?: string | null
  role: Role
}

export interface SignInSocialResult {
  user: { id: string; name: string; email: string; image?: string | null }
  session: { token: string }
  setCookie: string | null
}
