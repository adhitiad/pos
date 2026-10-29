import { useEffect, useState } from 'react'

import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { reviewTransaksiFn } from '#/server/reviewTransaksiFn'
import type { DraftMenunggu } from '#/types/review'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

type Props = {
  terbuka: boolean
  draft: DraftMenunggu | null
  keputusan: 'DISETUJUI' | 'DITOLAK'
  onTutup: () => void
  onSelesai: () => void
}

export default function DialogReview({
  terbuka,
  draft,
  keputusan,
  onTutup,
  onSelesai,
}: Props) {
  const [catatan, setCatatan] = useState('')
  const [galat, setGalat] = useState('')
  const [proses, setProses] = useState(false)

  useEffect(() => {
    if (!terbuka) return
    setCatatan('')
    setGalat('')
  }, [terbuka, draft, keputusan])

  if (!draft) return null

  const tolak = keputusan === 'DITOLAK'

  const simpan = async () => {
    setProses(true)
    setGalat('')
    try {
      await reviewTransaksiFn({
        data: {
          draftId: draft.id,
          keputusan,
          catatan: catatan.trim() || undefined,
        },
      })
      toast.success(
        tolak ? m.review_berhasil_tolak() : m.review_berhasil_setujui(),
      )
      onTutup()
      onSelesai()
    } catch (e) {
      const pesan = e instanceof Error ? e.message : m.review_gagal()
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
          <DialogTitle>{m.review_keputusan_judul()}</DialogTitle>
          <DialogDescription>
            {m.review_keputusan_desc({
              nomor: draft.nomor,
              kasir: draft.kasirNama,
              total: rupiah(draft.total),
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-1.5">
          <Label htmlFor="review-catatan">{m.review_catatan()}</Label>
          <Textarea
            id="review-catatan"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
            placeholder={m.review_catatan_hint()}
            rows={3}
            maxLength={500}
          />
        </div>

        {galat && (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {galat}
          </p>
        )}

        <DialogFooter className="mt-5 flex flex-col sm:flex-row gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full sm:w-auto min-h-[44px]"
            onClick={onTutup}
            disabled={proses}
          >
            {m.pengeluaran_batal()}
          </Button>
          <Button
            type="button"
            className="h-12 w-full sm:w-auto min-h-[44px]"
            variant={tolak ? 'destructive' : 'default'}
            onClick={() => void simpan()}
            disabled={proses}
          >
            {proses
              ? m.pengeluaran_menyimpan()
              : tolak
                ? m.review_tolak_konfirmasi()
                : m.review_setujui_konfirmasi()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
