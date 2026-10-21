import { createFileRoute } from '@tanstack/react-router'

import { apiError, ok } from '#/server/api'
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
          // Token sesi hanya untuk klien seluler (Expo) yang menyatakan diri
          // lewat header `x-client: expo`. Web hanya menerima cookie httpOnly
          // agar token tidak terbaca skrip (XSS).
          const seluler =
            request.headers.get('x-client')?.toLowerCase() === 'expo'
          const data: {
            user: typeof result.user
            session?: typeof result.session
          } = { user: result.user }
          if (seluler) data.session = result.session
          const response = ok(data)
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
