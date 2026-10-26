import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { simpanOpnameFn, masterAktifFn } from '#/server/opnameFn'

import DashboardLayout from '#/components/DashboardLayout'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { toast } from 'sonner'
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

export const Route = createFileRoute('/opname')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional')) throw redirect({ to: '/' })
  },
  loader: async () => {
    const [produk, bahan] = await Promise.all([
      masterAktifFn({ data: { jenis: 'PRODUK' } }),
      masterAktifFn({ data: { jenis: 'BAHAN' } }),
    ])
    return { produk, bahan }
  },
  component: Opname,
})

interface MasterItem {
  id: string
  nama: string
  stok: number
  satuan?: string
}

interface OpnameItemForm {
  id: string
  nama: string
  jenis: 'PRODUK' | 'BAHAN'
  stokTercatat: number
  stokFisik: string
}

function Opname() {
  const router = useRouter()
  const [jenis, setJenis] = useState<'PRODUK' | 'BAHAN'>('PRODUK')
  const [items, setItems] = useState<OpnameItemForm[]>([])
  const [catatan, setCatatan] = useState('')
  const [pending, setPending] = useState(false)
  const kontrol = useKontrolTabel(items, (item) => item.nama, {
    nama: (item) => item.nama,
    tercatat: (item) => item.stokTercatat,
    fisik: (item) => Number(item.stokFisik) || 0,
  })

  const muatMaster = async () => {
    const d = await masterAktifFn({ data: { jenis } })
    setMasterItems(d)
  }

  const setMasterItems = (list: MasterItem[]) => {
    setItems(
      list.map((x) => ({
        id: x.id,
        nama: x.nama,
        jenis,
        stokTercatat: x.stok,
        stokFisik: String(x.stok),
      })),
    )
  }

  const simpan = async () => {
    setPending(true)
    try {
      const inputItems = items.map((i) => ({
        jenis: i.jenis,
        id: i.id,
        stokFisik: Number(i.stokFisik || 0),
      }))
      await simpanOpnameFn({
        data: { jenis, catatan: catatan || undefined, items: inputItems },
      })
      await router.invalidate()
      toast.success(m.opname_berhasil())
      setCatatan('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.opname_gagal())
    } finally {
      setPending(false)
    }
  }

  return (
    <DashboardLayout peran={undefined} judul={m.opname_title()}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="rounded-lg border border-border p-4">
            <h2 className="text-lg font-semibold">{m.opname_simpan()}</h2>
            <div className="mt-3 space-y-3">
              <div className="space-y-1">
                <Label>{m.opname_jenis()}</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button
                    variant={jenis === 'PRODUK' ? 'default' : 'outline'}
                    onClick={() => {
                      setJenis('PRODUK')
                      void muatMaster()
                    }}
                  >
                    {m.opname_jenis_produk()}
                  </Button>
                  <Button
                    variant={jenis === 'BAHAN' ? 'default' : 'outline'}
                    onClick={() => {
                      setJenis('BAHAN')
                      void muatMaster()
                    }}
                  >
                    {m.opname_jenis_bahan()}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label>{m.opname_catatan()}</Label>
                <Textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                />
              </div>
              <PencarianTabel value={kontrol.cari} onChange={kontrol.setCari} />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <HeaderUrutTabel
                        kunci="nama"
                        aktif={kontrol.kunciUrut === 'nama'}
                        arah={kontrol.arahUrut}
                        onUrut={kontrol.toggleUrut}
                      >
                        {m.opname_item()}
                      </HeaderUrutTabel>
                      <HeaderUrutTabel
                        kunci="tercatat"
                        aktif={kontrol.kunciUrut === 'tercatat'}
                        arah={kontrol.arahUrut}
                        onUrut={kontrol.toggleUrut}
                        className="text-right"
                      >
                        {m.opname_stok_tercatat()}
                      </HeaderUrutTabel>
                      <HeaderUrutTabel
                        kunci="fisik"
                        aktif={kontrol.kunciUrut === 'fisik'}
                        arah={kontrol.arahUrut}
                        onUrut={kontrol.toggleUrut}
                        className="text-right"
                      >
                        {m.opname_stok_fisik()}
                      </HeaderUrutTabel>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {kontrol.baris.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell>{i.nama}</TableCell>
                        <TableCell className="text-right">
                          {i.stokTercatat}
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min={0}
                            value={i.stokFisik}
                            onChange={(e) => {
                              setItems(
                                items.map((x) =>
                                  x.id === i.id
                                    ? { ...x, stokFisik: e.target.value }
                                    : x,
                                ),
                              )
                            }}
                          />
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
              <Button disabled={pending} onClick={() => void simpan()}>
                {m.opname_simpan()}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
