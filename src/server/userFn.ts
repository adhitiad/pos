import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { userData, updateUserRole, revokeUserSessions } from './user.js'
import { UserIdSchema, UserRoleSchema } from '#/validations/user'

export const userDataFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    await requireOwner()
    return userData()
  },
)

export const updateUserRoleFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UserRoleSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return updateUserRole(data, pengguna.id)
  })

export const revokeUserSessionsFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UserIdSchema.parse(input))
  .handler(async ({ data }) => {
    const pengguna = await requireOwner()
    return revokeUserSessions(data, pengguna.id)
  })
