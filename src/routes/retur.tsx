import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { buatReturFn, detailTransaksiFn } from '#/server/returFn'

import DashboardLayout from '#/components/DashboardLayout'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/hooks/table-controls'
import { toast } from 'sonner'

export const Route = createFileRoute('/retur')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional')) throw redirect({ to: '/' })
  },
  loader: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    return { peran: user.role }
  },
  component: Retur,
})

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

interface ItemReturForm {
  id: string
  produkId: string | null
  namaProduk: string
  qty: number
  hargaSatuan: number
}

interface TransaksiDetail {
  id: string
  nomor: string
  tanggal: string
  total: number
  items: ItemReturForm[]
}

function Retur() {
  const { peran } = Route.useLoaderData()
  const router = useRouter()
  const [transaksiId, setTransaksiId] = useState('')
  const [detail, setDetail] = useState<TransaksiDetail | null>(null)
  const [alasan, setAlasan] = useState('')
  const [itemQtyMap, setItemQtyMap] = useState<Record<string, number>>({})
  const [pending, setPending] = useState(false)
  const kontrol = useKontrolTabel(
    detail?.items ?? [],
    (item) => item.namaProduk,
    {
      produk: (item) => item.namaProduk,
      qty: (item) => item.qty,
      harga: (item) => item.hargaSatuan,
    },
  )

  const muatDetail = async () => {
    if (!transaksiId) return
    try {
      const d = await detailTransaksiFn({ data: { id: transaksiId } })
      setDetail(d)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal memuat transaksi')
    }
  }

  const hitungTotalRetur = () => {
    if (!detail) return 0
    return detail.items.reduce((s, i) => {
      const q = itemQtyMap[i.id] ?? 0
      return s + q * i.hargaSatuan
    }, 0)
  }

  const buat = async () => {
    if (!detail) return
    setPending(true)
    try {
      const items = detail.items
        .filter((i) => (itemQtyMap[i.id] ?? 0) > 0)
        .map((i) => ({
          produkId: i.produkId,
          qty: itemQtyMap[i.id],
        }))
      if (items.length === 0) throw new Error('Minimal 1 item dikembalikan')
      if (!alasan.trim()) throw new Error('Alasan wajib diisi')

      await buatReturFn({
        data: { transaksiId: detail.id, alasan: alasan.trim(), items },
      })
      await router.invalidate()
      toast.success(m.retur_berhasil())
      setTransaksiId('')
      setDetail(null)
      setAlasan('')
      setItemQtyMap({})
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.retur_gagal())
    } finally {
      setPending(false)
    }
  }

  return (
    <DashboardLayout peran={peran} judul={m.retur_title()}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold">{m.retur_buat()}</h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label>{m.retur_transaksi_asal()}</Label>
                <Input
                  type="text"
                  value={transaksiId}
                  placeholder="ID transaksi (mis. cmb_xxx)"
                  onChange={(e) => setTransaksiId(e.target.value)}
                />
                <Button size="sm" onClick={() => void muatDetail()}>
                  Muat
                </Button>
              </div>
              {detail && (
                <>
                  <p className="text-xs text-neutral-500">
                    {new Date(detail.tanggal).toLocaleDateString('id-ID')} ·{' '}
                    {detail.nomor} · Total: Rp{rupiah(detail.total)}
                  </p>
                  <div className="mt-3 space-y-2">
                    <Label>{m.retur_alasan()}</Label>
                    <Textarea
                      rows={2}
                      value={alasan}
                      onChange={(e) => setAlasan(e.target.value)}
                    />
                    <PencarianTabel
                      value={kontrol.cari}
                      onChange={kontrol.setCari}
                    />
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <HeaderUrutTabel
                              kunci="produk"
                              aktif={kontrol.kunciUrut === 'produk'}
                              arah={kontrol.arahUrut}
                              onUrut={kontrol.toggleUrut}
                            >
                              {m.retur_item_produk()}
                            </HeaderUrutTabel>
                            <HeaderUrutTabel
                              kunci="qty"
                              aktif={kontrol.kunciUrut === 'qty'}
                              arah={kontrol.arahUrut}
                              onUrut={kontrol.toggleUrut}
                              className="text-right"
                            >
                              {m.retur_item_qty()}
                            </HeaderUrutTabel>
                            <HeaderUrutTabel
                              kunci="harga"
                              aktif={kontrol.kunciUrut === 'harga'}
                              arah={kontrol.arahUrut}
                              onUrut={kontrol.toggleUrut}
                              className="text-right"
                            >
                              {m.retur_item_harga()}
                            </HeaderUrutTabel>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {kontrol.baris.map((i) => (
                            <TableRow key={i.id}>
                              <TableCell>{i.namaProduk}</TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  max={i.qty}
                                  value={String(itemQtyMap[i.id] ?? '')}
                                  onChange={(e) => {
                                    const v = Number(e.target.value)
                                    setItemQtyMap({
                                      ...itemQtyMap,
                                      [i.id]: v > 0 ? v : 0,
                                    })
                                  }}
                                />
                                <span className="text-xs text-neutral-400">
                                  maks {i.qty}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                Rp{rupiah(i.hargaSatuan)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <PaginasiTabel
                      halamanAktif={kontrol.halamanAktif}
                      jumlahHalaman={kontrol.jumlahHalaman}
                      jumlahBaris={kontrol.jumlahBaris}
                      ukuranHalaman={kontrol.ukuranHalaman}
                      onHalaman={kontrol.setHalaman}
                      onUkuranHalaman={kontrol.setUkuranHalaman}
                    />
                    <div className="mt-2 text-right font-medium">
                      {m.retur_total()}: Rp{rupiah(hitungTotalRetur())}
                    </div>
                    <Button
                      disabled={
                        pending || hitungTotalRetur() === 0 || !alasan.trim()
                      }
                      onClick={() => void buat()}
                    >
                      {m.retur_buat()}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
