import { useMemo, useRef, useState } from 'react'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { Crop, ImageIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { unggahGambar } from '#/lib/cloudinary'
import { setIdentitasCache } from '#/lib/identitas'
import { setLogoUrlCache } from '#/lib/logo'
import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { pengaturanDataFn, setPengaturanFn } from '#/server/pengaturanFn'

import DashboardLayout from '#/components/DashboardLayout'
import IkonCropDialog from '#/components/pengaturan/IkonCropDialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'
import type { StrukOtomatis } from '#/validations/pengaturan'

export const Route = createFileRoute('/pengaturan')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => pengaturanDataFn(),
  component: Pengaturan,
})

function Pengaturan() {
  const awal = Route.useLoaderData()
  const [namaToko, setNamaToko] = useState(awal.namaToko)
  const [judulApp, setJudulApp] = useState(awal.judulApp)
  const [logoUrl, setLogoUrl] = useState(awal.logoUrl)
  const [fileLogo, setFileLogo] = useState<File | null>(null)
  const inputLogo = useRef<HTMLInputElement>(null)
  const [ikonUrl, setIkonUrl] = useState(awal.ikonUrl)
  const [fileIkon, setFileIkon] = useState<File | null>(null)
  const [berkasIkon, setBerkasIkon] = useState<File | null>(null)
  const [cropTerbuka, setCropTerbuka] = useState(false)
  const [ikonDireset, setIkonDireset] = useState(false)
  const [versiIkon, setVersiIkon] = useState(0)
  const inputIkon = useRef<HTMLInputElement>(null)
  const [deskripsiApp, setDeskripsiApp] = useState(awal.deskripsiApp)
  const [pajakRestoPersen, setPajakRestoPersen] = useState(
    awal.pajakRestoPersen,
  )
  const [pajakRetailPersen, setPajakRetailPersen] = useState(
    awal.pajakRetailPersen,
  )
  const [modeFnb, setModeFnb] = useState(awal.modeFnb)
  const [riwayatBelanja, setRiwayatBelanja] = useState(awal.riwayatBelanja)
  const printerEscposAwal = awal.semua.printer_escpos === 'true'
  const [printerEscpos, setPrinterEscpos] = useState(printerEscposAwal)
  const [strukOtomatis, setStrukOtomatis] = useState<StrukOtomatis>(
    awal.strukOtomatis,
  )
  const [simpan, setSimpan] = useState(false)

  const pratinjauIkon = useMemo(() => {
    if (fileIkon) return URL.createObjectURL(fileIkon)
    if (ikonDireset) return ''
    return `/api/v1/app-icon?v=${versiIkon}`
  }, [fileIkon, versiIkon, ikonDireset])

  const resetIkon = () => {
    setFileIkon(null)
    setBerkasIkon(null)
    setCropTerbuka(false)
    setIkonUrl('')
    setIkonDireset(true)
    setVersiIkon((v) => v + 1)
    if (inputIkon.current) inputIkon.current.value = ''
  }

  const onSubmit = async () => {
    setSimpan(true)
    let logoBaru = logoUrl
    let ikonBaru = ikonUrl
    try {
      if (namaToko !== awal.namaToko)
        await setPengaturanFn({ data: { kunci: 'nama_toko', nilai: namaToko } })
      if (judulApp !== awal.judulApp)
        await setPengaturanFn({ data: { kunci: 'judul_app', nilai: judulApp } })
      if (fileLogo || logoUrl !== awal.logoUrl) {
        const nilai = fileLogo ? await unggahGambar(fileLogo) : logoUrl
        await setPengaturanFn({ data: { kunci: 'logo_url', nilai } })
        logoBaru = nilai
        setLogoUrl(nilai)
        setLogoUrlCache(nilai)
        setFileLogo(null)
        if (inputLogo.current) inputLogo.current.value = ''
      }
      if (fileIkon || ikonUrl !== awal.ikonUrl) {
        const nilai = fileIkon ? await unggahGambar(fileIkon) : ikonUrl
        await setPengaturanFn({ data: { kunci: 'ikon_url', nilai } })
        ikonBaru = nilai
        setIkonUrl(nilai)
        setFileIkon(null)
        setBerkasIkon(null)
        setCropTerbuka(false)
        setIkonDireset(false)
        setVersiIkon((v) => v + 1)
        if (inputIkon.current) inputIkon.current.value = ''
      }
      if (deskripsiApp !== awal.deskripsiApp)
        await setPengaturanFn({
          data: { kunci: 'deskripsi_app', nilai: deskripsiApp },
        })
      if (pajakRestoPersen !== awal.pajakRestoPersen)
        await setPengaturanFn({
          data: {
            kunci: 'pajak_resto_persen',
            nilai: String(pajakRestoPersen),
          },
        })
      if (pajakRetailPersen !== awal.pajakRetailPersen)
        await setPengaturanFn({
          data: {
            kunci: 'pajak_retail_persen',
            nilai: String(pajakRetailPersen),
          },
        })
      if (modeFnb !== awal.modeFnb)
        await setPengaturanFn({
          data: { kunci: 'mode_fnb', nilai: modeFnb ? 'true' : 'false' },
        })
      if (riwayatBelanja !== awal.riwayatBelanja)
        await setPengaturanFn({
          data: {
            kunci: 'riwayat_belanja_aktif',
            nilai: riwayatBelanja ? 'true' : 'false',
          },
        })
      if (printerEscpos !== printerEscposAwal)
        await setPengaturanFn({
          data: {
            kunci: 'printer_escpos',
            nilai: printerEscpos ? 'true' : 'false',
          },
        })
      if (strukOtomatis !== awal.strukOtomatis)
        await setPengaturanFn({
          data: { kunci: 'struk_otomatis', nilai: strukOtomatis },
        })
      setIdentitasCache({
        judul: judulApp.trim() || namaToko.trim() || 'POS',
        ikonUrl: ikonBaru || logoBaru,
        logoUrl: logoBaru,
        deskripsi: deskripsiApp,
      })
      toast.success(m.pengaturan_tersimpan())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.toast_error_umum())
    } finally {
      setSimpan(false)
    }
  }

  return (
    <DashboardLayout peran="OWNER" judul={m.pengaturan_title()}>
      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_nama_toko()}</CardTitle>
          <CardDescription>{m.pengaturan_nama_toko_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="nama-toko">{m.pengaturan_nama_toko()}</Label>
          <Input
            id="nama-toko"
            value={namaToko}
            maxLength={60}
            onChange={(e) => setNamaToko(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_judul_app()}</CardTitle>
          <CardDescription>{m.pengaturan_judul_app_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="judul-app">{m.pengaturan_judul_app()}</Label>
          <Input
            id="judul-app"
            value={judulApp}
            maxLength={80}
            onChange={(e) => setJudulApp(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_logo_app()}</CardTitle>
          <CardDescription>{m.pengaturan_logo_app_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="logo-file">{m.pengaturan_logo_app()}</Label>
          <div className="flex items-center gap-3">
            {(fileLogo || logoUrl) && (
              <img
                src={fileLogo ? URL.createObjectURL(fileLogo) : logoUrl}
                alt=""
                className="h-12 w-12 rounded border object-contain"
              />
            )}
            <Input
              ref={inputLogo}
              id="logo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setFileLogo(e.target.files?.[0] ?? null)}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_ikon_app()}</CardTitle>
          <CardDescription>{m.pengaturan_ikon_app_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="ikon-file">{m.pengaturan_ikon_app()}</Label>
          <div className="flex flex-wrap items-center gap-3">
            {pratinjauIkon ? (
              <img
                src={pratinjauIkon}
                alt={m.pengaturan_ikon_preview()}
                className="size-14 rounded-2xl border border-border object-cover"
              />
            ) : (
              <div className="flex size-14 items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground">
                <ImageIcon className="size-5" />
              </div>
            )}
            <div className="space-y-2">
              <Input
                ref={inputIkon}
                id="ikon-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const berkas = e.target.files?.[0] ?? null
                  e.target.value = ''
                  if (!berkas) return
                  setBerkasIkon(berkas)
                  setIkonDireset(false)
                  setCropTerbuka(true)
                }}
                className="max-w-sm"
              />
              <p className="text-xs text-muted-foreground">
                {m.pengaturan_ikon_app_hint()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => setCropTerbuka(true)}
                  disabled={!berkasIkon}
                >
                  <Crop className="size-4" />
                  {m.pengaturan_ikon_atur_crop()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 text-destructive hover:text-destructive"
                  onClick={resetIkon}
                  disabled={!ikonUrl && !fileIkon && !berkasIkon}
                >
                  <Trash2 className="size-4" />
                  {m.pengaturan_ikon_hapus()}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <IkonCropDialog
        file={cropTerbuka ? berkasIkon : null}
        onBatal={() => {
          setCropTerbuka(false)
          if (!fileIkon) setBerkasIkon(null)
        }}
        onSelesai={(hasil) => {
          setFileIkon(hasil)
          setIkonDireset(false)
          setCropTerbuka(false)
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_deskripsi_app()}</CardTitle>
          <CardDescription>{m.pengaturan_deskripsi_app_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="deskripsi-app">{m.pengaturan_deskripsi_app()}</Label>
          <Input
            id="deskripsi-app"
            value={deskripsiApp}
            maxLength={200}
            onChange={(e) => setDeskripsiApp(e.target.value)}
            className="max-w-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_pajak()}</CardTitle>
          <CardDescription>{m.pengaturan_pajak_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pajak-resto">{m.pengaturan_pajak_resto()}</Label>
            <Input
              id="pajak-resto"
              type="number"
              min={0}
              max={100}
              value={pajakRestoPersen}
              onChange={(e) => {
                const n = Number(e.target.value)
                setPajakRestoPersen(
                  Number.isFinite(n) ? Math.min(Math.max(0, n), 100) : 0,
                )
              }}
              className="max-w-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pajak-retail">{m.pengaturan_pajak_retail()}</Label>
            <Input
              id="pajak-retail"
              type="number"
              min={0}
              max={100}
              value={pajakRetailPersen}
              onChange={(e) => {
                const n = Number(e.target.value)
                setPajakRetailPersen(
                  Number.isFinite(n) ? Math.min(Math.max(0, n), 100) : 0,
                )
              }}
              className="max-w-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_mode_fnb()}</CardTitle>
          <CardDescription>{m.pengaturan_mode_fnb_desc()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="mode-fnb"
              checked={modeFnb}
              onCheckedChange={setModeFnb}
            />
            <Label htmlFor="mode-fnb">
              {modeFnb ? m.pengaturan_aktif() : m.pengaturan_nonaktif()}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_riwayat_belanja()}</CardTitle>
          <CardDescription>
            {m.pengaturan_riwayat_belanja_desc()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="riwayat-belanja"
              checked={riwayatBelanja}
              onCheckedChange={setRiwayatBelanja}
            />
            <Label htmlFor="riwayat-belanja">
              {riwayatBelanja ? m.pengaturan_aktif() : m.pengaturan_nonaktif()}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_printer_escpos()}</CardTitle>
          <CardDescription>
            {m.pengaturan_printer_escpos_desc()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="printer-escpos"
              checked={printerEscpos}
              onCheckedChange={setPrinterEscpos}
            />
            <Label htmlFor="printer-escpos">
              {printerEscpos ? m.pengaturan_aktif() : m.pengaturan_nonaktif()}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_struk_otomatis()}</CardTitle>
          <CardDescription>
            {m.pengaturan_struk_otomatis_desc()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="struk-otomatis">
            {m.pengaturan_struk_otomatis()}
          </Label>
          <Select
            value={strukOtomatis}
            onValueChange={(v) => setStrukOtomatis(v as StrukOtomatis)}
          >
            <SelectTrigger id="struk-otomatis" className="max-w-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="nonaktif">
                {m.pengaturan_struk_otomatis_nonaktif()}
              </SelectItem>
              <SelectItem value="cetak">
                {m.pengaturan_struk_otomatis_cetak()}
              </SelectItem>
              <SelectItem value="pdf">
                {m.pengaturan_struk_otomatis_pdf()}
              </SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => void onSubmit()} disabled={simpan}>
          {m.pengaturan_simpan()}
        </Button>
      </div>
    </DashboardLayout>
  )
}
