import { useState } from 'react'
import {
  createFileRoute,
  Link,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { memberRiwayatFn, updateMemberFn } from '#/server/memberFn'

import { Button } from '#/components/ui/button'
import DashboardLayout from '#/components/DashboardLayout'
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

const TIER_LABEL: Record<string, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
}
const TIER_BADGE: Record<string, string> = {
  BRONZE:
    'inline-flex items-center rounded-full border border-neutral-300 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200',
  SILVER:
    'inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-900 dark:text-blue-200',
  GOLD: 'inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-900 dark:text-amber-200',
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export const Route = createFileRoute('/member/$id')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async ({ params }) => {
    if (!params.id) throw redirect({ to: '/member' })
    return memberRiwayatFn({ data: { id: params.id } })
  },
  component: MemberDetail,
})

function MemberDetail() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const { member, transaksi, riwayatAktif } = data
  const [pending, setPending] = useState(false)
  const [cari, setCari] = useState('')
  const [dari, setDari] = useState('')
  const [sampai, setSampai] = useState('')
  const [buka, setBuka] = useState<string | null>(null)

  const terfilter = transaksi.filter((t) => {
    if (cari && !t.nomor.toLowerCase().includes(cari.toLowerCase()))
      return false
    const hari = t.tanggal.slice(0, 10)
    if (dari && hari < dari) return false
    if (sampai && hari > sampai) return false
    return true
  })
  const totalTerfilter = terfilter.reduce((s, t) => s + t.total, 0)

  const form = useForm({
    defaultValues: {
      tier: String(member.tier),
      diskonPersen:
        member.diskonPersen == null ? '' : String(member.diskonPersen),
    },
    onSubmit: async ({ value }) => {
      setPending(true)
      try {
        await updateMemberFn({
          data: {
            id: member.id,
            tier: value.tier as 'BRONZE' | 'SILVER' | 'GOLD',
            diskonPersen:
              value.diskonPersen === ''
                ? undefined
                : Number(value.diskonPersen),
          },
        })
        toast.success(m.toast_simpan())
        await router.invalidate()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Gagal menyimpan')
      } finally {
        setPending(false)
      }
    },
  })

  return (
    <DashboardLayout
      peran="OWNER"
      judul={member.nama}
      aksi={
        <Button asChild className="h-11">
          <Link to="/member">{m.member_kembali()}</Link>
        </Button>
      }
    >
      <Card className="space-y-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className={TIER_BADGE[member.tier]}>
              {TIER_LABEL[member.tier]}
            </span>
            {member.nama}
          </CardTitle>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-4 text-sm">
              <div className="border-b pb-1">
                <p className="text-neutral-500">{m.member_poin()}</p>
                <p className="font-medium">{member.poin} pts</p>
              </div>
              <div className="border-b pb-1">
                <p className="text-neutral-500">{m.member_total_belanja()}</p>
                <p className="font-medium">Rp{rupiah(member.totalBelanja)}</p>
              </div>
              <div className="border-b pb-1">
                <p className="text-neutral-500">{m.member_telepon()}</p>
                <p className="font-medium">{member.telepon ?? '—'}</p>
              </div>
              <div className="border-b pb-1">
                <p className="text-neutral-500">{m.member_email()}</p>
                <p className="font-medium">{member.email ?? '—'}</p>
              </div>
            </div>
          </CardContent>
        </CardHeader>
      </Card>

      <Card className="space-y-3">
        <CardHeader>
          <CardTitle>{m.member_tier()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault()
              void form.handleSubmit()
            }}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <form.Field name="tier">
                {(field) => (
                  <div className="space-y-1">
                    <Label>{m.member_tier()}</Label>
                    <Input
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value)
                      }}
                    />
                  </div>
                )}
              </form.Field>
              <form.Field name="diskonPersen">
                {(field) => (
                  <div className="space-y-1">
                    <Label>{m.member_diskon_persen()}</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
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
                  {m.member_simpan()}
                </Button>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              {m.member_tier_keterangan()}
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{m.member_riwayat()}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!riwayatAktif ? (
            <p className="text-center py-8 text-sm text-neutral-500">
              {m.member_riwayat_nonaktif()}
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cari-riwayat">{m.member_filter_cari()}</Label>
                  <Input
                    id="cari-riwayat"
                    value={cari}
                    placeholder={m.member_nomor_struk()}
                    onChange={(e) => {
                      setCari(e.target.value)
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="dari-riwayat">{m.member_filter_dari()}</Label>
                  <Input
                    id="dari-riwayat"
                    type="date"
                    value={dari}
                    onChange={(e) => {
                      setDari(e.target.value)
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="sampai-riwayat">
                    {m.member_filter_sampai()}
                  </Label>
                  <Input
                    id="sampai-riwayat"
                    type="date"
                    value={sampai}
                    onChange={(e) => {
                      setSampai(e.target.value)
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm">
                <div className="rounded-md border p-3">
                  <p className="text-neutral-500">
                    {m.member_jumlah_transaksi()}
                  </p>
                  <p className="font-medium">{terfilter.length}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-neutral-500">
                    {m.member_total_terfilter()}
                  </p>
                  <p className="font-medium">Rp{rupiah(totalTerfilter)}</p>
                </div>
              </div>

              <div className="-mx-2 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8" />
                      <TableHead>{m.member_nomor_struk()}</TableHead>
                      <TableHead>{m.member_tanggal()}</TableHead>
                      <TableHead className="text-right">
                        {m.member_total()}
                      </TableHead>
                      <TableHead>{m.member_metode()}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {terfilter.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="text-center py-4 text-neutral-500"
                        >
                          {m.member_kosong_hint()}
                        </TableCell>
                      </TableRow>
                    ) : (
                      terfilter.flatMap((t) => {
                        const baris = [
                          <TableRow key={t.id}>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                aria-label={m.member_detail_item()}
                                onClick={() => {
                                  setBuka(buka === t.id ? null : t.id)
                                }}
                              >
                                {buka === t.id ? (
                                  <ChevronDown className="size-4" />
                                ) : (
                                  <ChevronRight className="size-4" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="font-medium">
                              {t.nomor}
                            </TableCell>
                            <TableCell>{t.tanggal.slice(0, 10)}</TableCell>
                            <TableCell className="text-right">
                              Rp{rupiah(t.total)}
                            </TableCell>
                            <TableCell>{t.metodeBayar}</TableCell>
                          </TableRow>,
                        ]
                        if (buka === t.id) {
                          baris.push(
                            <TableRow key={`${t.id}-detail`}>
                              <TableCell colSpan={5} className="bg-muted/40">
                                <div className="space-y-1 text-sm">
                                  {t.items.map((it) => (
                                    <div
                                      key={it.id}
                                      className="flex justify-between gap-2"
                                    >
                                      <span>
                                        {it.nama} x{it.qty}
                                      </span>
                                      <span>Rp{rupiah(it.subtotal)}</span>
                                    </div>
                                  ))}
                                  <div className="flex justify-between border-t pt-1 text-neutral-500">
                                    <span>{m.kasir_subtotal()}</span>
                                    <span>Rp{rupiah(t.subtotal)}</span>
                                  </div>
                                  {t.diskon > 0 && (
                                    <div className="flex justify-between text-neutral-500">
                                      <span>{m.kasir_discount()}</span>
                                      <span>-Rp{rupiah(t.diskon)}</span>
                                    </div>
                                  )}
                                  {t.pajak > 0 && (
                                    <div className="flex justify-between text-neutral-500">
                                      <span>{m.kasir_tax()}</span>
                                      <span>Rp{rupiah(t.pajak)}</span>
                                    </div>
                                  )}
                                  <div className="text-xs text-neutral-500">
                                    {m.struk_cetak_owner()}: {t.cetakOwner} |{' '}
                                    {m.struk_cetak_kasir()}: {t.cetakKasir}
                                  </div>
                                  <div className="flex justify-between font-medium">
                                    <span>{m.member_total()}</span>
                                    <span>Rp{rupiah(t.total)}</span>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>,
                          )
                        }
                        return baris
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  )
}
