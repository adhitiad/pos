import { prisma } from '#/db'
import { GalatDomain } from './galat.js'
import { catatAudit } from './audit.js'

/**
 * Reset database ke kondisi "baru" untuk mode production.
 *
 * Hanya OWNER yang boleh memanggil ini. Akun OWNER sendiri (dan minimal satu
 * OWNER lainnya) tidak boleh dihapus — semua user non-OWNER dihapus, seluruh
 * data transaksi & master dibersihkan, sesi dibatalkan agar paksa login ulang.
 * Pengaturan toko (pajak, identitas, mode F&B, dst.) dipertahankan.
 *
 * Mengembalikan progress per tabel untuk ditampilkan di UI.
 */
export async function resetDatabase(aktorId: string): Promise<{
  dihapus: Record<string, number>
  pesan: string
}> {
  // Pastikan aktor adalah OWNER dan tidak boleh menghapus dirinya sendiri
  // sebagai OWNER terakhir (RBAC: pemilik tidak bisa menghapus pemilik).
  const aktor = await prisma.user.findUnique({
    where: { id: aktorId },
    select: { id: true, email: true, role: true },
  })
  if (!aktor) throw new GalatDomain('User tidak ditemukan')
  if (aktor.role !== 'OWNER')
    throw new GalatDomain('Hanya OWNER yang boleh reset database')

  const sisaOwner = await prisma.user.count({ where: { role: 'OWNER' } })
  if (sisaOwner <= 1) {
    throw new GalatDomain(
      'Tidak dapat reset database: harus tersisa minimal satu akun OWNER.',
    )
  }

  const dihapus: Record<string, number> = {}

  // ── Hapus data transaksi & turunan (urutan penting: anak sebelum induk) ──
  dihapus.transaksiItemModifier = (
    await prisma.transaksiItemModifier.deleteMany()
  ).count
  dihapus.returItem = (await prisma.returItem.deleteMany()).count
  dihapus.transaksiItem = (await prisma.transaksiItem.deleteMany()).count
  dihapus.printJob = (await prisma.printJob.deleteMany()).count
  dihapus.jurnalDetail = (await prisma.jurnalDetail.deleteMany()).count
  dihapus.jurnal = (await prisma.jurnal.deleteMany()).count
  dihapus.pembayaran = (await prisma.pembayaran.deleteMany()).count
  dihapus.transaksi = (await prisma.transaksi.deleteMany()).count
  dihapus.retur = (await prisma.retur.deleteMany()).count
  dihapus.stokOpnameItem = (await prisma.stokOpnameItem.deleteMany()).count
  dihapus.stokOpname = (await prisma.stokOpname.deleteMany()).count
  dihapus.pembayaranHutang = (await prisma.pembayaranHutang.deleteMany()).count
  dihapus.pembelianBahan = (await prisma.pembelianBahan.deleteMany()).count
  dihapus.draftTransaksi = (await prisma.draftTransaksi.deleteMany()).count
  dihapus.transaksiReviewAudit = (
    await prisma.transaksiReviewAudit.deleteMany()
  ).count
  dihapus.pesananDraf = (await prisma.pesananDraf.deleteMany()).count

  // ── Hapus master data ──
  dihapus.notifikasi = (await prisma.notifikasi.deleteMany()).count
  dihapus.shift = (await prisma.shift.deleteMany()).count
  dihapus.member = (await prisma.member.deleteMany()).count
  dihapus.delivery = (await prisma.delivery.deleteMany()).count
  dihapus.meja = (await prisma.meja.deleteMany()).count
  dihapus.modifier = (await prisma.modifier.deleteMany()).count
  dihapus.modifierGrup = (await prisma.modifierGrup.deleteMany()).count
  dihapus.produkBahan = (await prisma.produkBahan.deleteMany()).count
  dihapus.produkModifierGrup = (
    await prisma.produkModifierGrup.deleteMany()
  ).count
  dihapus.produk = (await prisma.produk.deleteMany()).count
  dihapus.bahan = (await prisma.bahan.deleteMany()).count
  dihapus.supplier = (await prisma.supplier.deleteMany()).count
  dihapus.kategori = (await prisma.kategori.deleteMany()).count
  dihapus.akun = (await prisma.akun.deleteMany()).count

  // ── User: hapus semua non-OWNER, jangan sentuh OWNER (termasuk aktor sendiri) ──
  dihapus.user = (
    await prisma.user.deleteMany({
      where: { role: { not: 'OWNER' } },
    })
  ).count

  // ── Sesi & autentikasi: paksa login ulang setelah reset ──
  dihapus.session = (await prisma.session.deleteMany()).count
  dihapus.account = (await prisma.account.deleteMany()).count
  dihapus.verification = (await prisma.verification.deleteMany()).count

  // ── Sistem ──
  dihapus.rateLimit = (await prisma.rateLimit.deleteMany()).count
  dihapus.nomorHarian = (await prisma.nomorHarian.deleteMany()).count
  dihapus.auditLog = (await prisma.auditLog.deleteMany()).count
  dihapus.deviceVisit = (await prisma.deviceVisit.deleteMany()).count
  dihapus.pageVisit = (await prisma.pageVisit.deleteMany()).count
  dihapus.printer = (await prisma.printer.deleteMany()).count

  // ── Catat audit ──
  await catatAudit({
    aktorId: aktor.id,
    aksi: 'database.reset',
    entitas: 'Database',
    entitasId: null,
    sebelum: null,
    sesudah: { dihapusTabel: dihapus, sisaOwner },
    catatan: 'Database di-reset ke kondisi baru oleh OWNER',
  })

  const totalDihapus = Object.values(dihapus).reduce((a, b) => a + b, 0)
  return {
    dihapus,
    pesan: `Database di-reset: ${totalDihapus} baris dihapus dari ${
      Object.keys(dihapus).length
    } tabel. OWNER (${aktor.email}) dan pengaturan toko dipertahankan.`,
  }
}
