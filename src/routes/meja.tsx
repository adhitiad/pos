import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  createMejaFn,
  hapusMejaFn,
  mejaDataFn,
  toggleMejaFn,
  updateMejaFn,
} from '#/server/mejaFn'

import { Button } from '#/components/ui/button'
import DashboardLayout from '#/components/DashboardLayout'
import HapusDialog from '#/components/HapusDialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Switch } from '#/components/ui/switch'

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

function Meja() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const baris = data

  const muatUlang = async () => {
    await router.invalidate()
  }

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Operasi gagal')
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

      <div className="-mx-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.meja_nomor()}</TableHead>
              <TableHead>{m.meja_nama()}</TableHead>
              <TableHead className="text-center">{m.meja_aktif()}</TableHead>
              <TableHead className="text-right">{m.meja_transaksi()}</TableHead>
              <TableHead>{m.meja_aksi()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {baris.map((mm) => (
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
                  <div className="flex gap-1">
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
