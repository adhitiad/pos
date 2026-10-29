import { Button } from '#/components/ui/button'
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
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { urlGambarCloudinary } from '#/lib/cloudinary'
import { m } from '#/paraglide/messages'
import type { ProdukFormNilai, ProdukFormProps } from '#/types/produk'

export const formKosong: ProdukFormNilai = {
  nama: '',
  sku: '',
  barcode: '',
  gambar: '',
  harga: 0,
  stok: 0,
  kategoriId: '',
  aktif: true,
}

export function ProdukForm({
  panel,
  form,
  fileFoto,
  setFileFoto,
  resep,
  pending,
  data,
  onBatal,
  onTambahBahan,
  onHapusBahan,
  onUbahBahan,
}: ProdukFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{panel?.id ? m.produk_edit() : m.produk_tambah()}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="nama">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.produk_nama()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="sku">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.produk_sku()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="barcode">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.produk_barcode()}</Label>
                  <Input
                    value={field.state.value}
                    placeholder={m.produk_barcode_hint()}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="gambar">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.produk_gambar()}</Label>
                  <div className="flex items-center gap-2">
                    {(fileFoto || field.state.value) && (
                      <img
                        src={
                          fileFoto
                            ? URL.createObjectURL(fileFoto)
                            : urlGambarCloudinary(field.state.value, 400)
                        }
                        alt=""
                        className="h-12 w-12 rounded object-cover"
                      />
                    )}
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const f = e.target.files?.[0] ?? null
                        setFileFoto(f)
                        if (!f) field.handleChange('')
                      }}
                    />
                  </div>
                </div>
              )}
            </form.Field>
            <form.Field name="harga">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.produk_harga()}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="stok">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.produk_stok()}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="kategoriId">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.produk_kategori()}</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={m.produk_tanpa_kat()} />
                    </SelectTrigger>
                    <SelectContent>
                      {data.kategori.map((k) => (
                        <SelectItem key={k.id} value={k.id}>
                          {k.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
            <form.Field name="aktif">
              {(field) => (
                <div className="flex items-center gap-2 pt-6">
                  <Switch
                    checked={field.state.value}
                    onCheckedChange={field.handleChange}
                  />
                  <Label>{m.produk_aktif()}</Label>
                </div>
              )}
            </form.Field>
          </div>

          <div className="space-y-2">
            <Label>{m.produk_resep()}</Label>
            {resep.map((r, i) => (
              <div key={i} className="flex flex-col sm:flex-row gap-2 w-full">
                <Select
                  value={r.bahanId}
                  onValueChange={(v) => {
                    onUbahBahan(i, { ...r, bahanId: v })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.bahan
                      .filter(
                        (b) =>
                          b.id === r.bahanId ||
                          !resep.some((x) => x.bahanId === b.id),
                      )
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.nama} ({b.satuan})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min={0}
                  className="w-full sm:w-28"
                  value={r.jumlah}
                  onChange={(e) => {
                    const jumlah = Number(e.target.value)
                    onUbahBahan(i, { ...r, jumlah })
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-[44px] min-w-[44px]"
                  onClick={() => onHapusBahan(i)}
                >
                  ×
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              disabled={resep.length >= data.bahan.length}
              className="min-h-[44px]"
              onClick={onTambahBahan}
            >
              {m.produk_tambah_bahan()}
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full sm:w-auto min-h-[44px]"
            >
              {m.produk_simpan()}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onBatal}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {m.produk_batal()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
