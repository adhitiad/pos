import { useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'

import { toast } from 'sonner'
import { m } from '#/paraglide/messages'
import { setujuiPengajuanFn, tolakPengajuanFn } from '#/server/pengajuanFn'
import type { PengajuanRingkas } from '#/types/pengajuan'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

type Props = {
  terbuka: boolean
  pengajuan: PengajuanRingkas | null
  onTutup: () => void
  onSelesai?: () => void
}

// Dialog keputusan owner atas ajuan kasir: setujui (boleh ubah nominal)
// atau tolak dengan alasan. Nominal yang disetujui inilah yang tercatat di
// jurnal dan dikabar ke kasir.
export default function DialogKeputusan({
  terbuka,
  pengajuan,
  onTutup,
  onSelesai,
}: Props) {
  const [mode, setMode] = useState<'setujui' | 'tolak'>('setujui')
  const [nominal, setNominal] = useState('')
  const [alasan, setAlasan] = useState('')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)

  useEffect(() => {
    if (!terbuka || !pengajuan) return
    setMode('setujui')
    setNominal(String(pengajuan.nominal))
    setAlasan('')
    setGalat('')
  }, [terbuka, pengajuan])

  if (!pengajuan) return null

  const angka = Number(nominal.replace(/\D/g, ''))
  const melebihi = angka > pengajuan.nominal
  const bisaSetujui = angka > 0 && !melebihi

  const simpan = async () => {
    setProses(true)
    setGalat('')
    try {
      if (mode === 'setujui') {
        if (!bisaSetujui) {
          setGalat(
            melebihi
              ? m.pengajuan_nominal_melebihi()
              : m.pengeluaran_nominal_wajib(),
          )
          return
        }
        await setujuiPengajuanFn({
          data: { id: pengajuan.id, nominal: angka },
        })
        toast.success(m.pengajuan_berhasil_setujui())
      } else {
        await tolakPengajuanFn({
          data: { id: pengajuan.id, alasan: alasan.trim() || undefined },
        })
        toast.success(m.pengajuan_berhasil_tolak())
      }
      onTutup()
      onSelesai?.()
    } catch (e) {
      const pesan = e instanceof Error ? e.message : m.pengajuan_gagal()
      setGalat(pesan)
      toast.error(pesan)
    } finally {
      setProses(false)
    }
  }

  return (
    <Dialog open={terbuka} onOpenChange={(buka) => !buka && onTutup()}>
      <DialogContent className="max-h-[92svh] gap-0 overflow-y-auto p-4 sm:max-w-md sm:p-6">
        <DialogHeader className="gap-1">
          <DialogTitle>{m.pengajuan_keputusan_judul()}</DialogTitle>
          <DialogDescription>
            {m.pengajuan_keputusan_desc({
              nama: pengajuan.kasirNama,
              nominal: rupiah(pengajuan.nominal),
            })}
          </DialogDescription>
        </DialogHeader>

        <dl className="mt-4 space-y-2 rounded-lg border bg-muted/40 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{m.pengajuan_jenis()}</dt>
            <dd className="font-medium">{pengajuan.jenisLabel}</dd>
          </div>
          {pengajuan.keterangan && (
            <div className="space-y-0.5">
              <dt className="text-muted-foreground">
                {m.pengeluaran_keterangan()}
              </dt>
              <dd>{pengajuan.keterangan}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <dt className="text-muted-foreground">{m.pengajuan_diminta()}</dt>
            <dd className="font-semibold">Rp{rupiah(pengajuan.nominal)}</dd>
          </div>
        </dl>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={mode === 'setujui' ? 'default' : 'outline'}
            className="h-12"
            onClick={() => setMode('setujui')}
          >
            <Check className="size-4" />
            {m.pengajuan_setujui()}
          </Button>
          <Button
            type="button"
            variant={mode === 'tolak' ? 'destructive' : 'outline'}
            className="h-12"
            onClick={() => setMode('tolak')}
          >
            <X className="size-4" />
            {m.pengajuan_tolak()}
          </Button>
        </div>

        {mode === 'setujui' ? (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="setujui-nominal">
              {m.pengajuan_nominal_disetujui()}
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
                Rp
              </span>
              <Input
                id="setujui-nominal"
                type="number"
                inputMode="numeric"
                min={0}
                step={1000}
                value={nominal}
                onChange={(e) => setNominal(e.target.value)}
                className="h-12 pl-9 font-semibold"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {m.pengajuan_nominal_hint()}
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="tolak-alasan">{m.pengajuan_alasan()}</Label>
            <Textarea
              id="tolak-alasan"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder={m.pengajuan_alasan_hint()}
              rows={3}
              maxLength={255}
            />
          </div>
        )}

        {galat && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {galat}
          </p>
        )}

        <DialogFooter className="mt-5">
          <Button
            type="button"
            variant="outline"
            className="h-12"
            onClick={onTutup}
            disabled={proses}
          >
            {m.pengeluaran_batal()}
          </Button>
          <Button
            type="button"
            className="h-12"
            variant={mode === 'tolak' ? 'destructive' : 'default'}
            onClick={() => void simpan()}
            disabled={proses || (mode === 'setujui' && !bisaSetujui)}
          >
            {proses
              ? m.pengeluaran_menyimpan()
              : mode === 'setujui'
                ? m.pengajuan_setujui_konfirmasi()
                : m.pengajuan_tolak_konfirmasi()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
