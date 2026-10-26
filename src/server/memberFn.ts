import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import {
  memberPage,
  memberRiwayat,
  createMember,
  hapusMember,
  updateMember,
} from './member.js'
import {
  MemberIdSchema,
  MemberInputSchema,
  MemberQuerySchema,
  UpdateMemberSchema,
} from '#/validations/member'

export const memberDataFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => MemberQuerySchema.parse(input ?? {}))
  .handler(async ({ data }) => {
    await requireOwner()
    return memberPage(data)
  })

export const memberRiwayatFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => MemberIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return memberRiwayat(data.id)
  })

export const createMemberFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => MemberInputSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return createMember(data)
  })

export const updateMemberFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => UpdateMemberSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return updateMember(data)
  })

export const hapusMemberFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => MemberIdSchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return hapusMember(data)
  })
