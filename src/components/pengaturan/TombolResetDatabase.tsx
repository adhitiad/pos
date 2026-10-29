'use client'

import { useState } from 'react'
import { Database, Loader2, Trash2 } from 'lucide-react'

import { m } from '#/paraglide/messages'
import { resetDatabaseFn } from '#/server/resetDatabaseFn'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { Divider } from '#/components/ui/divider'

// Tabel yang ditampilkan di progress (urutan seperti eksekusi backend).
const TABEL_PROGRESS = [
  'transaksiItemModifier',
  'returItem',
  'transaksiItem',
  'printJob',
  'jurnalDetail',
  'jurnal',
  'pembayaran',
  'transaksi',
  'retur',
  'stokOpnameItem',
  'stokOpname',
  'pembayaranHutang',
  'pembelianBahan',
  'draftTransaksi',
  'transaksiReviewAudit',
  'pesananDraf',
  'notifikasi',
  'shift',
  'member',
  'delivery',
  'meja',
  'modifier',
  'modifierGrup',
  'produkBahan',
  'produkModifierGrup',
  'produk',
  'bahan',
  'supplier',
  'kategori',
  'akun',
  'user',
  'session',
  'account',
  'verification',
  'rateLimit',
  'nomorHarian',
  'auditLog',
  'deviceVisit',
  'pageVisit',
  'printer',
]

// Tombol dengan target sentuh minimal 44 x 44 px (R-03), bertumpuk vertikal
// di mobile dan berdampingan di desktop.
export function TombolResetDatabase({ namaProyek }: { namaProyek: string }) {
  const [bukaDialog, setBukaDialog] = useState(false)
  const [tahap, setTahap] = useState<
    'awal' | 'konfirmasi' | 'proses' | 'selesai' | 'error'
  >('awal')
  const [memproses, setMemproses] = useState(false)
  const [hasil, setHasil] = useState<{
    dihapus: Record<string, number>
    pesan: string
  } | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  const prosesReset = async () => {
    setMemproses(true)
    setGalat(null)
    setHasil(null)
    setTahap('proses')
    try {
      const data = await resetDatabaseFn({ data: {} })
      setHasil(data)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : 'Gagal mereset database')
      setTahap('error')
    } finally {
      setMemproses(false)
    }
  }
  const tabelSelesai = hasil?.dihapus ?? {}
  const totalTabel = TABEL_PROGRESS.length
  const tabelDiproses = TABEL_PROGRESS.filter((t) => t in tabelSelesai).length

  return (
    <>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="default"
          className="min-h-[44px]"
          disabled={memproses || tahap === 'proses'}
        >
          <Database className="mr-2 size-4" />
          {m.pengaturan_reset_database()}
        </Button>
      </DialogTrigger>

      <Dialog open={bukaDialog} onOpenChange={setBukaDialog}>
        {tahap === 'awal' && (
          <DialogContent className="p-4 sm:p-6">
            <DialogHeader className="text-center sm:text-left">
              <DialogTitle>
                {m.pengaturan_reset_database_judul({ namaProyek })}
              </DialogTitle>
              <DialogDescription>
                {m.pengaturan_reset_database_awal_desc({ namaProyek })}
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground text-center sm:text-left">
              {m.pengaturan_reset_database_awal_peringatan()}
            </div>
            <DialogFooter className="pt-4 sm:pt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-end">
              <Button
                onClick={() => setTahap('konfirmasi')}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {m.pengaturan_reset_database_awal_batal()}
              </Button>
              <DialogTrigger asChild>
                <Button
                  variant="destructive"
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  {m.pengaturan_reset_database_awal_lanjut()}
                </Button>
              </DialogTrigger>
            </DialogFooter>
          </DialogContent>
        )}
        {tahap === 'konfirmasi' && (
          <DialogContent className="p-4 sm:p-6 text-center sm:text-left">
            <DialogHeader>
              <DialogTitle>
                {m.pengaturan_reset_database_konfirmasi_judul()}
              </DialogTitle>
              <DialogDescription>
                {m.pengaturan_reset_database_konfirmasi_desc()}
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm text-muted-foreground">
              {m.pengaturan_reset_database_konfirmasi_peringatan()}
            </div>
            <Divider className="my-2 sm:my-4" />
            <div className="text-xs font-mono text-neutral-500 break-all mx-auto sm:mx-0">
              {namaProyek}
            </div>
            <DialogFooter className="pt-4 sm:pt-6 flex flex-col sm:flex-row gap-3 w-full sm:w-auto justify-end">
              <Button
                onClick={() => setTahap('awal')}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {m.pengaturan_reset_database_konfirmasi_batal()}
              </Button>
              <Button
                variant="destructive"
                onClick={prosesReset}
                disabled={memproses}
                className="min-h-[44px] w-full sm:w-auto"
              >
                <Trash2 className="mr-2 size-4" />
                {m.pengaturan_reset_database_konfirmasi_hapus()}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
        {tahap === 'proses' && (
          <DialogContent className="p-4 sm:p-6 text-center">
            <DialogHeader>
              <DialogTitle>
                {m.pengaturan_reset_database_proses_judul()}
              </DialogTitle>
              <DialogDescription>
                {m.pengaturan_reset_database_proses_desc()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Loader2 className="size-6 mx-auto animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {m.pengaturan_reset_database_proses_sedang()}
              </p>
              <div className="text-xs text-neutral-500">
                {tabelDiproses} / {totalTabel} tabel diproses
              </div>
            </div>
            <DialogFooter className="pt-4 sm:pt-6">
              <Button
                variant="outline"
                onClick={() => setBukaDialog(false)}
                disabled
                className="min-h-[44px] w-full sm:w-auto"
              >
                {m.pengaturan_reset_database_proses_tunggu()}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
        {tahap === 'selesai' && (
          <DialogContent className="p-4 sm:p-6 text-center">
            <DialogHeader>
              <DialogTitle>
                {m.pengaturan_reset_database_selesai_judul()}
              </DialogTitle>
              <DialogDescription>
                {m.pengaturan_reset_database_selesai_desc()}
              </DialogDescription>
            </DialogHeader>
            <div className="text-sm">
              <p className="font-medium">
                {m.pengaturan_reset_database_selesai_total({
                  total: hasil?.pesan ?? '',
                })}
              </p>
              <div className="mt-3 space-y-1 text-xs font-mono text-neutral-500">
                {Object.entries(tabelSelesai).map(([tabel, jumlah]) => (
                  <div key={tabel} className="flex justify-between px-2">
                    <span>{tabel}</span>
                    <span>{jumlah}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="pt-4 sm:pt-6">
              <Button
                onClick={() => {
                  setBukaDialog(false)
                  setTahap('awal')
                }}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {m.pengaturan_reset_database_selesai_tutup()}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
        {tahap === 'error' && (
          <DialogContent className="p-4 sm:p-6 text-center">
            <DialogHeader>
              <DialogTitle>
                {m.pengaturan_reset_database_error_judul()}
              </DialogTitle>
              <DialogDescription>{galat}</DialogDescription>
            </DialogHeader>
            <DialogFooter className="pt-4 sm:pt-6">
              <Button
                onClick={() => {
                  setBukaDialog(false)
                  setTahap('awal')
                }}
                className="min-h-[44px] w-full sm:w-auto"
              >
                {m.pengaturan_reset_database_error_tutup()}
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  )
}
