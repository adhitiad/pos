import { useState } from 'react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { setPengaturanFn } from '#/server/pengaturanFn'

import { Button } from '#/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

// Kartu mandiri agar halaman pengaturan tidak makin panjang. Nilai disimpan
// terpisah dari form utama; server tetap memvalidasi 0–100 (SEC-22).
export default function KartuDiskonKasir({ nilaiAwal }: { nilaiAwal: number }) {
  const [nilai, setNilai] = useState(String(nilaiAwal))
  const [simpan, setSimpan] = useState(false)

  const simpanNilai = async () => {
    const n = Number(nilai)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      toast.error(m.pengaturan_diskon_kasir_invalid())
      return
    }
    setSimpan(true)
    try {
      await setPengaturanFn({
        data: {
          kunci: 'diskon_kasir_maks_persen',
          nilai: String(n),
        },
      })
      setNilai(String(n))
      toast.success(m.pengaturan_tersimpan())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.toast_error_umum())
    } finally {
      setSimpan(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{m.pengaturan_diskon_kasir()}</CardTitle>
        <CardDescription>{m.pengaturan_diskon_kasir_desc()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="diskon-kasir-maks">
            {m.pengaturan_diskon_kasir()}
          </Label>
          <Input
            id="diskon-kasir-maks"
            type="number"
            min={0}
            max={100}
            value={nilai}
            onChange={(e) => setNilai(e.target.value)}
            className="w-full max-w-sm sm:max-w-md"
          />
        </div>
        <Button type="button" onClick={simpanNilai} disabled={simpan}>
          {m.pengaturan_simpan()}
        </Button>
      </CardContent>
    </Card>
  )
}
