import { m } from '#/paraglide/messages'
import type { PrintJobRow, StrukPayload } from '#/types/percetakan'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
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

// Pratinjau isi struk (payload) yang dikirim ke client pencetak.
export function DialogStruk({
  job,
  onTutup,
}: {
  job: PrintJobRow | null
  onTutup: () => void
}) {
  const payload = job?.payload as StrukPayload | null
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
          <div className="space-y-2 text-sm">
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
                <span className="whitespace-nowrap">
                  Rp{rupiah(item.subtotal)}
                </span>
              </div>
            ))}
            <div className="flex justify-between">
              <span>{m.laporan_belanja_total()}</span>
              <span>Rp{rupiah(payload.total)}</span>
            </div>
            <div className="flex justify-between text-xs text-neutral-500">
              <span>{m.percetakan_metode_bayar()}</span>
              <span>{payload.metodeBayar}</span>
            </div>
          </div>
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
}: {
  daftar: PrintJobRow[]
  onAmbil: (job: PrintJobRow) => void
  onSelesai: (job: PrintJobRow) => void
  onGagal: (job: PrintJobRow) => void
  onLihat: (job: PrintJobRow) => void
}) {
  return (
    <div className="-mx-2 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{m.percetakan_dibuat()}</TableHead>
            <TableHead>{m.percetakan_printer()}</TableHead>
            <TableHead>{m.percetakan_status()}</TableHead>
            <TableHead className="text-right">
              {m.percetakan_percobaan()}
            </TableHead>
            <TableHead>{m.percetakan_aksi()}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {daftar.map((job) => (
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
      {daftar.length === 0 && (
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
  )
}
