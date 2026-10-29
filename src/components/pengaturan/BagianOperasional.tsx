import { UKURAN_KERTAS_TERMAL, labelUkuranKertas } from '#/lib/ukuran-kertas'
import { m } from '#/paraglide/messages'
import type { IdUkuranKertasTermal } from '#/types/printer'
import type { StrukOtomatis } from '#/validations/pengaturan'
import type { PengaturanForm } from '#/hooks/usePengaturanForm'

import KartuDiskonKasir from '#/components/pengaturan/KartuDiskonKasir'
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

// Kartu operasional: pajak, diskon kasir, mode F&B, riwayat belanja, printer,
// ukuran kertas, struk otomatis, status toko, dan jam buka.
export default function BagianOperasional({ form }: { form: PengaturanForm }) {
  return (
    <>
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
              inputMode="decimal"
              min={0}
              max={100}
              value={form.pajakRestoPersen}
              onChange={(e) => form.setPajakRestoPersen(e.target.value)}
              className="w-full max-w-sm sm:max-w-md"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pajak-retail">{m.pengaturan_pajak_retail()}</Label>
            <Input
              id="pajak-retail"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              value={form.pajakRetailPersen}
              onChange={(e) => form.setPajakRetailPersen(e.target.value)}
              className="w-full max-w-sm sm:max-w-md"
            />
          </div>
        </CardContent>
      </Card>

      <KartuDiskonKasir nilaiAwal={form.awal.diskonKasirMaksPersen} />

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_mode_fnb()}</CardTitle>
          <CardDescription>{m.pengaturan_mode_fnb_desc()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Switch
              id="mode-fnb"
              checked={form.modeFnb}
              onCheckedChange={form.setModeFnb}
            />
            <Label htmlFor="mode-fnb">
              {form.modeFnb ? m.pengaturan_aktif() : m.pengaturan_nonaktif()}
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
              checked={form.riwayatBelanja}
              onCheckedChange={form.setRiwayatBelanja}
            />
            <Label htmlFor="riwayat-belanja">
              {form.riwayatBelanja
                ? m.pengaturan_aktif()
                : m.pengaturan_nonaktif()}
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
              checked={form.printerEscpos}
              onCheckedChange={form.setPrinterEscpos}
            />
            <Label htmlFor="printer-escpos">
              {form.printerEscpos
                ? m.pengaturan_aktif()
                : m.pengaturan_nonaktif()}
            </Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_ukuran_kertas()}</CardTitle>
          <CardDescription>{m.pengaturan_ukuran_kertas_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="ukuran-kertas">{m.pengaturan_ukuran_kertas()}</Label>
          <Select
            value={form.ukuranKertas}
            onValueChange={(v) =>
              form.setUkuranKertas(v as IdUkuranKertasTermal)
            }
          >
            <SelectTrigger
              id="ukuran-kertas"
              className="w-full max-w-sm sm:max-w-md"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {UKURAN_KERTAS_TERMAL.map((ukuran) => (
                <SelectItem key={ukuran.id} value={ukuran.id}>
                  {labelUkuranKertas(ukuran)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {m.pengaturan_ukuran_kertas_hint()}
          </p>
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
            value={form.strukOtomatis}
            onValueChange={(v) => form.setStrukOtomatis(v as StrukOtomatis)}
          >
            <SelectTrigger
              id="struk-otomatis"
              className="w-full max-w-sm sm:max-w-md"
            >
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

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_status_toko()}</CardTitle>
          <CardDescription>{m.pengaturan_status_toko_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch
              id="toko-aktif"
              checked={form.tokoAktif}
              onCheckedChange={form.setTokoAktif}
            />
            <Label htmlFor="toko-aktif">
              {form.tokoAktif
                ? m.pengaturan_toko_buka()
                : m.pengaturan_toko_tutup()}
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            {form.tokoAktif
              ? m.pesan_toko_buka_hint()
              : m.pesan_toko_tutup_hint()}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.pengaturan_jam_buka()}</CardTitle>
          <CardDescription>{m.pengaturan_jam_buka_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="jam-buka">{m.pengaturan_jam_buka()}</Label>
              <Input
                id="jam-buka"
                type="time"
                value={form.jamBuka}
                onChange={(e) => form.setJamBuka(e.target.value)}
                className="w-full max-w-sm sm:max-w-md"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jam-tutup">{m.pengaturan_jam_tutup()}</Label>
              <Input
                id="jam-tutup"
                type="time"
                value={form.jamTutup}
                onChange={(e) => form.setJamTutup(e.target.value)}
                className="w-full max-w-sm sm:max-w-md"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {m.pesan_jam_buka_hint()}
          </p>
        </CardContent>
      </Card>
    </>
  )
}
