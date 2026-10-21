import { createRequire } from 'node:module'

import pino from 'pino'

import { env } from '#/env'

// Logger terstruktur (pino). JSON di produksi (mudah dikumpulkan/query),
// human-friendly di dev. JANGAN pernah menulis kredensial/PII ke log:
// jalur `redact` menutupinya walau ada yang lupa.
const DEV = process.env.NODE_ENV !== 'production'
const PRODUKSI = process.env.NODE_ENV === 'production'
const level = env.LOG_LEVEL ?? (DEV ? 'debug' : 'info')
// Pretty hanya di dev nyata — jangan di test/build.
const PRETTY = !PRODUKSI && process.env.NODE_ENV !== 'test'

const opsi = {
  level,
  base: { app: 'pos', env: DEV ? 'development' : 'production' },
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'headers.authorization',
      'headers.cookie',
      'authorization',
      'cookie',
      'password',
      'token',
      'secret',
      '*.password',
      '*.token',
      '*.secret',
      'email',
      '*.email',
      'body.password',
      'body.token',
    ],
    censor: '[REDACTED]',
  },
}

// pino-pretty dipasang sebagai stream di proses yang sama, bukan lewat
// `transport` (worker thread): worker pino menyelesaikan target lewat
// `createRequire` pada frame stack pemanggil, yang tak tersedia di
// environment ESM Vite → "unable to determine transport target".
// Stream di proses yang sama memberi output rapi tanpa thread tambahan.
function streamPretty(): NodeJS.WritableStream | undefined {
  if (!PRETTY) return undefined
  try {
    const require = createRequire(import.meta.url)
    const build = require('pino-pretty') as (
      opts: Record<string, unknown>,
    ) => NodeJS.WritableStream
    return build({
      colorize: true,
      translateTime: 'SYS:HH:MM:ss.l',
      ignore: 'pid,hostname,app,env',
    })
  } catch {
    // Tanpa pretty pun log tetap JSON — tak boleh menggagalkan aplikasi.
    return undefined
  }
}

const stream = streamPretty()

export const logger = stream ? pino(opsi, stream) : pino(opsi)
