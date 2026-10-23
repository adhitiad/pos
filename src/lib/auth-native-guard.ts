import type { BetterAuthPlugin, HookEndpointContext } from '@better-auth/core'
import { APIError, createAuthMiddleware } from 'better-auth/api'

import { permintaanAuthNative } from '#/server/auth-native'
import { tanpaTokenSesi } from '#/server/auth-response'

// Better Auth sendiri juga mengekspos /sign-in/social dengan idToken dan
// mengembalikan token sesi di body. Blokir jalur itu untuk request HTTP biasa;
// hanya endpoint native kita yang boleh memakai header internal.
export const nativeIdTokenGuard: BetterAuthPlugin = {
  id: 'native-id-token-guard',
  hooks: {
    before: [
      {
        matcher: (ctx: HookEndpointContext) =>
          ctx.path === '/sign-in/social' && Boolean(ctx.body?.idToken),
        handler: createAuthMiddleware(async (ctx) => {
          if (!permintaanAuthNative(ctx.headers ?? ctx.request?.headers)) {
            throw APIError.from('UNAUTHORIZED', {
              code: 'INVALID_ID_TOKEN_PATH',
              message: 'ID token hanya diterima lewat endpoint native',
            })
          }
        }),
      },
    ],
  },
}

// Token sesi Better Auth juga muncul di body /get-session dan /list-sessions.
// Web cukup memakai cookie httpOnly; jangan bocorkan token yang bisa dipakai
// sebagai bearer ke JavaScript.
export function hapusHeaderTokenSesi(headers: Headers | undefined) {
  headers?.delete('set-auth-token')
  const exposed = headers?.get('access-control-expose-headers')
  if (!headers || !exposed) return
  const tersisa = exposed
    .split(',')
    .map((nama) => nama.trim())
    .filter((nama) => nama && nama.toLowerCase() !== 'set-auth-token')
  if (tersisa.length) {
    headers.set('access-control-expose-headers', tersisa.join(', '))
  } else {
    headers.delete('access-control-expose-headers')
  }
}

export const sembunyikanTokenSesi: BetterAuthPlugin = {
  id: 'sembunyikan-token-sesi',
  hooks: {
    after: [
      {
        matcher: () => true,
        handler: createAuthMiddleware(async (ctx) => {
          // Bearer plugin menambahkan `set-auth-token` bila respons menyetel
          // cookie sesi; header itu juga setara bearer dan bisa dibaca JS.
          // Mobile memakai token dari /api/v1/auth-native, bukan header ini.
          hapusHeaderTokenSesi(ctx.context.responseHeaders)
          if (ctx.path !== '/get-session' && ctx.path !== '/list-sessions') {
            return
          }
          let data: unknown = ctx.context.returned
          if (data instanceof Response) {
            data = await data.clone().json()
          }
          if (data === undefined || data === null) return
          return ctx.json(tanpaTokenSesi(data))
        }),
      },
    ],
  },
}
