import { useEffect, useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  bahanDataFn,
  createBahanFn,
  hapusBahanFn,
  updateBahanFn,
} from '#/server/bahanFn'
import {
  daftarPembelianBahanFn,
  pembelianBahanFn,
} from '#/server/pembelianBahanFn'
import { supplierOpsiFn } from '#/server/supplierFn'
import type { BahanRow, MuatanBahan, NilaiFormBahan } from '#/types/bahan'
import type { PembelianBahanRow } from '#/types/pembelian-bahan'
import type { SumberBelanja } from '#/validations/pembelian-bahan'

import DaftarPembelian from '#/components/bahan/DaftarPembelian'
import FormBahan from '#/components/bahan/FormBahan'
import FormPembelianBahan from '#/components/bahan/FormPembelianBahan'
import TabelBahan from '#/components/bahan/TabelBahan'
import DashboardLayout from '#/components/DashboardLayout'
import HapusDialog from '#/components/HapusDialog'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'

export const Route = createFileRoute('/bahan')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => {
    const [bahan, supplier] = await Promise.all([
      bahanDataFn(),
      supplierOpsiFn(),
    ])
    return { bahan, supplier }
  },
  component: Bahan,
})

const formKosong: NilaiFormBahan = {
  nama: '',
  satuan: '',
  jenis: '',
  stok: 0,
  stokMinimum: 0,
  hargaSatuan: 0,
}

const awalDari = (b: BahanRow): NilaiFormBahan => ({
  nama: b.nama,
  satuan: b.satuan,
  jenis: b.jenis ?? '',
  stok: b.stok,
  stokMinimum: b.stokMinimum,
  hargaSatuan: b.hargaSatuan,
})

function Bahan() {
  const { bahan: data, supplier } = Route.useLoaderData()
  const router = useRouter()
  const [cari, setCari] = useState('')
  const [hanyaMenipis, setHanyaMenipis] = useState(false)
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [pembelianPanel, setPembelianPanel] = useState<string | null>(null)
  const [daftarPembelian, setDaftarPembelian] = useState<PembelianBahanRow[]>(
    [],
  )

  const jumlahMenipis = data.filter((b) => b.menipis).length

  useEffect(() => {
    void muatUlangPembelian()
  }, [])

  const baris = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return data.filter(
      (b) =>
        (!hanyaMenipis || b.menipis) &&
        (!q ||
          b.nama.toLowerCase().includes(q) ||
          b.satuan.toLowerCase().includes(q)),
    )
  }, [data, cari, hanyaMenipis])

  const muatUlang = async () => {
    await router.invalidate()
    await muatUlangPembelian()
  }

  const muatUlangPembelian = async () => {
    try {
      const hasil = await daftarPembelianBahanFn({ data: {} })
      setDaftarPembelian(hasil)
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : 'Gagal memuat daftar pembelian bahan',
      )
    }
  }

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Operasi gagal')
  }

  const simpanBahan = async (nilai: NilaiFormBahan) => {
    try {
      const payload: MuatanBahan = {
        nama: nilai.nama,
        satuan: nilai.satuan,
        jenis: nilai.jenis || undefined,
        stok: Number(nilai.stok) || 0,
        stokMinimum: Number(nilai.stokMinimum) || 0,
        hargaSatuan: Number(nilai.hargaSatuan) || 0,
      }
      if (panel?.id) await updateBahanFn({ data: { ...payload, id: panel.id } })
      else await createBahanFn({ data: payload })
      setPanel(null)
      toast.success(m.toast_simpan())
      await muatUlang()
    } catch (e) {
      gagal(e)
    }
  }

  const simpanPembelian = async (nilai: {
    jumlah: number
    hargaSatuan: number
    catatan?: string
    supplierId?: string
    hutang: boolean
    sumberBelanja: SumberBelanja
    tempatBelanja?: string
  }) => {
    if (!pembelianPanel) return
    try {
      await pembelianBahanFn({
        data: { bahanId: pembelianPanel, ...nilai },
      })
      toast.success(m.bahan_pembelian_berhasil())
      setPembelianPanel(null)
      await muatUlang()
    } catch (err) {
      gagal(err)
    }
  }

  const bahanEdit = panel?.id
    ? (baris.find((x) => x.id === panel.id) ?? null)
    : null

  return (
    <DashboardLayout
      peran="OWNER"
      judul={m.bahan_title()}
      aksi={
        <div className="flex items-center gap-2">
          {jumlahMenipis > 0 && (
            <Badge variant="destructive">
              {jumlahMenipis} {m.bahan_menipis()}
            </Badge>
          )}
          <Button
            className="h-11"
            onClick={() => {
              setPanel({ id: null })
            }}
          >
            {m.bahan_tambah()}
          </Button>
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder={m.bahan_cari()}
          value={cari}
          onChange={(e) => {
            setCari(e.target.value)
          }}
          className="max-w-sm"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={hanyaMenipis}
            onCheckedChange={(v) => {
              setHanyaMenipis(v === true)
            }}
          />
          {m.bahan_hanya_menipis()}
        </label>
      </div>

      {panel && (
        <FormBahan
          key={panel.id ?? 'baru'}
          awal={bahanEdit ? awalDari(bahanEdit) : formKosong}
          judul={panel.id ? m.bahan_edit() : m.bahan_tambah()}
          onSubmit={simpanBahan}
          onBatal={() => {
            setPanel(null)
          }}
        />
      )}

      {pembelianPanel && (
        <FormPembelianBahan
          supplier={supplier}
          onSubmit={simpanPembelian}
          onBatal={() => {
            setPembelianPanel(null)
          }}
        />
      )}

      <HapusDialog
        terbuka={hapusId !== null}
        judul={m.hapus_judul()}
        deskripsi={`${m.hapus_deskripsi()} (${baris.find((x) => x.id === hapusId)?.nama ?? ''})`}
        batal={m.bahan_batal()}
        ya={m.bahan_hapus()}
        onBatal={() => {
          setHapusId(null)
        }}
        onYa={() => {
          const id = hapusId
          if (!id) return
          hapusBahanFn({ data: { id } })
            .then(() => {
              setHapusId(null)
              toast.success(m.toast_hapus())
              return muatUlang()
            })
            .catch(gagal)
        }}
      />

      <TabelBahan
        baris={baris}
        onTambahStok={setPembelianPanel}
        onEdit={(b) => {
          setPanel({ id: b.id })
        }}
        onHapus={setHapusId}
      />

      <DaftarPembelian daftar={daftarPembelian} />
    </DashboardLayout>
  )
}
