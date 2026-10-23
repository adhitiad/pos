import { z } from 'zod'

// Endpoint analytics tidak lagi menerima deviceId/os/klasifikasi/lokasi dari
// klien. Klien hanya mengirim token yang diterbitkan server (SEC-24).
export const DeviceVisitSchema = z.object({
  token: z.string().min(20, 'Token perangkat tidak valid').max(2048),
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
