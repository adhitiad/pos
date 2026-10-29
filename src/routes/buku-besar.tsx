import { useState } from 'react'
import {
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { laporanFn } from '#/server/kasirFn'
import { BukuBesarSearchSchema } from '#/validations/kasir'

import DashboardLayout from '#/components/DashboardLayout'
import DialogPengeluaran from '#/components/pengeluaran/DialogPengeluaran'
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
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '#/components/ui/accordion'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/hooks/table-controls'

const isoHari = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const defaultSampai = () => isoHari(new Date())
const defaultDari = () => isoHari(new Date(Date.now() - 29 * 24 * 3600 * 1000))

export const Route = createFileRoute('/buku-besar')({
  validateSearch: (search) => BukuBesarSearchSchema.parse(search),
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) =>
    laporanFn({
      data: {
        dari: deps.dari ?? defaultDari(),
        sampai: deps.sampai ?? defaultSampai(),
        akunId: deps.akunId || undefined,
      },
    }),
  component: BukuBesar,
})

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

// Saldo normal debit: ASET & BEBAN. Sisanya normal kredit.
const saldoAkun = (tipe: string, debit: number, kredit: number) =>
  tipe === 'ASET' || tipe === 'BEBAN' ? debit - kredit : kredit - debit

type EntriAkun = {
  id: string
  tanggal: string
  jurnalNomor: string
  keterangan: string | null
  debit: number
  kredit: number
  saldo: number
}

