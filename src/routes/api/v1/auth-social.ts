import { createFileRoute } from '@tanstack/react-router'

import { apiError, ok } from '#/server/api'
import { responsAuthWeb } from '#/server/auth-response'
import { rateLimit } from '#/server/rateLimit'
import { SignInSocialSchema } from '#/validations/auth-social'
import { signInSocial } from '#/server/auth-social'

export const Route = createFileRoute('/api/v1/auth-social')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const rl = await rateLimit(request, 5)
          if (rl) return rl
          const input = SignInSocialSchema.parse(await request.json())
          const result = await signInSocial(input)
          // Web selalu hanya menerima user + cookie httpOnly. Token bearer
          // hanya keluar dari endpoint native yang memverifikasi audiens.
          const response = ok(responsAuthWeb(result))
          if (result.setCookie) {
            response.headers.append('set-cookie', result.setCookie)
          }
          return response
        } catch (e) {
          return apiError(e)
        }
      },
    },
  },
})
