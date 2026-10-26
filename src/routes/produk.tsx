import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

import { ProdukTabel, helper } from '#/components/produk/ProdukTabel'
import type { ProdukRow } from '#/types/produk'
import { ProdukForm, formKosong } from '#/components/produk/ProdukForm'
import { ProdukKategori } from '#/components/produk/ProdukKategori'
import { ProdukHapusDialog } from '#/components/produk/ProdukHapusDialog'
import { ProdukQuerySchema } from '#/validations/produk'
import type { ProdukQueryInput } from '#/validations/produk'
import {
  unggahFotoProduk,
  unduhDariCloudinary,
  urlGambarCloudinary,
} from '#/lib/cloudinary'

export const Route = createFileRoute('/produk')({
  validateSearch: (search) => ProdukQuerySchema.parse(search),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => produkDataFn({ data: deps }),
  component: Produk,
})

function Produk() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [cari, setCari] = useState(search.q ?? '')
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [resep, setResep] = useState<{ bahanId: string; jumlah: number }[]>([])
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [katNama, setKatNama] = useState('')
  const [pending, setPending] = useState(false)
  const [fileFoto, setFileFoto] = useState<File | null>(null)

  const baris = data.produk

  // Search terkini untuk timer debounce (hindari menimpa navigasi lain).
  const searchRef = useRef(search)
  useEffect(() => {
    searchRef.current = search
  })
  // Id timer debounce; dikirim ulang/batalkan oleh kontrol tabel.
  const timerRef: { current: ReturnType<typeof setTimeout> | null } =
    useRef(null)

  // Pencarian diketik lokal lalu dikirim ke server setelah jeda singkat.
  useEffect(() => {
    const teks = cari.trim()
    if (teks === (search.q ?? '')) return
    const timer = setTimeout(() => {
      const terkini = searchRef.current
      // Navigasi lain (urut/halaman) bisa terjadi saat menunggu; jika teks
      // telah terkirim olehnya, timer ini tidak perlu menulis lagi.
      if (teks === (terkini.q ?? '')) return
      void navigate({
        to: '/produk',
        search: { ...terkini, q: teks || undefined, skip: 0 },
        replace: true,
      })
    }, 300)
    timerRef.current = timer
    return () => {
      clearTimeout(timer)
      timerRef.current = null
    }
  }, [cari, search.q, navigate])

  // Seluruh kontrol tabel ikut membawa teks pencarian terbaru agar navigasi
  // yang berlangsung sebelum debounce tidak membuang teks yang baru diketik.
  const kirim = (patch: Partial<ProdukQueryInput>) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    void navigate({
      to: '/produk',
      search: {
        ...searchRef.current,
        q: cari || undefined,
        ...patch,
      },
    })
  }

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
    form.reset(
      {
        nama: p.nama,
        sku: p.sku ?? '',
        barcode: p.barcode ?? '',
        gambar: p.gambar ?? '',
        harga: p.harga,
        stok: p.stok,
        kategoriId: p.kategoriId ?? '',
        aktif: p.aktif,
      },
      { keepDefaultValues: true },
    )
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
          enableSorting: false,
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
          enableSorting: false,
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
      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder={m.produk_cari()}
          aria-label={m.produk_cari()}
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={search.status}
          onValueChange={(nilai) => {
            void kirim({
              status: nilai as 'semua' | 'aktif' | 'nonaktif',
              skip: 0,
            })
          }}
        >
          <SelectTrigger
            className="w-[160px]"
            aria-label={m.produk_filter_status()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">{m.produk_semua_status()}</SelectItem>
            <SelectItem value="aktif">{m.produk_aktif()}</SelectItem>
            <SelectItem value="nonaktif">{m.produk_nonaktif()}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={search.kategoriId ?? 'semua'}
          onValueChange={(nilai) => {
            void kirim({
              kategoriId: nilai === 'semua' ? undefined : nilai,
              skip: 0,
            })
          }}
        >
          <SelectTrigger
            className="w-[180px]"
            aria-label={m.produk_filter_kategori()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semua">{m.produk_semua_kategori()}</SelectItem>
            {data.kategori.map((kategori) => (
              <SelectItem key={kategori.id} value={kategori.id}>
                {kategori.nama}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {m.produk_menampilkan({
            tampil: baris.length,
            total: data.total,
          })}
        </span>
      </div>

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

      <ProdukTabel
        baris={baris}
        columns={columns}
        total={data.total}
        pagination={{
          pageIndex: Math.floor(search.skip / search.take),
          pageSize: search.take,
        }}
        onPaginationChange={(updater) => {
          const sekarang = {
            pageIndex: Math.floor(search.skip / search.take),
            pageSize: search.take,
          }
          const baru =
            typeof updater === 'function' ? updater(sekarang) : updater
          kirim({
            take: baru.pageSize,
            skip: baru.pageIndex * baru.pageSize,
          })
        }}
        sorting={[
          {
            id: search.sort === 'kategori' ? 'kategoriNama' : search.sort,
            desc: search.arah === 'desc',
          },
        ]}
        onSortingChange={(updater) => {
          const sekarang = [
            {
              id: search.sort === 'kategori' ? 'kategoriNama' : search.sort,
              desc: search.arah === 'desc',
            },
          ]
          const baru =
            typeof updater === 'function' ? updater(sekarang) : updater
          const pertama = baru[0] ?? sekarang[0]
          const sort = (
            pertama.id === 'kategoriNama' ? 'kategori' : pertama.id
          ) as 'nama' | 'sku' | 'harga' | 'stok' | 'aktif' | 'kategori'
          kirim({
            sort,
            arah: pertama.desc ? 'desc' : 'asc',
            skip: 0,
          })
        }}
      />

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
