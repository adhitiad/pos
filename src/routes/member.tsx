import { useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
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

import { Button } from '#/components/ui/button'
import DashboardLayout from '#/components/DashboardLayout'
import HapusDialog from '#/components/HapusDialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  useKontrolTabel,
} from '#/components/ui/table-controls'
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
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => {
    const [member, populer] = await Promise.all([
      memberDataFn(),
      produkTerpopulerFn({ data: {} }),
    ])
    return { member, populer }
  },
  component: Member,
})

const formKosong = { nama: '', telepon: '', email: '', alamat: '' }

function Member() {
  const { member, populer } = Route.useLoaderData()
  const router = useRouter()
  const [cari, setCari] = useState('')
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const baris = useMemo(() => {
    const q = cari.trim().toLowerCase()
    if (!q) return member
    return member.filter(
      (mm) =>
        mm.nama.toLowerCase().includes(q) ||
        (mm.telepon ?? '').toLowerCase().includes(q),
    )
  }, [member, cari])
  const kontrol = useKontrolTabel(
    baris,
    (mm) => `${mm.nama} ${mm.telepon ?? ''} ${mm.email ?? ''}`,
    {
      nama: (mm) => mm.nama,
      telepon: (mm) => mm.telepon ?? '',
      poin: (mm) => mm.poin,
      transaksi: (mm) => mm.jumlahTransaksi,
    },
  )

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
        className="max-w-sm"
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
              <div className="flex gap-2">
                <Button type="submit" disabled={pending} className="h-11">
                  {m.member_simpan()}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPanel(null)
                  }}
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
        deskripsi={`${m.hapus_deskripsi()} (${baris.find((x) => x.id === hapusId)?.nama ?? ''})`}
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
                aktif={kontrol.kunciUrut === 'nama'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
              >
                {m.member_nama()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="telepon"
                aktif={kontrol.kunciUrut === 'telepon'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
              >
                {m.member_telepon()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="poin"
                aktif={kontrol.kunciUrut === 'poin'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
                className="text-right"
              >
                {m.member_poin()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="transaksi"
                aktif={kontrol.kunciUrut === 'transaksi'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
                className="text-right"
              >
                {m.member_trx()}
              </HeaderUrutTabel>
              <TableHead>{m.member_aksi()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kontrol.baris.map((mm) => (
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
                  <div className="flex gap-1">
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
                    >
                      {m.member_edit()}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setHapusId(mm.id)
                      }}
                    >
                      {m.member_hapus()}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {kontrol.jumlahBaris === 0 && (
          <>
            <p className="py-4 text-sm text-neutral-500">{m.member_kosong()}</p>
            <p className="py-1 text-sm text-neutral-400">
              {m.member_kosong_hint()}
            </p>
          </>
        )}
        <PaginasiTabel
          halamanAktif={kontrol.halamanAktif}
          jumlahHalaman={kontrol.jumlahHalaman}
          jumlahBaris={kontrol.jumlahBaris}
          ukuranHalaman={kontrol.ukuranHalaman}
          onHalaman={kontrol.setHalaman}
          onUkuranHalaman={kontrol.setUkuranHalaman}
        />
      </div>
    </DashboardLayout>
  )
}
