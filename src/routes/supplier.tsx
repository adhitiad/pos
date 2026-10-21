import { useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  catatPembayaranHutangFn,
  createSupplierFn,
  hapusSupplierFn,
  supplierDataFn,
  updateSupplierFn,
} from '#/server/supplierFn'
import type { NilaiFormSupplier, SupplierRow } from '#/types/supplier'

import DashboardLayout from '#/components/DashboardLayout'
import HapusDialog from '#/components/HapusDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import DialogHutang from '#/components/supplier/DialogHutang'
import FormSupplier from '#/components/supplier/FormSupplier'
import TabelSupplier from '#/components/supplier/TabelSupplier'

export const Route = createFileRoute('/supplier')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => supplierDataFn(),
  component: Supplier,
})

const formKosong: NilaiFormSupplier = {
  nama: '',
  kontak: '',
  alamat: '',
  catatan: '',
  aktif: true,
}

const awalDari = (s: SupplierRow): NilaiFormSupplier => ({
  nama: s.nama,
  kontak: s.kontak ?? '',
  alamat: s.alamat ?? '',
  catatan: s.catatan ?? '',
  aktif: s.aktif,
})

function Supplier() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [cari, setCari] = useState('')
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [bayar, setBayar] = useState<SupplierRow | null>(null)

  const baris = useMemo(() => {
    const q = cari.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (s) =>
        s.nama.toLowerCase().includes(q) ||
        (s.kontak ?? '').toLowerCase().includes(q),
    )
  }, [data, cari])

  const muatUlang = async () => {
    await router.invalidate()
  }

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Operasi gagal')
  }

  const simpan = async (nilai: NilaiFormSupplier) => {
    try {
      const payload = {
        nama: nilai.nama,
        kontak: nilai.kontak || undefined,
        alamat: nilai.alamat || undefined,
        catatan: nilai.catatan || undefined,
        aktif: nilai.aktif,
      }
      if (panel?.id)
        await updateSupplierFn({ data: { ...payload, id: panel.id } })
      else await createSupplierFn({ data: payload })
      setPanel(null)
      toast.success(m.toast_simpan())
      await muatUlang()
    } catch (e) {
      gagal(e)
    }
  }

  const supplierEdit = panel?.id
    ? (data.find((x) => x.id === panel.id) ?? null)
    : null

  return (
    <DashboardLayout
      peran="OWNER"
      judul={m.supplier_title()}
      aksi={
        <Button
          className="h-11"
          onClick={() => {
            setPanel({ id: null })
          }}
        >
          {m.supplier_tambah()}
        </Button>
      }
    >
      <Input
        placeholder={m.supplier_cari()}
        value={cari}
        onChange={(e) => {
          setCari(e.target.value)
        }}
        className="max-w-sm"
      />

      {panel && (
        <FormSupplier
          key={panel.id ?? 'baru'}
          awal={supplierEdit ? awalDari(supplierEdit) : formKosong}
          judul={panel.id ? m.supplier_edit() : m.supplier_tambah()}
          onSubmit={simpan}
          onBatal={() => {
            setPanel(null)
          }}
        />
      )}

      <HapusDialog
        terbuka={hapusId !== null}
        judul={m.hapus_judul()}
        deskripsi={`${m.hapus_deskripsi()} (${data.find((x) => x.id === hapusId)?.nama ?? ''})`}
        batal={m.supplier_batal()}
        ya={m.supplier_hapus()}
        onBatal={() => {
          setHapusId(null)
        }}
        onYa={() => {
          const id = hapusId
          if (!id) return
          hapusSupplierFn({ data: { id } })
            .then(() => {
              setHapusId(null)
              toast.success(m.toast_hapus())
              return muatUlang()
            })
            .catch(gagal)
        }}
      />

      <DialogHutang
        supplier={bayar}
        onTutup={() => {
          setBayar(null)
        }}
        onSimpan={async (pembelianBahanId, jumlah, catatan) => {
          await catatPembayaranHutangFn({
            data: { pembelianBahanId, jumlah, catatan: catatan || undefined },
          })
          toast.success(m.supplier_hutang_berhasil())
          setBayar(null)
          await muatUlang()
        }}
      />

      <TabelSupplier
        baris={baris}
        onEdit={(s) => {
          setPanel({ id: s.id })
        }}
        onHapus={setHapusId}
        onBayar={setBayar}
      />
    </DashboardLayout>
  )
}
