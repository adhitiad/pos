import { useState } from 'react'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { auditLogDataFn } from '#/server/auditLogFn'
import { punyaAkses } from '#/server/peran'
import {
  AKSI_AUDIT,
  AuditLogQuerySchema,
  ENTITAS_AUDIT,
} from '#/validations/audit'

import DashboardLayout from '#/components/DashboardLayout'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { PaginasiTabel, UKURAN_HALAMAN_TABEL } from '#/hooks/table-controls'

const SEMUA = 'semua'
const UKURAN_HALAMAN = 10
const ukuranValid = (nilai?: number) =>
  UKURAN_HALAMAN_TABEL.find((ukuran) => ukuran === nilai) ?? UKURAN_HALAMAN

export const Route = createFileRoute('/audit-log')({
  validateSearch: (search) => AuditLogQuerySchema.parse(search),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) =>
    auditLogDataFn({
      data: { ...deps, take: ukuranValid(deps.take) },
    }),
  component: AuditLog,
})

// Tampilkan snapshot JSON ringkas (sebelum → sesudah) per baris log.
function Snapshot({ nilai }: { nilai: unknown }) {
  if (nilai === null || nilai === undefined) return <span>—</span>
  return (
    <code className="block max-w-xs overflow-x-auto whitespace-pre-wrap break-words text-xs text-neutral-600">
      {JSON.stringify(nilai)}
    </code>
  )
}

function AuditLog() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/audit-log' })

  const [entitas, setEntitas] = useState(search.entitas ?? SEMUA)
  const [aksi, setAksi] = useState(search.aksi ?? SEMUA)
  const [cari, setCari] = useState(search.q ?? '')
  const [dari, setDari] = useState(search.dari ?? '')
  const [sampai, setSampai] = useState(search.sampai ?? '')

  const ukuranHalaman = ukuranValid(search.take)
  const halaman = Math.floor((search.skip ?? 0) / ukuranHalaman)
  const totalHalaman = Math.max(1, Math.ceil(data.total / ukuranHalaman))

  return (
    <DashboardLayout
      peran="OWNER"
      judul={m.audit_title()}
      aksi={
        <span className="text-sm text-muted-foreground">
          {m.audit_total()}: {data.total}
        </span>
      }
    >
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void navigate({
            search: {
              entitas: entitas === SEMUA ? undefined : entitas,
              aksi: aksi === SEMUA ? undefined : aksi,
              q: cari.trim() || undefined,
              dari: dari || undefined,
              sampai: sampai || undefined,
              skip: 0,
            },
          })
        }}
      >
        <div className="space-y-1">
          <Label>{m.audit_entitas()}</Label>
          <Select value={entitas} onValueChange={setEntitas}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>{m.audit_semua()}</SelectItem>
              {ENTITAS_AUDIT.map((e) => (
                <SelectItem key={e} value={e}>
                  {e}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{m.audit_aksi()}</Label>
          <Select value={aksi} onValueChange={setAksi}>
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>{m.audit_semua()}</SelectItem>
              {AKSI_AUDIT.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{m.audit_dari()}</Label>
          <Input
            type="date"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.audit_sampai()}</Label>
          <Input
            type="date"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.tabel_cari()}</Label>
          <Input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={m.tabel_cari()}
          />
        </div>
        <Button type="submit">{m.audit_tampilkan()}</Button>
      </form>

      <div className="-mx-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.audit_waktu()}</TableHead>
              <TableHead>{m.audit_aktor()}</TableHead>
              <TableHead>{m.audit_aksi()}</TableHead>
              <TableHead>{m.audit_entitas()}</TableHead>
              <TableHead>{m.audit_sebelum()}</TableHead>
              <TableHead>{m.audit_sesudah()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-4 text-center text-neutral-500"
                >
                  {m.audit_kosong()}
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {new Date(r.waktu).toLocaleString('id-ID')}
                  </TableCell>
                  <TableCell>{r.aktorNama ?? r.aktorId ?? '—'}</TableCell>
                  <TableCell>
                    <code className="text-xs">{r.aksi}</code>
                  </TableCell>
                  <TableCell>
                    {r.entitas}
                    {r.entitasId && (
                      <p className="text-xs text-neutral-500">
                        {r.entitasId.slice(0, 8)}…
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Snapshot nilai={r.sebelum} />
                  </TableCell>
                  <TableCell>
                    <Snapshot nilai={r.sesudah} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaginasiTabel
        halamanAktif={halaman}
        jumlahHalaman={totalHalaman}
        jumlahBaris={data.total}
        ukuranHalaman={ukuranHalaman}
        onHalaman={(halamanBaru) => {
          void navigate({
            search: { ...search, skip: halamanBaru * ukuranHalaman },
          })
        }}
        onUkuranHalaman={(ukuranBaru) => {
          void navigate({ search: { ...search, take: ukuranBaru, skip: 0 } })
        }}
      />
    </DashboardLayout>
  )
}
