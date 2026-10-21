import { useEffect, useRef, useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'

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
import { Slider } from '#/components/ui/slider'

const UKURAN = 280
const KELUARAN = 512

type Dimensi = { lebar: number; tinggi: number }

const batasi = (nilai: number, batas: number) =>
  Math.min(batas, Math.max(-batas, nilai))

export default function IkonCropDialog({
  file,
  onBatal,
  onSelesai,
}: {
  file: File | null
  onBatal: () => void
  onSelesai: (hasil: File) => void
}) {
  const [gambar, setGambar] = useState<HTMLImageElement | null>(null)
  const [dimensi, setDimensi] = useState<Dimensi | null>(null)
  const [zoom, setZoom] = useState(1)
  const [geser, setGeser] = useState({ x: 0, y: 0 })
  const seret = useRef<{
    x: number
    y: number
    px: number
    py: number
  } | null>(null)

  useEffect(() => {
    setZoom(1)
    setGeser({ x: 0, y: 0 })
    setGambar(null)
    setDimensi(null)
    if (!file) return
    const url = URL.createObjectURL(file)
    const el = new Image()
    el.onload = () => {
      setGambar(el)
      setDimensi({ lebar: el.naturalWidth, tinggi: el.naturalHeight })
    }
    el.onerror = () => {
      toast.error(m.pengaturan_ikon_crop_gagal())
    }
    el.src = url
    return () => {
      URL.revokeObjectURL(url)
      el.onload = null
      el.onerror = null
    }
  }, [file])

  const skalaDasar = dimensi
    ? Math.max(UKURAN / dimensi.lebar, UKURAN / dimensi.tinggi)
    : 1
  const skala = skalaDasar * zoom
  const lebar = (dimensi?.lebar ?? UKURAN) * skala
  const tinggi = (dimensi?.tinggi ?? UKURAN) * skala
  const batasX = Math.max(0, (lebar - UKURAN) / 2)
  const batasY = Math.max(0, (tinggi - UKURAN) / 2)
  const posisiX = batasi(geser.x, batasX)
  const posisiY = batasi(geser.y, batasY)

  const simpan = () => {
    if (!gambar) return
    const kanvas = document.createElement('canvas')
    kanvas.width = KELUARAN
    kanvas.height = KELUARAN
    const konteks = kanvas.getContext('2d')
    if (!konteks) {
      toast.error(m.pengaturan_ikon_crop_gagal())
      return
    }
    const kiri = (UKURAN - lebar) / 2 + posisiX
    const atas = (UKURAN - tinggi) / 2 + posisiY
    konteks.drawImage(
      gambar,
      -kiri / skala,
      -atas / skala,
      UKURAN / skala,
      UKURAN / skala,
      0,
      0,
      KELUARAN,
      KELUARAN,
    )
    kanvas.toBlob((blob) => {
      if (!blob) {
        toast.error(m.pengaturan_ikon_crop_gagal())
        return
      }
      const nama = file?.name.replace(/\.[^.]+$/, '') ?? 'ikon'
      onSelesai(new File([blob], `${nama}-ikon.png`, { type: 'image/png' }))
    }, 'image/png')
  }

  return (
    <Dialog
      open={!!file}
      onOpenChange={(buka) => {
        if (!buka) onBatal()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{m.pengaturan_ikon_crop_judul()}</DialogTitle>
          <DialogDescription>{m.pengaturan_ikon_crop_desc()}</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <div
            className="relative h-[280px] w-[280px] max-w-full cursor-grab touch-none overflow-hidden rounded-2xl border border-border bg-muted active:cursor-grabbing"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              seret.current = {
                x: e.clientX,
                y: e.clientY,
                px: posisiX,
                py: posisiY,
              }
            }}
            onPointerMove={(e) => {
              const mulai = seret.current
              if (!mulai) return
              setGeser({
                x: batasi(mulai.px + e.clientX - mulai.x, batasX),
                y: batasi(mulai.py + e.clientY - mulai.y, batasY),
              })
            }}
            onPointerUp={() => {
              seret.current = null
            }}
            onPointerCancel={() => {
              seret.current = null
            }}
          >
            {gambar && dimensi ? (
              <img
                src={gambar.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute max-w-none select-none"
                style={{
                  width: lebar,
                  height: tinggi,
                  left: (UKURAN - lebar) / 2 + posisiX,
                  top: (UKURAN - tinggi) / 2 + posisiY,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageIcon className="size-8" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/40" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{m.pengaturan_ikon_crop_zoom()}</Label>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={([nilai]) => {
              setZoom(nilai)
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={onBatal}>
            {m.pengaturan_ikon_crop_batal()}
          </Button>
          <Button className="h-11" onClick={simpan} disabled={!gambar}>
            {m.pengaturan_ikon_crop_simpan()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
