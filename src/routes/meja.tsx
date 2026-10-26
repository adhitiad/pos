import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { QrCode } from 'lucide-react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  createMejaFn,
  hapusMejaFn,
  mejaDataFn,
  qrMejaFn,
  toggleMejaFn,
  updateMejaFn,
} from '#/server/mejaFn'

import MejaGrid from '#/components/meja/MejaGrid'
import { Button } from '#/components/ui/button'
import DashboardLayout from '#/components/DashboardLayout'
import HapusDialog from '#/components/HapusDialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Switch } from '#/components/ui/switch'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/hooks/table-controls'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

export const Route = createFileRoute('/meja')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => mejaDataFn(),
  component: Meja,
})

type QrMeja = {
  mejaId: string
  nomor: string
  nama: string | null
  token: string
  url: string
  berlakuSampai: string
  qrDataUrl: string
}

function Meja() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [filterStatus, setFilterStatus] = useState('SEMUA')
  const [qr, setQr] = useState<QrMeja | null>(null)
  const [pendingQr, setPendingQr] = useState<string | null>(null)

  const baris = data
  const barisTerfilter = baris.filter(
    (meja) =>
      filterStatus === 'SEMUA' ||
      (filterStatus === 'AKTIF' ? meja.aktif : !meja.aktif),
  )
  const kontrol = useKontrolTabel(
    barisTerfilter,
    (meja) =>
      `${meja.nomor} ${meja.nama ?? ''} ${meja.aktif ? 'aktif' : 'nonaktif'}`,
    {
      nomor: (meja) => meja.nomor,
      nama: (meja) => meja.nama ?? '',
      status: (meja) => (meja.aktif ? 1 : 0),
      transaksi: (meja) => meja.jumlahTransaksi,
    },
  )

  const muatUlang = async () => {
    await router.invalidate()
  }

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Operasi gagal')
  }

  const bukaQr = (id: string) => {
    setPendingQr(id)
    qrMejaFn({ data: { id } })
      .then((hasil) => setQr(hasil))
      .catch(gagal)
      .finally(() => setPendingQr(null))
  }

  const salinTautan = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success(m.meja_qr_disalin())
    } catch {
      toast.error(m.meja_qr_salin_gagal())
    }
  }

  const form = useForm({
    defaultValues: { nomor: '', nama: '', aktif: true },
    onSubmit: async ({ value }) => {
      setPending(true)
      try {
        const payload = {
          nomor: value.nomor,
          nama: value.nama || undefined,
          aktif: value.aktif,
        }
        if (panel?.id)
          await updateMejaFn({ data: { ...payload, id: panel.id } })
        else await createMejaFn({ data: payload })
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
      judul={m.meja_title()}
      aksi={
        <Button
          className="h-11"
          onClick={() => {
            form.reset()
            setPanel({ id: null })
          }}
        >
          {m.meja_tambah()}
        </Button>
      }
    >
      <MejaGrid data={baris} />
      {panel && (
        <Card>
          <CardHeader>
            <CardTitle>{panel.id ? m.meja_edit() : m.meja_tambah()}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault()
                void form.handleSubmit()
              }}
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <form.Field name="nomor">
                  {(field) => (
                    <div className="space-y-1">
                      <Label>{m.meja_nomor()}</Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                        }}
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="nama">
                  {(field) => (
                    <div className="space-y-1">
                      <Label>{m.meja_nama()}</Label>
                      <Input
                        value={field.state.value}
                        onChange={(e) => {
                          field.handleChange(e.target.value)
                        }}
                      />
                    </div>
                  )}
                </form.Field>
                <div className="flex items-end">
                  <Button type="submit" disabled={pending} className="h-11">
                    {m.meja_simpan()}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <HapusDialog
        terbuka={hapusId !== null}
        judul={m.hapus_judul()}
        deskripsi={`${m.hapus_deskripsi()} meja nomor ${
          baris.find((x) => x.id === hapusId)?.nomor ?? ''
        }`}
        batal={m.meja_batal()}
        ya={m.meja_hapus()}
        onBatal={() => {
          setHapusId(null)
        }}
        onYa={() => {
          const id = hapusId
          if (!id) return
          hapusMejaFn({ data: { id } })
            .then(() => {
              setHapusId(null)
              toast.success(m.toast_hapus())
              return muatUlang()
            })
            .catch(gagal)
        }}
      />

      <Dialog
        open={qr !== null}
        onOpenChange={(terbuka) => !terbuka && setQr(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {m.meja_qr_judul({ nomor: qr?.nomor ?? '' })}
            </DialogTitle>
            <DialogDescription>{m.meja_qr_desc()}</DialogDescription>
          </DialogHeader>
          {qr && (
            <div className="space-y-3 text-center">
              <img
                src={qr.qrDataUrl}
                alt={m.meja_qr_judul({ nomor: qr.nomor })}
                className="mx-auto size-64 rounded-md bg-white p-2"
              />
              <p className="text-xs text-neutral-500">
                {m.meja_qr_berlaku({
                  tanggal: new Date(qr.berlakuSampai).toLocaleDateString(
                    'id-ID',
                    { dateStyle: 'medium' },
                  ),
                })}
              </p>
              <p className="break-all text-xs text-neutral-500">{qr.url}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    void salinTautan(qr.url)
                  }}
                >
                  {m.meja_qr_salin()}
                </Button>
                <Button asChild variant="outline">
                  <a href={qr.qrDataUrl} download={`qr-meja-${qr.nomor}.svg`}>
                    {m.meja_qr_unduh()}
                  </a>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="-mx-2 overflow-x-auto">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <PencarianTabel value={kontrol.cari} onChange={kontrol.setCari} />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40" aria-label={m.meja_aktif()}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="SEMUA">{m.percetakan_semua()}</SelectItem>
              <SelectItem value="AKTIF">{m.produk_aktif()}</SelectItem>
              <SelectItem value="NONAKTIF">{m.produk_nonaktif()}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <HeaderUrutTabel
                kunci="nomor"
                aktif={kontrol.kunciUrut === 'nomor'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
              >
                {m.meja_nomor()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="nama"
                aktif={kontrol.kunciUrut === 'nama'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
              >
                {m.meja_nama()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="status"
                aktif={kontrol.kunciUrut === 'status'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
                className="text-center"
              >
                {m.meja_aktif()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="transaksi"
                aktif={kontrol.kunciUrut === 'transaksi'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
                className="text-right"
              >
                {m.meja_transaksi()}
              </HeaderUrutTabel>
              <TableHead>{m.meja_aksi()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kontrol.baris.map((mm) => (
              <TableRow key={mm.id}>
                <TableCell className="font-medium">{mm.nomor}</TableCell>
                <TableCell>{mm.nama ?? '—'}</TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={mm.aktif}
                    onCheckedChange={(aktif) => {
                      toggleMejaFn({ data: { id: mm.id, aktif } }).catch(gagal)
                    }}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {mm.jumlahTransaksi}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      onClick={() => bukaQr(mm.id)}
                      disabled={!mm.aktif || pendingQr === mm.id}
                    >
                      <QrCode className="size-4" />
                      {m.meja_qr()}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        form.reset({
                          nomor: mm.nomor,
                          nama: mm.nama ?? '',
                          aktif: mm.aktif,
                        })
                        setPanel({ id: mm.id })
                      }}
                    >
                      {m.meja_edit()}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setHapusId(mm.id)
                      }}
                    >
                      {m.meja_hapus()}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <PaginasiTabel
          halamanAktif={kontrol.halamanAktif}
          jumlahHalaman={kontrol.jumlahHalaman}
          jumlahBaris={kontrol.jumlahBaris}
          ukuranHalaman={kontrol.ukuranHalaman}
          onHalaman={kontrol.setHalaman}
          onUkuranHalaman={kontrol.setUkuranHalaman}
        />
        {baris.length === 0 && (
          <>
            <p className="py-4 text-sm text-neutral-500">{m.meja_kosong()}</p>
            <p className="py-1 text-sm text-neutral-400">
              {m.meja_kosong_hint()}
            </p>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
