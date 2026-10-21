import { createMiddleware } from '@tanstack/react-start'
import { setResponseHeader } from '@tanstack/react-start/server'
import type { Logger } from 'pino'

// PENTING: src/start.ts juga di-import di klien. Impor pino (env/fs) secara
// statis akan ikut ke bundle klien → muat logger hanya saat handler jalan (server).
let modulLogger: Promise<{ logger: Logger }> | undefined

function ambilLogger() {
  modulLogger ??= import('#/lib/logger')
  return modulLogger
}

// Aset statis tidak perlu dicatat di level info (berisik).
const ASET_STATIS =
  /\.(?:css|js|mjs|map|png|jpe?g|webp|svg|ico|gif|woff2?|ttf|txt|xml)$/i

// Middleware request: catat satu baris terstruktur per permintaan (method,
// path, status, durasi) + id permintaan untuk korelasi. Logger pino sudah
// meredaksi kredensial/PII, jadi tidak ada header sensitif yang ditulis.
export const logMiddleware = createMiddleware().server(
  async ({ next, request, pathname, handlerType }) => {
    const { logger } = await ambilLogger()
    const reqId =
      request.headers.get('x-request-id')?.slice(0, 64) ?? crypto.randomUUID()
    const mulai = performance.now()
    try {
      const hasil = await next()
      const status = hasil.response.status
      const data = {
        kind: 'request',
        reqId,
        method: request.method,
        path: pathname,
        status,
        ms: Math.round(performance.now() - mulai),
        handlerType,
      }
      if (status >= 500) logger.error(data, 'permintaan gagal')
      else if (ASET_STATIS.test(pathname)) logger.debug(data, 'permintaan aset')
      else logger.info(data, 'permintaan')
      setResponseHeader('x-request-id', reqId)
      return hasil
    } catch (e) {
      logger.error(
        {
          kind: 'request',
          reqId,
          method: request.method,
          path: pathname,
          ms: Math.round(performance.now() - mulai),
          handlerType,
          err: e,
        },
        'permintaan error tak tertangani',
      )
      throw e
    }
  },
)
