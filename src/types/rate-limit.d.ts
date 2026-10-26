// Hasil pemeriksaan rate limit bersama (Postgres).
export interface HasilBatasi {
  boleh: boolean
  retryAfter: number
}

export interface HasilHitungToken extends HasilBatasi {
  tokenMili: number
}

export interface PilihanIpKlien {
  xForwardedFor?: string | null
  socketIp?: string | null
  trustProxy?: boolean
  hops?: number
}
