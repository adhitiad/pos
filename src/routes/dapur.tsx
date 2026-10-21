import { useEffect, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { dapurDataFn, updateStatusPesananFn } from '#/server/dapurFn'
import type { STATUS_PESANAN } from '#/validations/transaksi'

import { Button } from '#/components/ui/button'
import DashboardLayout from '#/components/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

const STATUS_LABEL: Record<string, string> = {
  MENUNGGU: 'Menunggu',
  DIPROSES: 'Diproses',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
}
const STATUS_BADGE: Record<string, string> = {
  MENUNGGU:
    'inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:border-amber-900 dark:bg-amber-900 dark:text-amber-200',
  DIPROSES:
    'inline-flex items-center rounded-full border border-blue-200 bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-900 dark:text-blue-200',
  SELESAI:
    'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900 dark:text-emerald-200',
  DIBATALKAN:
    'inline-flex items-center rounded-full border border-neutral-200 bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-800 dark:border-neutral-800 dark:bg-neutral-800 dark:text-neutral-200',
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export const Route = createFileRoute('/dapur')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional')) throw redirect({ to: '/' })
  },
  loader: async () => dapurDataFn(),
  component: Dapur,
})

function Dapur() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [pending, setPending] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      void router.invalidate()
    }, 20_000)
    return () => clearInterval(interval)
  }, [router])

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Gagal memperbarui status')
  }

  const ubahStatus = async (id: string, status: string) => {
    setPending((s) => ({ ...s, [id]: true }))
    try {
      await updateStatusPesananFn({
        data: { id, statusPesanan: status as (typeof STATUS_PESANAN)[number] },
      })
      await router.invalidate()
      toast.success('Status diperbarui')
    } catch (e) {
      gagal(e)
    } finally {
      setPending((s) => {
        const next = { ...s }
        delete next[id]
        return next
      })
    }
  }

  return (
    <DashboardLayout peran={undefined} judul={m.dapur_title()}>
      <div className="-mx-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.dapur_no_struk()}</TableHead>
              <TableHead>{m.dapur_meja()}</TableHead>
              <TableHead>{m.dapur_member()}</TableHead>
              <TableHead className="text-right">{m.dapur_total()}</TableHead>
              <TableHead>{m.dapur_status()}</TableHead>
              <TableHead>{m.dapur_aksi()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-4 text-neutral-500"
                >
                  {m.dapur_kosong()}
                </TableCell>
              </TableRow>
            ) : (
              data.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.nomor}</TableCell>
                  <TableCell>
                    {t.meja ? t.meja.nomor : '-'}{' '}
                    {t.meja?.nama ? `(${t.meja.nama})` : ''}
                  </TableCell>
                  <TableCell>{t.member?.nama ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    Rp{rupiah(t.total)}
                  </TableCell>
                  <TableCell>
                    <span className={STATUS_BADGE[t.statusPesanan]}>
                      {STATUS_LABEL[t.statusPesanan]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {t.statusPesanan === 'MENUNGGU' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending[t.id]}
                          onClick={() => void ubahStatus(t.id, 'DIPROSES')}
                        >
                          {m.dapur_mulai()}
                        </Button>
                      )}
                      {t.statusPesanan === 'DIPROSES' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pending[t.id]}
                          onClick={() => void ubahStatus(t.id, 'SELESAI')}
                        >
                          {m.dapur_selesai()}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending[t.id]}
                        onClick={() => void ubahStatus(t.id, 'DIBATALKAN')}
                      >
                        {m.dapur_batalkan()}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4 space-y-3">
        {data.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{t.nomor}</span>
                <span className={STATUS_BADGE[t.statusPesanan]}>
                  {STATUS_LABEL[t.statusPesanan]}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <p className="text-sm text-neutral-500 mb-2">
                {t.meja ? `Meja ${t.meja.nomor}` : 'Take away'} ·
                {t.member?.nama ?? 'Non-member'}
              </p>
              <div className="space-y-1">
                {t.items.map((it) => (
                  <div key={it.id} className="text-sm flex justify-between">
                    <span>
                      {it.produkNama} ×{it.qty}
                      {it.modifiers.length > 0 && (
                        <span className="text-xs text-neutral-400 ml-1">
                          (
                          {it.modifiers
                            .map((mod) => `${mod.modifier} ×${mod.qty}`)
                            .join(', ')}
                          )
                        </span>
                      )}
                    </span>
                    <span className="text-right">Rp{rupiah(it.subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 border-t pt-1 text-right text-sm font-medium">
                Rp{rupiah(t.total)}
              </div>
              <div className="mt-1 text-xs text-neutral-500">
                {m.dapur_cetak_owner()}: {t.cetakOwner} |{' '}
                {m.dapur_cetak_kasir()}: {t.cetakKasir}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
