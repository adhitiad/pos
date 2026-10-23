import { CheckCircle2, Clock, XCircle } from 'lucide-react'

import { labelJenis, rupiah } from '#/lib/pengeluaran'
import { m } from '#/paraglide/messages'
import type { PengajuanRingkas } from '#/types/pengajuan'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

const waktu = (iso: string) =>
  new Date(iso).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

const gayaStatus = (status: PengajuanRingkas['status']) => {
  if (status === 'DISETUJUI')
    return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
  if (status === 'DITOLAK')
    return 'border-neutral-300 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300'
  return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
}

const labelStatus = (status: PengajuanRingkas['status']) => {
  if (status === 'DISETUJUI') return m.pengajuan_status_disetujui()
  if (status === 'DITOLAK') return m.pengajuan_status_ditolak()
  return m.pengajuan_status_menunggu()
}

const ikonStatus = (status: PengajuanRingkas['status']) => {
  if (status === 'DISETUJUI') return <CheckCircle2 className="size-4" />
  if (status === 'DITOLAK') return <XCircle className="size-4" />
  return <Clock className="size-4" />
}

type Props = {
  daftar: PengajuanRingkas[]
  peran: 'OWNER' | 'KASIR'
  onPutuskan?: (pengajuan: PengajuanRingkas) => void
}

// Daftar ajuan pengeluaran. Owner memutuskan; kasir memantau status ajuannya.
export default function DaftarPengajuan({ daftar, peran, onPutuskan }: Props) {
  if (daftar.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Clock className="size-8 text-muted-foreground" />
          <p className="font-medium">{m.pengajuan_kosong()}</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {m.pengajuan_kosong_desc()}
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {daftar.map((p) => (
        <Card key={p.id}>
          <CardHeader className="gap-1.5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {labelJenis(p.jenis)} — Rp{rupiah(p.nominal)}
                </CardTitle>
                <CardDescription>
                  {peran === 'OWNER'
                    ? m.pengajuan_diajukan_oleh({ nama: p.kasirNama })
                    : m.pengajuan_diajukan_pada({ waktu: waktu(p.createdAt) })}
                </CardDescription>
              </div>
              <Badge variant="outline" className={gayaStatus(p.status)}>
                {ikonStatus(p.status)}
                {labelStatus(p.status)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.keterangan && (
              <p className="text-sm text-muted-foreground">{p.keterangan}</p>
            )}

            {p.status === 'DISETUJUI' && p.nominalDisetujui !== null && (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                {m.pengajuan_nominal_disetujui_berhasil({
                  nominal: rupiah(p.nominalDisetujui),
                })}
                {p.jurnalNomor ? ` · ${p.jurnalNomor}` : ''}
              </p>
            )}

            {p.status === 'DITOLAK' && p.alasanPenolakan && (
              <p className="rounded-lg bg-muted px-3 py-2 text-sm">
                {m.pengajuan_alasan_dikirim({ alasan: p.alasanPenolakan })}
              </p>
            )}

            {peran === 'OWNER' && p.status === 'PENDING' && (
              <Button
                className="h-11 w-full sm:w-auto"
                onClick={() => onPutuskan?.(p)}
              >
                {m.pengajuan_setujui()} / {m.pengajuan_tolak()}
              </Button>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
