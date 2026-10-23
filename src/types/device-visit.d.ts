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
  terakhirDilihat: string
  jumlahKunjungan: number
}

export type OsDevice = 'mac' | 'windows' | 'android' | 'ios' | 'linux'
export type KlasifikasiDevice = 'hp' | 'tablet' | 'laptop' | 'pc' | 'mobil'

// Metadata perangkat yang diturunkan server dari User-Agent (SEC-24).
export interface PerangkatTerdeteksi {
  os: OsDevice
  klasifikasi: KlasifikasiDevice
  deviceName: string
}

// Token analytics bertanda tangan server. Klien hanya menyimpan & mengirim
// token ini; identitas perangkat tidak pernah dipercaya dari body.
export interface TokenPerangkat {
  token: string
  berlakuSampai: string
}

export interface MuatanTokenDevice {
  v: 1
  d: string
  u: string
  e: number
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
