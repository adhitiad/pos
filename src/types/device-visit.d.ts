export interface DeviceVisitRow {
  id: string
  deviceId: string
  deviceName: string | null
  os: string
  ipv4: string | null
  ipv6: string | null
  dns: string | null
  lokasi: string | null
  klasifikasi: string
  userId: string | null
  userType: string
  createdAt: string
}

// Filter query GET /api/v1/device-visit.
export interface FilterDeviceVisit {
  deviceId?: string
  userId?: string
  userType?: 'member' | 'non-member'
  klasifikasi?: string
  dari?: string
  sampai?: string
  limit?: number
}
