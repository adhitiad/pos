import { useEffect, useState } from 'react'

import { m } from '#/paraglide/messages'
import { hutangSupplierFn } from '#/server/supplierFn'
import type { HutangPembelianRow, SupplierRow } from '#/types/supplier'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

// Dialog pelunasan hutang usaha: pilih pembelian yang belum lunas, lalu
// masukkan nominal pembayaran (bisa sebagian).
export default function DialogHutang({
  supplier,
  onTutup,
  onSimpan,
}: {
  supplier: SupplierRow | null
  onTutup: () => void
  onSimpan: (
    pembelianBahanId: string,
    jumlah: number,
    catatan: string,
  ) => Promise<void>
}) {
  const [daftar, setDaftar] = useState<HutangPembelianRow[]>([])
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [jumlah, setJumlah] = useState(0)
  const [catatan, setCatatan] = useState('')
  const [pending, setPending] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  useEffect(() => {
    if (!supplier) {
      setDaftar([])
      setTerpilih(null)
      return
    }
    let dibatalkan = false
    hutangSupplierFn({ data: { supplierId: supplier.id } })
      .then((hasil) => {
        if (dibatalkan) return
        setDaftar(hasil)
        setTerpilih(hasil[0]?.pembelianBahanId ?? null)
        setJumlah(hasil[0]?.belumDibayar ?? 0)
      })
      .catch((e: unknown) => {
        if (dibatalkan) return
        setGalat(e instanceof Error ? e.message : m.supplier_hutang_gagal())
      })
    return () => {
      dibatalkan = true
    }
  }, [supplier])

  const barisTerpilih = daftar.find((d) => d.pembelianBahanId === terpilih)

  return (
    <Dialog
      open={supplier !== null}
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m.supplier_bayar_hutang_title()}</DialogTitle>
          <DialogDescription>
            {supplier?.nama ?? ''} — sisa hutang Rp
            {rupiah(supplier?.hutang ?? 0)}
          </DialogDescription>
        </DialogHeader>

        {daftar.length === 0 ? (
          <p className="py-4 text-sm text-neutral-500">
            {m.supplier_hutang_kosong()}
          </p>
        ) : (
          <>
            <div className="-mx-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.laporan_belanja_tanggal()}</TableHead>
                    <TableHead>{m.laporan_belanja_bahan()}</TableHead>
                    <TableHead className="text-right">
                      {m.supplier_sisa()}
                    </TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daftar.map((d) => (
                    <TableRow key={d.pembelianBahanId}>
                      <TableCell>{d.tanggal.slice(0, 10)}</TableCell>
                      <TableCell>{d.bahanNama}</TableCell>
                      <TableCell className="text-right">
                        Rp{rupiah(d.belumDibayar)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={
                            terpilih === d.pembelianBahanId
                              ? 'default'
                              : 'outline'
                          }
                          onClick={() => {
                            setTerpilih(d.pembelianBahanId)
                            setJumlah(d.belumDibayar)
                          }}
                        >
                          {m.supplier_pilih()}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="hutang-jumlah">{m.supplier_nominal()}</Label>
                <Input
                  id="hutang-jumlah"
                  type="number"
                  min={0}
                  max={barisTerpilih?.belumDibayar ?? 0}
                  value={jumlah}
                  onChange={(e) => {
                    setJumlah(Number(e.target.value))
                  }}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hutang-catatan">{m.supplier_catatan()}</Label>
                <Input
                  id="hutang-catatan"
                  value={catatan}
                  onChange={(e) => {
                    setCatatan(e.target.value)
                  }}
                />
              </div>
            </div>
          </>
        )}

        {galat && <p className="text-sm text-destructive">{galat}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={onTutup}>
            {m.supplier_batal()}
          </Button>
          <Button
            disabled={pending || !terpilih || jumlah <= 0}
            onClick={async () => {
              if (!terpilih) return
              setPending(true)
              setGalat(null)
              try {
                await onSimpan(terpilih, jumlah, catatan)
              } catch (e) {
                setGalat(
                  e instanceof Error ? e.message : m.supplier_hutang_gagal(),
                )
              } finally {
                setPending(false)
              }
            }}
          >
            {m.supplier_simpan()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
