import { m } from '#/paraglide/messages'
import type { PrintJobRow, StrukPayload } from '#/types/percetakan'
import { normalisasiStrukPayload } from '#/lib/struk'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/components/ui/table-controls'
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

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

const labelStatus = (status: string) => {
  if (status === 'MENUNGGU') return m.percetakan_menunggu()
  if (status === 'DIPROSES') return m.percetakan_diproses()
  if (status === 'DICETAK') return m.percetakan_dicetak()
  return m.percetakan_gagal()
}

function badgeStatus(status: string) {
  if (status === 'DICETAK')
    return <Badge variant="secondary">{labelStatus(status)}</Badge>
  if (status === 'GAGAL')
    return <Badge variant="destructive">{labelStatus(status)}</Badge>
  if (status === 'DIPROSES')
    return <Badge variant="outline">{labelStatus(status)}</Badge>
  return <Badge variant="default">{labelStatus(status)}</Badge>
}

export function IsiStruk({ payload }: { payload: StrukPayload }) {
  return (
    <div className="space-y-2 text-sm">
      {payload.items.length === 0 && (
        <p className="text-sm text-neutral-500">{m.percetakan_item_kosong()}</p>
      )}
      {payload.items.map((item, i) => (
        <div key={i} className="flex justify-between gap-3 border-b pb-1">
          <span>
            {item.nama} × {item.qty}
            {item.modifier.map((mod, j) => (
              <span key={j} className="block text-xs text-neutral-500">
                + {mod.nama} ({mod.qty})
              </span>
            ))}
          </span>
          <span className="whitespace-nowrap">Rp{rupiah(item.subtotal)}</span>
        </div>
      ))}
      <div className="flex justify-between">
        <span>{m.laporan_belanja_total()}</span>
        <span>Rp{rupiah(payload.total)}</span>
      </div>
      <div className="flex justify-between text-xs text-neutral-500">
        <span>{m.percetakan_metode_bayar()}</span>
        <span>{payload.metodeBayar || '—'}</span>
      </div>
    </div>
  )
}

// Pratinjau isi struk (payload) yang dikirim ke client pencetak.
export function DialogStruk({
  job,
  onTutup,
}: {
  job: PrintJobRow | null
  onTutup: () => void
}) {
  const payload = normalisasiStrukPayload(job?.payload)
  return (
    <Dialog
      open={job !== null}
      onOpenChange={(buka) => {
        if (!buka) onTutup()
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {m.percetakan_struk()} {payload?.nomor ?? ''}
          </DialogTitle>
          <DialogDescription>
            {payload?.tanggal
              ? new Date(payload.tanggal).toLocaleString('id-ID')
              : ''}
          </DialogDescription>
        </DialogHeader>
        {payload ? (
          <IsiStruk payload={payload} />
        ) : (
          <p className="text-sm text-neutral-500">
            {m.percetakan_payload_kosong()}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default function TabelPrintJob({
  daftar,
  onAmbil,
  onSelesai,
  onGagal,
  onLihat,
  onCetakUlang,
  peran,
}: {
  daftar: PrintJobRow[]
  peran: string
  onAmbil: (job: PrintJobRow) => void
  onSelesai: (job: PrintJobRow) => void
  onGagal: (job: PrintJobRow) => void
  onLihat: (job: PrintJobRow) => void
  onCetakUlang: (job: PrintJobRow) => void
}) {
  const kontrol = useKontrolTabel(
    daftar,
    (job) =>
      `${job.printerNama ?? ''} ${job.status} ${job.pesanGalat ?? ''} ${job.percobaan}`,
    {
      dibuat: (job) => job.createdAt,
      printer: (job) => job.printerNama ?? '',
      status: (job) => job.status,
      percobaan: (job) => job.percobaan,
    },
  )

  return (
    <div>
      <PencarianTabel
        value={kontrol.cari}
        onChange={kontrol.setCari}
        className="mb-3"
      />
      <div className="-mx-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <HeaderUrutTabel
                kunci="dibuat"
                aktif={kontrol.kunciUrut === 'dibuat'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
              >
                {m.percetakan_dibuat()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="printer"
                aktif={kontrol.kunciUrut === 'printer'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
              >
                {m.percetakan_printer()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="status"
                aktif={kontrol.kunciUrut === 'status'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
              >
                {m.percetakan_status()}
              </HeaderUrutTabel>
              <HeaderUrutTabel
                kunci="percobaan"
                aktif={kontrol.kunciUrut === 'percobaan'}
                arah={kontrol.arahUrut}
                onUrut={kontrol.toggleUrut}
                className="text-right"
              >
                {m.percetakan_percobaan()}
              </HeaderUrutTabel>
              <TableHead>{m.percetakan_aksi()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kontrol.baris.map((job) => (
              <TableRow key={job.id}>
                <TableCell className="whitespace-nowrap">
                  {new Date(job.createdAt).toLocaleString('id-ID')}
                </TableCell>
                <TableCell>{job.printerNama ?? '—'}</TableCell>
                <TableCell>
                  {badgeStatus(job.status)}
                  {job.pesanGalat && (
                    <p className="text-xs text-destructive">{job.pesanGalat}</p>
                  )}
                </TableCell>
                <TableCell className="text-right">{job.percobaan}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      onClick={() => {
                        onLihat(job)
                      }}
                    >
                      {m.percetakan_lihat()}
                    </Button>
                    {job.status === 'MENUNGGU' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onAmbil(job)
                        }}
                      >
                        {m.percetakan_ambil()}
                      </Button>
                    )}
                    {job.status === 'DIPROSES' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onSelesai(job)
                        }}
                      >
                        {m.percetakan_selesai()}
                      </Button>
                    )}
                    {job.transaksiId &&
                      job.tipe === 'STRUK' &&
                      (job.status === 'DICETAK' || job.status === 'GAGAL') &&
                      (peran === 'OWNER' || job.cetakKasir < 3) && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            onCetakUlang(job)
                          }}
                        >
                          {m.percetakan_cetak_ulang()}
                        </Button>
                      )}
                    {job.transaksiId &&
                      job.tipe === 'STRUK' &&
                      peran === 'KASIR' &&
                      job.cetakKasir >= 3 && (
                        <p className="w-full text-xs text-muted-foreground">
                          {m.percetakan_batas_kasir()}
                        </p>
                      )}
                    {job.status !== 'DICETAK' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          onGagal(job)
                        }}
                      >
                        {m.percetakan_tandai_gagal()}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {kontrol.jumlahBaris === 0 && (
          <>
            <p className="py-4 text-sm text-neutral-500">
              {m.percetakan_kosong()}
            </p>
            <p className="py-1 text-sm text-neutral-400">
              {m.percetakan_kosong_hint()}
            </p>
          </>
        )}
      </div>
      <PaginasiTabel
        halamanAktif={kontrol.halamanAktif}
        jumlahHalaman={kontrol.jumlahHalaman}
        jumlahBaris={kontrol.jumlahBaris}
        ukuranHalaman={kontrol.ukuranHalaman}
        onHalaman={kontrol.setHalaman}
        onUkuranHalaman={kontrol.setUkuranHalaman}
      />
    </div>
  )
}
