import HapusDialog from '#/components/HapusDialog'
import { m } from '#/paraglide/messages'
import type { ProdukHapusDialogProps } from '#/types/produk'

export function ProdukHapusDialog({
  terbuka,
  nama,
  onBatal,
  onYa,
}: ProdukHapusDialogProps) {
  return (
    <HapusDialog
      terbuka={terbuka}
      judul={m.hapus_judul()}
      deskripsi={`${m.hapus_deskripsi()} (${nama ?? ''})`}
      batal={m.produk_batal()}
      ya={m.produk_hapus()}
      onBatal={onBatal}
      onYa={onYa}
    />
  )
}
