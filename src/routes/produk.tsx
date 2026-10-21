import { useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'
import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  createKategoriFn,
  createProdukFn,
  hapusKategoriFn,
  hapusProdukFn,
  produkDataFn,
  toggleProdukFn,
  updateProdukFn,
} from '#/server/produkFn'

import DashboardLayout from '#/components/DashboardLayout'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'

import { ProdukTabel, helper } from '#/components/produk/ProdukTabel'
import type { ProdukRow } from '#/types/produk'
import { ProdukForm, formKosong } from '#/components/produk/ProdukForm'
import { ProdukKategori } from '#/components/produk/ProdukKategori'
import { ProdukHapusDialog } from '#/components/produk/ProdukHapusDialog'
import {
  unggahFotoProduk,
  unduhDariCloudinary,
  urlGambarCloudinary,
} from '#/lib/cloudinary'

export const Route = createFileRoute('/produk')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => produkDataFn(),
  component: Produk,
})

function Produk() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [cari, setCari] = useState('')
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [resep, setResep] = useState<{ bahanId: string; jumlah: number }[]>([])
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [katNama, setKatNama] = useState('')
  const [pending, setPending] = useState(false)
  const [fileFoto, setFileFoto] = useState<File | null>(null)

  const baris = useMemo(() => {
    const q = cari.trim().toLowerCase()
    if (!q) return data.produk
    return data.produk.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        (p.barcode ?? '').toLowerCase().includes(q) ||
        (p.kategoriNama ?? '').toLowerCase().includes(q),
    )
  }, [data.produk, cari])

  const muatUlang = async () => {
    await router.invalidate()
  }

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Operasi gagal')
  }

  const form = useForm({
    defaultValues: formKosong,
    onSubmit: async ({ value }) => {
      setPending(true)
      try {
        const gabung = new Map<string, number>()
        for (const r of resep) {
          if (!r.bahanId || !(r.jumlah > 0)) continue
          gabung.set(r.bahanId, (gabung.get(r.bahanId) ?? 0) + r.jumlah)
        }
        const payload = {
          nama: value.nama,
          sku: value.sku || undefined,
          barcode: value.barcode || undefined,
          gambar: fileFoto
            ? await unggahFotoProduk(fileFoto)
            : value.gambar || undefined,
          harga: Number(value.harga) || 0,
          stok: Number(value.stok) || 0,
          kategoriId: value.kategoriId || undefined,
          aktif: value.aktif,
          resep: [...gabung.entries()].map(([bahanId, jumlah]) => ({
            bahanId,
            jumlah,
          })),
        }
        if (panel?.id)
          await updateProdukFn({ data: { ...payload, id: panel.id } })
        else await createProdukFn({ data: payload })
        setPanel(null)
        form.reset()
        setFileFoto(null)
        setResep([])
        toast.success(m.toast_simpan())
        await muatUlang()
      } catch (e) {
        gagal(e)
      } finally {
        setPending(false)
      }
    },
  })

  const bukaTambah = () => {
    form.reset()
    setFileFoto(null)
    setResep([])
    setPanel({ id: null })
  }

  const bukaUbah = (p: ProdukRow) => {
    form.reset({
      nama: p.nama,
      sku: p.sku ?? '',
      barcode: p.barcode ?? '',
      gambar: p.gambar ?? '',
      harga: p.harga,
      stok: p.stok,
      kategoriId: p.kategoriId ?? '',
      aktif: p.aktif,
    })
    setFileFoto(null)
    setResep(
      p.resep.map((r: { bahanId: string; jumlah: number }) => ({
        bahanId: r.bahanId,
        jumlah: r.jumlah,
      })),
    )
    setPanel({ id: p.id })
  }

  const columns = useMemo(
    () =>
      helper.columns([
        helper.accessor('gambar', {
          header: () => m.produk_gambar(),
          cell: ({ row }) => {
            const g = row.original.gambar
            if (!g) return '—'
            return (
              <div className="flex items-center gap-2">
                <img
                  src={urlGambarCloudinary(g, 80)}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const ekst = g.split('.').pop()?.split('?')[0] || 'jpg'
                    unduhDariCloudinary(
                      g,
                      `${row.original.nama}.${ekst}`,
                    ).catch(gagal)
                  }}
                >
                  {m.produk_unduh()}
                </Button>
              </div>
            )
          },
        }),
        helper.accessor('nama', { header: () => m.produk_nama() }),
        helper.accessor('sku', {
          header: 'SKU',
          cell: ({ row }) => row.original.sku ?? '—',
        }),
        helper.accessor('kategoriNama', {
          header: () => m.produk_kategori(),
          cell: ({ row }) => row.original.kategoriNama ?? '—',
        }),
        helper.accessor('harga', {
          header: () => m.produk_harga(),
          cell: ({ row }) => {
            const n = row.original.harga
            return new Intl.NumberFormat('id-ID', {
              maximumFractionDigits: 0,
            }).format(n)
          },
        }),
        helper.accessor('stok', { header: () => m.produk_stok() }),
        helper.accessor('aktif', {
          header: () => m.produk_status(),
          cell: ({ row }) =>
            row.original.aktif ? (
              <Badge>{m.produk_aktif()}</Badge>
            ) : (
              <Badge variant="outline">{m.produk_nonaktif()}</Badge>
            ),
        }),
        helper.display({
          id: 'aksi',
          header: () => m.produk_aksi(),
          cell: ({ row }) => {
            const p = row.original
            return (
              <div className="flex gap-1">
                <Button variant="outline" onClick={() => bukaUbah(p)}>
                  {m.produk_edit()}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toggleProdukFn({ data: { id: p.id, aktif: !p.aktif } })
                      .then(() => muatUlang())
                      .catch(gagal)
                  }}
                >
                  {p.aktif ? m.produk_toggle_off() : m.produk_toggle_on()}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setHapusId(p.id)
                  }}
                >
                  {m.produk_hapus()}
                </Button>
              </div>
            )
          },
        }),
      ]),
    [data.produk],
  )

  return (
    <DashboardLayout
      peran="OWNER"
      judul={m.produk_title()}
      aksi={
        <Button onClick={bukaTambah} className="h-11">
          {m.produk_tambah()}
        </Button>
      }
    >
      <Input
        placeholder={m.produk_cari()}
        value={cari}
        onChange={(e) => setCari(e.target.value)}
        className="max-w-sm"
      />

      {panel && (
        <ProdukForm
          panel={panel}
          form={form}
          fileFoto={fileFoto}
          setFileFoto={setFileFoto}
          resep={resep}
          pending={pending}
          data={data}
          onBatal={() => setPanel(null)}
          onTambahBahan={() =>
            setResep((lama) => [...lama, { bahanId: '', jumlah: 0 }])
          }
          onHapusBahan={(i) =>
            setResep((lama) => lama.filter((_, j) => j !== i))
          }
          onUbahBahan={(i, f) =>
            setResep((lama) => lama.map((x, j) => (j === i ? f : x)))
          }
        />
      )}

      <ProdukTabel baris={baris} columns={columns} />

      <ProdukHapusDialog
        terbuka={hapusId !== null}
        nama={data.produk.find((p) => p.id === hapusId)?.nama}
        onBatal={() => setHapusId(null)}
        onYa={() => {
          const id = hapusId
          if (!id) return
          hapusProdukFn({ data: { id } })
            .then(() => {
              setHapusId(null)
              toast.success(m.toast_hapus())
              return muatUlang()
            })
            .catch(gagal)
        }}
      />

      <ProdukKategori
        katNama={katNama}
        setKatNama={setKatNama}
        kategori={data.kategori}
        onTambah={() => {
          if (!katNama.trim()) return
          createKategoriFn({ data: { nama: katNama.trim() } })
            .then(() => {
              setKatNama('')
              return muatUlang()
            })
            .catch(gagal)
        }}
        onHapus={(id) => {
          hapusKategoriFn({ data: { id } })
            .then(() => muatUlang())
            .catch(gagal)
        }}
        onMuatUlang={muatUlang}
        onError={gagal}
      />
    </DashboardLayout>
  )
}
