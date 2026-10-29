'use client'

import { useState } from 'react'
import { Store } from 'lucide-react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { setPengaturanFn } from '#/server/pengaturanFn'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'

// Sakelar cepat buka/tutup toko di dashboard. Kasir dan owner sama-sama boleh
// mengubah `toko_aktif` (lihat KUNCI_PENGATURAN_OPERASIONAL), dan perubahan
// langsung disimpan tanpa menunggu tombol simpan halaman pengaturan.
export default function StatusToko({ awalAktif }: { awalAktif: boolean }) {
  const [aktif, setAktif] = useState(awalAktif)
  const [simpan, setSimpan] = useState(false)

  const ubah = async (nilai: boolean) => {
    const sebelumnya = aktif
    setAktif(nilai)
    setSimpan(true)
    try {
      await setPengaturanFn({
        data: { kunci: 'toko_aktif', nilai: nilai ? 'true' : 'false' },
      })
      toast.success(m.pengaturan_tersimpan())
    } catch (e) {
      setAktif(sebelumnya)
      toast.error(e instanceof Error ? e.message : m.toast_error_umum())
    } finally {
      setSimpan(false)
    }
  }

  return (
    <Card className={aktif ? 'border-primary/20' : 'border-destructive/50'}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {m.pengaturan_status_toko()}
          </CardTitle>
          <CardDescription className="mt-1">
            {m.pengaturan_status_toko_desc()}
          </CardDescription>
        </div>
        <Store className="size-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            id="toko-aktif-dashboard"
            checked={aktif}
            disabled={simpan}
            onCheckedChange={(nilai) => void ubah(nilai)}
          />
          <Label htmlFor="toko-aktif-dashboard">
            {aktif ? m.pengaturan_toko_buka() : m.pengaturan_toko_tutup()}
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          {aktif ? m.pesan_toko_buka_hint() : m.pesan_toko_tutup_hint()}
        </p>
      </CardContent>
    </Card>
  )
}
