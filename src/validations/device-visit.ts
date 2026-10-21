import { z } from 'zod'

export const DeviceVisitSchema = z.object({
  deviceId: z.string().min(1, 'Device ID wajib diisi'),
  deviceName: z.string().optional(),
  os: z.enum(['mac', 'windows', 'android', 'ios', 'linux']),
  ipv4: z.string().optional(),
  ipv6: z.string().optional(),
  dns: z.string().optional(),
  lokasi: z.string().optional(),
  klasifikasi: z.enum(['hp', 'tablet', 'laptop', 'pc', 'mobil']),
  userId: z.string().optional(),
})

export type DeviceVisitInput = z.infer<typeof DeviceVisitSchema>

export const DeviceVisitQuerySchema = z.object({
  deviceId: z.string().optional(),
  userId: z.string().optional(),
  userType: z.enum(['member', 'non-member']).optional(),
  klasifikasi: z.enum(['hp', 'tablet', 'laptop', 'pc', 'mobil']).optional(),
  dari: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  sampai: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
})

export type DeviceVisitQueryInput = z.infer<typeof DeviceVisitQuerySchema>
