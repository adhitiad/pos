import type { prisma } from '#/db'

// Client Prisma di dalam $transaction (tx).
export type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]
