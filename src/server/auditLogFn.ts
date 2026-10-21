import { createServerFn } from '@tanstack/react-start'

import { requireOwner } from './auth.js'
import { auditLogData } from './auditLog.js'
import { AuditLogQuerySchema } from '#/validations/audit'

export const auditLogDataFn = createServerFn({ method: 'GET' })
  .validator((input: unknown) => AuditLogQuerySchema.parse(input))
  .handler(async ({ data }) => {
    await requireOwner()
    return auditLogData(data)
  })
