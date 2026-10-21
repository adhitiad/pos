// Hasil pemeriksaan rate limit bersama (Postgres).
export interface HasilBatasi {
  boleh: boolean
  retryAfter: number
}
