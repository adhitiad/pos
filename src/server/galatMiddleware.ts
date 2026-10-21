import { createMiddleware } from '@tanstack/react-start'
import type { GalatDomain, GalatRateLimit, terjemahGalat } from './galat.js'

// PENTING: src/start.ts juga di-import di klien. `./galat.js` menarik pino/env;
// muat hanya saat handler jalan (server) agar tidak masuk bundle klien.
type ModulGalat = {
  GalatDomain: typeof GalatDomain
  GalatRateLimit: typeof GalatRateLimit
  terjemahGalat: typeof terjemahGalat
}

let modulGalat: Promise<ModulGalat> | undefined

function ambilGalat() {
  modulGalat ??= import('./galat.js')
  return modulGalat
}

// Middleware server function: klien hanya menerima pesan yang aman.
// Nilai non-Error (redirect/notFound TanStack) diteruskan apa adanya.
export const galatMiddleware = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const { GalatDomain, GalatRateLimit, terjemahGalat } = await ambilGalat()
    try {
      return await next()
    } catch (e) {
      if (!(e instanceof Error)) throw e
      if (e instanceof GalatRateLimit) throw e
      throw new GalatDomain(terjemahGalat(e).message)
    }
  },
)
