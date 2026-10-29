import { useEffect, useMemo, useState } from 'react'
import { CircleDollarSign, Send, Wallet } from 'lucide-react'

import { toast } from 'sonner'
import { JENIS_LIST, labelJenis, rupiah } from '#/lib/pengeluaran'
import { m } from '#/paraglide/messages'
import { buatPengajuanFn } from '#/server/pengajuanFn'
import { catatPengeluaranFn } from '#/server/pengeluaranFn'
import type { JenisPengeluaranKey } from '#/validations/pengeluaran'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

// Nominal cepat untuk pengeluaran kecil harian (transaksi kasir).
const CEPAT = [10_000, 25_000, 50_000, 100_000]

const isoHari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

type Props = {
  terbuka: boolean
  onTutup: () => void
  peran: 'OWNER' | 'KASIR'
  onSelesai?: () => void
}

// Dialog input pengeluaran. Owner mencatat langsung ke buku besar; kasir
// mengirim ajuan yang menunggu persetujuan owner.
export default function DialogPengeluaran({
  terbuka,
  onTutup,
  peran,
  onSelesai,
}: Props) {
  const [nominal, setNominal] = useState('')
  const [jenis, setJenis] = useState<string>('operasional_kasir')
  const [keterangan, setKeterangan] = useState('')
  const [tanggal, setTanggal] = useState(() => isoHari(new Date()))
  const [galat, setGalat] = useState('')
  const [mengirim, setMengirim] = useState(false)

  // Bersihkan form tiap kali dialog dibuka supaya nominal lama tak terbawa.
  useEffect(() => {
    if (!terbuka) return
    setNominal('')
    setJenis(peran === 'OWNER' ? 'belanja' : 'operasional_kasir')
    setKeterangan('')
    setTanggal(isoHari(new Date()))
    setGalat('')
  }, [terbuka, peran])

  const angka = Number(nominal.replace(/\D/g, ''))
  const nominalValid = angka > 0
  const kodeAkun = JENIS_LIST.find((j) => j.key === jenis)?.kode ?? '5900'

  const ringkas = useMemo(() => {
    if (!nominalValid) return ''
    return peran === 'OWNER'
      ? m.pengeluaran_jurnal_ringkas({ akun: kodeAkun })
      : m.pengajuan_ringkas_tunggal({ nominal: rupiah(angka) })
  }, [nominalValid, peran, kodeAkun, angka])

  const kirim = async () => {
    if (!nominalValid) {
      setGalat(m.pengeluaran_nominal_wajib())
      return
    }
    setMengirim(true)
    setGalat('')
    try {
      if (peran === 'OWNER') {
        await catatPengeluaranFn({
          data: {
            tanggal,
            nominal: angka,
            jenis: jenis as JenisPengeluaranKey,
            keterangan: keterangan.trim() || undefined,
          },
        })
        toast.success(m.pengeluaran_berhasil())
      } else {
        await buatPengajuanFn({
          data: {
            nominal: angka,
            jenis: jenis as JenisPengeluaranKey,
            keterangan: keterangan.trim() || undefined,
          },
        })
        toast.success(m.pengajuan_terkirim())
      }
      onTutup()
      onSelesai?.()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : m.pengeluaran_gagal())
      toast.error(e instanceof Error ? e.message : m.pengeluaran_gagal())
    } finally {
      setMengirim(false)
    }
  }

  return (
    <Dialog open={terbuka} onOpenChange={(buka) => !buka && onTutup()}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              {peran === 'OWNER' ? (
                <CircleDollarSign className="size-5" />
              ) : (
                <Send className="size-5" />
              )}
            </span>
            <div className="min-w-0">
              <DialogTitle>{m.pengeluaran_judul()}</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {peran === 'OWNER'
                  ? m.pengeluaran_desc_owner()
                  : m.pengeluaran_desc_kasir()}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pengeluaran-nominal">
              {m.pengeluaran_nominal()}
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
                Rp
              </span>
              <Input
                id="pengeluaran-nominal"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                placeholder="0"
                autoFocus
                className="h-12 pl-9 text-lg font-semibold"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {CEPAT.map((nilai) => (
                <Button
                  key={nilai}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-11 min-h-11 min-h-[44px] min-w-[44px]"
                  onClick={() => setNominal(String(nilai))}
                >
                  {rupiah(nilai)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>{m.pengeluaran_jenis()}</Label>
            <div className="grid grid-cols-2 gap-2">
              {JENIS_LIST.map((j) => {
                const terpilih = jenis === j.key
                return (
                  <button
                    key={j.key}
                    type="button"
                    aria-pressed={terpilih}
                    onClick={() => setJenis(j.key)}
                    className={`flex min-h-14 flex-col items-start justify-center rounded-lg border px-3 py-2 text-left transition-colors ${
                      terpilih
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border bg-background hover:bg-accent'
                    }`}
                  >
                    <span className="text-sm font-medium leading-tight">
                      {labelJenis(j.key)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {j.kode}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {peran === 'OWNER' && (
            <div className="space-y-1.5">
              <Label htmlFor="pengeluaran-tanggal">
                {m.pengeluaran_tanggal()}
              </Label>
              <Input
                id="pengeluaran-tanggal"
                type="date"
                value={tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="h-11"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="pengeluaran-keterangan">
              {m.pengeluaran_keterangan()}
            </Label>
            <Textarea
              id="pengeluaran-keterangan"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder={m.pengeluaran_keterangan_hint()}
              rows={2}
              maxLength={255}
            />
          </div>

          {ringkas && (
            <p className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
              <Wallet className="size-4 shrink-0" />
              {ringkas}
            </p>
          )}

          {galat && (
            <p role="alert" className="text-sm text-destructive">
              {galat}
            </p>
          )}
        </div>

        <DialogFooter className="mt-5">
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={onTutup}
            disabled={mengirim}
          >
            {m.pengeluaran_batal()}
          </Button>
          <Button
            type="button"
            className="h-12"
            onClick={() => void kirim()}
            disabled={mengirim || !nominalValid}
          >
            {mengirim
              ? m.pengeluaran_menyimpan()
              : peran === 'OWNER'
                ? m.pengeluaran_simpan()
                : m.pengajuan_kirim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
