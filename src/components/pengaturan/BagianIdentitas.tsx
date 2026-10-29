import { Crop, ImageIcon, Trash2 } from 'lucide-react'

import { m } from '#/paraglide/messages'

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
import type { PengaturanForm } from '#/hooks/usePengaturanForm'

// Kartu identitas: nama toko, judul, logo, ikon, dan deskripsi aplikasi.
export default function BagianIdentitas({ form }: { form: PengaturanForm }) {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_nama_toko()}</CardTitle>
          <CardDescription>{m.pengaturan_nama_toko_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="nama-toko">{m.pengaturan_nama_toko()}</Label>
          <Input
            id="nama-toko"
            value={form.namaToko}
            maxLength={60}
            onChange={(e) => form.setNamaToko(e.target.value)}
            className="w-full max-w-sm sm:max-w-md"
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
            value={form.judulApp}
            maxLength={80}
            onChange={(e) => form.setJudulApp(e.target.value)}
            className="w-full max-w-sm sm:max-w-md"
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
            {(form.fileLogo || form.logoUrl) && (
              <img
                src={
                  form.fileLogo
                    ? URL.createObjectURL(form.fileLogo)
                    : form.logoUrl
                }
                alt=""
                className="h-12 w-12 rounded border object-contain"
              />
            )}
            <Input
              ref={form.inputLogo}
              id="logo-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => form.setFileLogo(e.target.files?.[0] ?? null)}
              className="w-full max-w-sm sm:max-w-md"
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
            {form.pratinjauIkon ? (
              <img
                src={form.pratinjauIkon}
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
                ref={form.inputIkon}
                id="ikon-file"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const berkas = e.target.files?.[0] ?? null
                  e.target.value = ''
                  if (!berkas) return
                  form.setBerkasIkon(berkas)
                  form.setIkonDireset(false)
                  form.setCropTerbuka(true)
                }}
                className="w-full max-w-sm sm:max-w-md"
              />
              <p className="text-xs text-muted-foreground">
                {m.pengaturan_ikon_app_hint()}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  onClick={() => form.setCropTerbuka(true)}
                  disabled={!form.berkasIkon}
                >
                  <Crop className="size-4" />
                  {m.pengaturan_ikon_atur_crop()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 text-destructive hover:text-destructive"
                  onClick={form.resetIkon}
                  disabled={!form.ikonUrl && !form.fileIkon && !form.berkasIkon}
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
        file={form.cropTerbuka ? form.berkasIkon : null}
        onBatal={() => {
          form.setCropTerbuka(false)
          if (!form.fileIkon) form.setBerkasIkon(null)
        }}
        onSelesai={(hasil) => {
          form.setFileIkon(hasil)
          form.setIkonDireset(false)
          form.setCropTerbuka(false)
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
            value={form.deskripsiApp}
            maxLength={200}
            onChange={(e) => form.setDeskripsiApp(e.target.value)}
            className="w-full max-w-sm sm:max-w-md"
          />
        </CardContent>
      </Card>
    </>
  )
}
