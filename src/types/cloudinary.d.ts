export interface HasilUnggahCloudinary {
  secure_url: string
  public_id: string
  width: number
  height: number
  format: string
  bytes: number
}

export interface GalatUnggahCloudinary {
  error?: { message?: string }
}

// Parameter tanda tangan upload dari server (POST /api/v1/unggah).
export interface TandaTanganUnggah {
  cloudName: string
  apiKey: string
  timestamp: number
  folder: string
  allowedFormats: string
  maxFileSize: number
  signature: string
}
