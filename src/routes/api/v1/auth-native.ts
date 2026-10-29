import { createFileRoute } from '@tanstack/react-router'

import { apiError, gagal, ok, denganRequestId } from '#/server/api'
import { idTokenUntukKlienNative, klienNativeId } from '#/server/auth-native'
import { responsAuthNative } from '#/server/auth-response'
import { rateLimit } from '#/server/rateLimit'
import { SignInSocialSchema } from '#/validations/auth-social'
import { signInSocial } from '#/server/auth-social'

export const Route = createFileRoute('/api/v1/auth-native')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        return denganRequestId(request, async () => {
          try {
            const rl = await rateLimit(request, 5)
            if (rl) return rl
            const clientId = klienNativeId()
            if (!clientId) {
              return gagal(
                'NOT_CONFIGURED',
                'Login native belum dikonfigurasi',
                503,
              )
            }
            const input = SignInSocialSchema.parse(await request.json())
            if (!idTokenUntukKlienNative(input.idToken, clientId)) {
              return gagal(
                'UNAUTHORIZED',
                'Token bukan untuk klien native',
                401,
              )
            }
            const result = await signInSocial(input)
            return ok(responsAuthNative(result))
          } catch (e) {
            return apiError(e)
          }
        })
      },
    },
  },
})
