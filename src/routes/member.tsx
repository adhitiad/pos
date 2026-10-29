import { useEffect, useRef, useState } from 'react'
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { urlGambarCloudinary } from '#/lib/cloudinary'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  createMemberFn,
  hapusMemberFn,
  memberDataFn,
  updateMemberFn,
} from '#/server/memberFn'
import { produkTerpopulerFn } from '#/server/produkFn'
import { MemberQuerySchema } from '#/validations/member'
import type { MemberQueryInput } from '#/validations/member'

import { Button } from '#/components/ui/button'
import DashboardLayout from '#/components/DashboardLayout'
import HapusDialog from '#/components/HapusDialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { HeaderUrutTabel, PaginasiTabel } from '#/hooks/table-controls'
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

const inisial = (nama: string) =>
  nama
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('')

export const Route = createFileRoute('/member')({
  validateSearch: (search) => MemberQuerySchema.parse(search),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [member, populer] = await Promise.all([
      memberDataFn({ data: deps }),
      produkTerpopulerFn({ data: {} }),
    ])
    return { member, populer }
  },
  component: Member,
})

const formKosong = { nama: '', telepon: '', email: '', alamat: '' }

function Member() {
  const { member, populer } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const router = useRouter()
  const [cari, setCari] = useState(search.q ?? '')
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const data = member.baris

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
        to: '/member',
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
  const kirim = (
    patch: Partial<{
      q?: string
      skip: number
      take: number
      sort: MemberQueryInput['sort']
      arah: 'asc' | 'desc'
    }>,
  ) => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    void navigate({
      to: '/member',
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

  const urutkan = (kunci: string) => {
    const sort = kunci as 'nama' | 'telepon' | 'poin' | 'transaksi'
    kirim({
      sort,
      arah: search.sort === sort && search.arah === 'asc' ? 'desc' : 'asc',
      skip: 0,
    })
  }

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Operasi gagal')
  }

  const form = useForm({
    defaultValues: formKosong,
    onSubmit: async ({ value }) => {
      setPending(true)
      try {
        const payload = {
          nama: value.nama,
          telepon: value.telepon || undefined,
          email: value.email || undefined,
          alamat: value.alamat || undefined,
        }
        if (panel?.id)
          await updateMemberFn({ data: { ...payload, id: panel.id } })
        else await createMemberFn({ data: payload })
        setPanel(null)
        form.reset()
        toast.success(m.toast_simpan())
        await muatUlang()
      } catch (e) {
        gagal(e)
      } finally {
        setPending(false)
      }
    },
  })

  return (
    <DashboardLayout
      peran="OWNER"
      judul={m.member_title()}
      aksi={
        <Button
          className="h-11"
          onClick={() => {
            form.reset()
            setPanel({ id: null })
          }}
        >
          {m.member_tambah()}
        </Button>
      }
    >
      <Input
        placeholder={m.member_cari()}
        value={cari}
        onChange={(e) => {
          setCari(e.target.value)
        }}
        className="w-full max-w-sm sm:max-w-md"
      />

      {populer.length > 0 && (
        <Card className="space-y-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {m.produk_terpopuler()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {populer.map((p) => (
                <div key={p.produkId} className="flex-none w-48 flex-col gap-2">
                  <div className="aspect-square rounded-xl bg-accent overflow-hidden relative">
                    {p.gambar ? (
                      <img
                        src={urlGambarCloudinary(p.gambar, 400)}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                        {inisial(p.nama)}
                      </div>
                    )}
                    <span className="absolute right-1 top-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      {p.terjual} {m.produk_terjual()}
                    </span>
                  </div>
                  <span className="text-sm font-medium truncate">{p.nama}</span>
                  <span className="text-sm text-neutral-500">
                    Rp{rupiah(p.harga)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {panel && (
        <Card>
          <CardHeader>
            <CardTitle>
              {panel.id ? m.member_edit() : m.member_tambah()}
            </CardTitle>
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
                      <Label>{m.member_nama()}</Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                        }}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="telepon">
                  {(field) => (
                    <div className="space-y-1">
                      <Label>{m.member_telepon()}</Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                        }}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="email">
                  {(field) => (
                    <div className="space-y-1">
                      <Label>{m.member_email()}</Label>
                      <Input
                        type="email"
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                        }}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="alamat">
                  {(field) => (
                    <div className="space-y-1">
                      <Label>{m.member_alamat()}</Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                        }}
                      />
                    </div>
                  )}
                </form.Field>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Button
                  type="submit"
                  disabled={pending}
                  className="h-11 w-full sm:w-auto min-h-[44px]"
                >
                  {m.member_simpan()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPanel(null)
                  }}
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  {m.member_batal()}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <HapusDialog
        terbuka={hapusId !== null}
        judul={m.hapus_judul()}
        deskripsi={`${m.hapus_deskripsi()} (${data.find((x) => x.id === hapusId)?.nama ?? ''})`}
        batal={m.member_batal()}
        ya={m.member_hapus()}
        onBatal={() => {
          setHapusId(null)
        }}
        onYa={() => {
          const id = hapusId
          if (!id) return
          hapusMemberFn({ data: { id } })
            .then(() => {
              setHapusId(null)
              toast.success(m.toast_hapus())
              return muatUlang()
            })
            .catch(gagal)
        }}
      />

      <div className="-mx-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <HeaderUrutTabel
                kunci="nama"
                aktif={search.sort === 'nama'}
                arah={search.arah}
                onUrut={urutkan}
              >
                {m.member_nama()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="telepon"
                aktif={search.sort === 'telepon'}
                arah={search.arah}
                onUrut={urutkan}
              >
                {m.member_telepon()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="poin"
                aktif={search.sort === 'poin'}
                arah={search.arah}
                onUrut={urutkan}
                className="text-right"
              >
                {m.member_poin()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="transaksi"
                aktif={search.sort === 'transaksi'}
                arah={search.arah}
                onUrut={urutkan}
                className="text-right"
              >
                {m.member_trx()}
              </HeaderUrutTabel>
              <TableHead>{m.member_aksi()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((mm) => (
              <TableRow key={mm.id}>
                <TableCell>
                  <p className="font-medium">{mm.nama}</p>
                  {mm.terakhir && (
                    <p className="text-xs text-neutral-500">
                      {m.member_terakhir()}: {mm.terakhir.tanggal.slice(0, 10)}
                    </p>
                  )}
                </TableCell>
                <TableCell>{mm.telepon ?? '—'}</TableCell>
                <TableCell className="text-right">{mm.poin}</TableCell>
                <TableCell className="text-right">
                  {mm.jumlahTransaksi}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button
                      variant="outline"
                      onClick={() => {
                        form.reset({
                          nama: mm.nama,
                          telepon: mm.telepon ?? '',
                          email: mm.email ?? '',
                          alamat: mm.alamat ?? '',
                        })
                        setPanel({ id: mm.id })
                      }}
                      className="w-full sm:w-auto min-h-[44px]"
                    >
                      {m.member_edit()}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setHapusId(mm.id)
                      }}
                      className="w-full sm:w-auto min-h-[44px] text-destructive"
                    >
                      {m.member_hapus()}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {member.total === 0 && (
          <>
            <p className="py-4 text-sm text-neutral-500">{m.member_kosong()}</p>
            <p className="py-1 text-sm text-neutral-400">
              {m.member_kosong_hint()}
            </p>
          </>
        )}
        <PaginasiTabel
          halamanAktif={Math.floor(search.skip / search.take)}
          jumlahHalaman={Math.max(1, Math.ceil(member.total / search.take))}
          jumlahBaris={member.total}
          ukuranHalaman={search.take}
          onHalaman={(halaman) => {
            kirim({ skip: halaman * search.take })
          }}
          onUkuranHalaman={(ukuran) => {
            kirim({ take: ukuran, skip: 0 })
          }}
        />
      </div>
    </DashboardLayout>
  )
}