function TabelEntriAkun({ entri }: { entri: EntriAkun[] }) {
  const kontrol = useKontrolTabel(
    entri,
    (e) => `${e.tanggal} ${e.jurnalNomor} ${e.keterangan ?? ''}`,
    {
      tanggal: (e) => e.tanggal,
      keterangan: (e) => e.keterangan ?? e.jurnalNomor,
      debit: (e) => e.debit,
      kredit: (e) => e.kredit,
      saldo: (e) => e.saldo,
    },
  )
  return (
    <>
      <PencarianTabel
        value={kontrol.cari}
        onChange={kontrol.setCari}
        className="mb-3"
      />
      <div className="-mx-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                ['tanggal', m.ledger_date()],
                ['keterangan', m.ledger_desc()],
                ['debit', m.ledger_debit()],
                ['kredit', m.ledger_credit()],
                ['saldo', m.ledger_balance()],
              ].map(([key, label]) => (
                <HeaderUrutTabel
                  key={key}
                  kunci={key}
                  aktif={kontrol.kunciUrut === key}
                  arah={kontrol.arahUrut}
                  onUrut={kontrol.toggleUrut}
                  className={
                    key === 'debit' || key === 'kredit' || key === 'saldo'
                      ? 'text-right'
                      : undefined
                  }
                >
                  {label}
                </HeaderUrutTabel>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {kontrol.baris.map((e) => (
              <TableRow key={e.id}>
                <TableCell>{e.tanggal.slice(0, 10)}</TableCell>
                <TableCell>{e.keterangan ?? e.jurnalNomor}</TableCell>
                <TableCell className="text-right">
                  {e.debit ? rupiah(e.debit) : '—'}
                </TableCell>
                <TableCell className="text-right">
                  {e.kredit ? rupiah(e.kredit) : '—'}
                </TableCell>
                <TableCell className="text-right">{rupiah(e.saldo)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <PaginasiTabel
        halamanAktif={kontrol.halamanAktif}
        jumlahHalaman={kontrol.jumlahHalaman}
        jumlahBaris={kontrol.jumlahBaris}
        ukuranHalaman={kontrol.ukuranHalaman}
        onHalaman={kontrol.setHalaman}
        onUkuranHalaman={kontrol.setUkuranHalaman}
      />
    </>
  )
}

function BukuBesar() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate({ from: '/buku-besar' })

  const [dari, setDari] = useState(search.dari ?? defaultDari())
  const [sampai, setSampai] = useState(search.sampai ?? defaultSampai())
  const [akunId, setAkunId] = useState(search.akunId ?? '')
  const router = useRouter()

  // Input pengeluaran owner lewat dialog (bukan form-inline).
  const [dialogPengeluaran, setDialogPengeluaran] = useState(false)

  const pembuka = new Map(data.pembuka.map((p) => [p.akunId, p]))
  // Saldo berjalan per akun mengikuti urutan entri
  const berjalan = new Map<string, number>()
  const baris = data.entri.map((e) => {
    const p = pembuka.get(e.akunId)
    const awal = saldoAkun(e.tipe, p?.debit ?? 0, p?.kredit ?? 0)
    const jalan =
      (berjalan.get(e.akunId) ?? awal) + saldoAkun(e.tipe, e.debit, e.kredit)
    berjalan.set(e.akunId, jalan)
    return { ...e, saldo: jalan }
  })
  const kontrolTrial = useKontrolTabel(
    data.trial,
    (t) => `${t.kode} ${t.nama}`,
    {
      kode: (t) => t.kode,
      nama: (t) => t.nama,
      debit: (t) => t.debit,
      kredit: (t) => t.kredit,
    },
  )
  const kontrolEntri = useKontrolTabel(
    baris,
    (e) =>
      `${e.tanggal} ${e.jurnalNomor} ${e.keterangan ?? ''} ${e.kode} ${e.nama}`,
    {
      tanggal: (e) => e.tanggal,
      nomor: (e) => e.jurnalNomor,
      keterangan: (e) => e.keterangan ?? '',
      akun: (e) => `${e.kode} ${e.nama}`,
      debit: (e) => e.debit,
      kredit: (e) => e.kredit,
      saldo: (e) => e.saldo,
    },
  )

  const totalDebitTrial = data.trial.reduce((s, t) => s + t.debit, 0)
  const totalKreditTrial = data.trial.reduce((s, t) => s + t.kredit, 0)

  // Kelompok per akun untuk accordion (saldo akhir = saldo baris terakhir)
  const perAkun = data.akun.flatMap((a) => {
    const entri = baris.filter((e) => e.akunId === a.id)
    if (entri.length === 0) return []
    return [
      {
        akunId: a.id,
        kode: a.kode,
        nama: a.nama,
        entri,
        saldoAkhir: entri[entri.length - 1]?.saldo ?? 0,
      },
    ]
  })

  return (
    <DashboardLayout peran="OWNER" judul={m.ledger_title()}>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void navigate({
            search: { dari, sampai, akunId: akunId || undefined },
          })
        }}
      >
        <div className="space-y-1">
          <Label>{m.ledger_from()}</Label>
          <Input
            type="date"
            value={dari}
            onChange={(e) => {
              setDari(e.target.value)
            }}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.ledger_to()}</Label>
          <Input
            type="date"
            value={sampai}
            onChange={(e) => {
              setSampai(e.target.value)
            }}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.ledger_account()}</Label>
          <Select value={akunId} onValueChange={setAkunId}>
            <SelectTrigger className="w-full sm:w-56">
              <SelectValue placeholder={m.ledger_all()} />
            </SelectTrigger>
            <SelectContent>
              {data.akun.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.kode} — {a.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit">{m.ledger_show()}</Button>
          <Button
            type="button"
            variant="outline"
            className="h-11"
            onClick={() => setDialogPengeluaran(true)}
          >
            {m.pengeluaran_tombol_debit()}
          </Button>
        </div>
      </form>

      {/* Neraca saldo */}
      <Card>
        <CardHeader>
          <CardTitle>{m.ledger_trial()}</CardTitle>
        </CardHeader>
        <CardContent>
          <PencarianTabel
            value={kontrolTrial.cari}
            onChange={kontrolTrial.setCari}
            className="mb-3"
          />
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <HeaderUrutTabel
                    kunci="kode"
                    aktif={kontrolTrial.kunciUrut === 'kode'}
                    arah={kontrolTrial.arahUrut}
                    onUrut={kontrolTrial.toggleUrut}
                  >
                    {m.ledger_code()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="nama"
                    aktif={kontrolTrial.kunciUrut === 'nama'}
                    arah={kontrolTrial.arahUrut}
                    onUrut={kontrolTrial.toggleUrut}
                  >
                    {m.ledger_name()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="debit"
                    aktif={kontrolTrial.kunciUrut === 'debit'}
                    arah={kontrolTrial.arahUrut}
                    onUrut={kontrolTrial.toggleUrut}
                    className="text-right"
                  >
                    {m.ledger_debit()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="kredit"
                    aktif={kontrolTrial.kunciUrut === 'kredit'}
                    arah={kontrolTrial.arahUrut}
                    onUrut={kontrolTrial.toggleUrut}
                    className="text-right"
                  >
                    {m.ledger_credit()}
                  </HeaderUrutTabel>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kontrolTrial.baris.map((t) => (
                  <TableRow key={t.akunId}>
                    <TableCell>{t.kode}</TableCell>
                    <TableCell>{t.nama}</TableCell>
                    <TableCell className="text-right">
                      {rupiah(t.debit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {rupiah(t.kredit)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right">
                    {rupiah(totalDebitTrial)}
                  </TableCell>
                  <TableCell className="text-right">
                    {rupiah(totalKreditTrial)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <PaginasiTabel
            halamanAktif={kontrolTrial.halamanAktif}
            jumlahHalaman={kontrolTrial.jumlahHalaman}
            jumlahBaris={kontrolTrial.jumlahBaris}
            ukuranHalaman={kontrolTrial.ukuranHalaman}
            onHalaman={kontrolTrial.setHalaman}
            onUkuranHalaman={kontrolTrial.setUkuranHalaman}
          />
        </CardContent>
      </Card>

      {/* Rincian jurnal */}
      <section className="space-y-2">
        <h2 className="font-semibold">{m.ledger_title()}</h2>
        {kontrolEntri.jumlahBaris === 0 ? (
          <>
            <p className="text-sm text-neutral-500">{m.ledger_empty()}</p>
            <p className="py-1 text-sm text-neutral-400">
              {m.ledger_empty_hint()}
            </p>
          </>
        ) : (
          <>
            <PencarianTabel
              value={kontrolEntri.cari}
              onChange={kontrolEntri.setCari}
            />
            <div className="-mx-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {[
                      ['tanggal', m.ledger_date()],
                      ['nomor', m.ledger_no()],
                      ['keterangan', m.ledger_desc()],
                      ['akun', m.ledger_account()],
                      ['debit', m.ledger_debit()],
                      ['kredit', m.ledger_credit()],
                      ['saldo', m.ledger_balance()],
                    ].map(([key, label]) => (
                      <HeaderUrutTabel
                        key={key}
                        kunci={key}
                        aktif={kontrolEntri.kunciUrut === key}
                        arah={kontrolEntri.arahUrut}
                        onUrut={kontrolEntri.toggleUrut}
                        className={
                          key === 'debit' || key === 'kredit' || key === 'saldo'
                            ? 'text-right'
                            : undefined
                        }
                      >
                        {label}
                      </HeaderUrutTabel>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {kontrolEntri.baris.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.tanggal.slice(0, 10)}</TableCell>
                      <TableCell>{e.jurnalNomor}</TableCell>
                      <TableCell>{e.keterangan ?? '—'}</TableCell>
                      <TableCell>
                        {e.kode} — {e.nama}
                      </TableCell>
                      <TableCell className="text-right">
                        {e.debit ? rupiah(e.debit) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {e.kredit ? rupiah(e.kredit) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {rupiah(e.saldo)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginasiTabel
              halamanAktif={kontrolEntri.halamanAktif}
              jumlahHalaman={kontrolEntri.jumlahHalaman}
              jumlahBaris={kontrolEntri.jumlahBaris}
              ukuranHalaman={kontrolEntri.ukuranHalaman}
              onHalaman={kontrolEntri.setHalaman}
              onUkuranHalaman={kontrolEntri.setUkuranHalaman}
            />
          </>
        )}
      </section>

      {/* Rincian per akun */}
      {perAkun.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">{m.ledger_per_akun()}</h2>
          <Accordion type="single" collapsible>
            {perAkun.map((g) => (
              <AccordionItem key={g.akunId} value={g.akunId}>
                <AccordionTrigger>
                  <span className="flex w-full items-center justify-between gap-2 pr-2 text-sm">
                    <span>
                      {g.kode} — {g.nama}
                    </span>
                    <span className="font-semibold">
                      Rp{rupiah(g.saldoAkhir)}
                    </span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <TabelEntriAkun entri={g.entri} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      <DialogPengeluaran
        terbuka={dialogPengeluaran}
        onTutup={() => setDialogPengeluaran(false)}
        peran="OWNER"
        onSelesai={() => void router.invalidate()}
      />
    </DashboardLayout>
  )
}
