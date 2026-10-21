import { z } from 'zod'

export const SignInSocialSchema = z.object({
  provider: z.literal('google'),
  idToken: z.string().min(1, 'ID token wajib diisi'),
  accessToken: z.string().optional(),
  callbackURL: z
    .string()
    .startsWith('/', 'Harus relative path')
    .refine(
      (val) => !/^\/\//.test(val) && !/:\/\//.test(val),
      'Tidak boleh protocol-relative atau eksternal',
    )
    .default('/'),
})

export type SignInSocialInput = z.infer<typeof SignInSocialSchema>
