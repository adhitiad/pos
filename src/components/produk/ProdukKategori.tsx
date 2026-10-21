import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { m } from '#/paraglide/messages'
import type { ProdukKategoriProps } from '#/types/produk'

export function ProdukKategori({
  katNama,
  setKatNama,
  kategori,
  onTambah,
  onHapus,
  onMuatUlang,
  onError,
}: ProdukKategoriProps) {
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{m.produk_kat()}</h2>
      <div className="flex gap-2">
        <Input
          placeholder={m.produk_kat_nama()}
          value={katNama}
          onChange={(e) => setKatNama(e.target.value)}
          className="max-w-sm"
        />
        <Button onClick={onTambah}>{m.produk_kat_tambah()}</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {kategori.map((k) => (
          <div
            key={k.id}
            className="flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
          >
            <span>
              {k.nama} ({k.jumlahProduk})
            </span>
            {k.jumlahProduk === 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-neutral-500 hover:text-red-600"
                onClick={() => {
                  onError(null)
                  onHapus(k.id)
                  onMuatUlang()
                }}
              >
                ×
              </Button>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
