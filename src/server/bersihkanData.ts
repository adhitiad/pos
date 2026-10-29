import { prisma } from '#/db'

// Batas higiene penyimpanan per entitas (dalam hari).
const BATAS_PRINT_JOB_HARI = 30
const BATAS_DRAFT_TRANSASKSI_HARI = 14

export interface HasilBersihkan {
  printJobDihapus: number
  draftTransaksiDihapus: number
}

function batasTanggal(hari: number): Date {
  return new Date(Date.now() - hari * 24 * 60 * 60 * 1000)
}

export async function bersihkanPrintJobKadaluarsa(): Promise<number> {
  const batas = batasTanggal(BATAS_PRINT_JOB_HARI)

  const hasil = await prisma.printJob.deleteMany({
    where: {
      createdAt: { lt: batas },
      status: { in: ['DICETAK', 'GAGAL'] },
    },
  })

  return hasil.count
}

export async function bersihkanDraftTransaksiKadaluarsa(): Promise<number> {
  const batas = batasTanggal(BATAS_DRAFT_TRANSASKSI_HARI)

  const hasil = await prisma.draftTransaksi.deleteMany({
    where: {
      createdAt: { lt: batas },
      status: 'MENUNGGU',
    },
  })

  return hasil.count
}

export async function bersihkanDataKadaluarsa(): Promise<HasilBersihkan> {
  const [printJobDihapus, draftTransaksiDihapus] = await Promise.all([
    bersihkanPrintJobKadaluarsa(),
    bersihkanDraftTransaksiKadaluarsa(),
  ])

  return { printJobDihapus, draftTransaksiDihapus }
}
