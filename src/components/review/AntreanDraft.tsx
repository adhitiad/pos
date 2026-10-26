import { Check, X } from 'lucide-react'

import { m } from '#/paraglide/messages'
import type { DraftMenunggu } from '#/types/review'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
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

const waktu = (nilai: string | Date) => new Date(nilai).toLocaleString('id-ID')

type Props = {
  daftar: DraftMenunggu[]
  onPutuskan: (draft: DraftMenunggu, keputusan: 'DISETUJUI' | 'DITOLAK') => void
}

export default function AntreanDraft({ daftar, onPutuskan }: Props) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {m.review_menunggu()} · {daftar.length}
      </h2>
      <div className="-mx-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.review_draft()}</TableHead>
              <TableHead>{m.review_kasir()}</TableHead>
              <TableHead>{m.review_waktu()}</TableHead>
              <TableHead>{m.review_metode()}</TableHead>
              <TableHead className="text-right">{m.review_total()}</TableHead>
              <TableHead className="text-right">{m.review_aksi()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daftar.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-4 text-center text-neutral-500"
                >
                  {m.review_kosong()}
                </TableCell>
              </TableRow>
            ) : (
              daftar.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {d.nomor}
                    {d.dibuatOffline && (
                      <Badge variant="outline" className="ml-2">
                        {m.review_offline()}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{d.kasirNama}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {waktu(d.createdAt)}
                  </TableCell>
                  <TableCell>{d.metodeBayar}</TableCell>
                  <TableCell className="text-right font-semibold">
                    Rp{rupiah(d.total)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        className="h-9"
                        onClick={() => onPutuskan(d, 'DISETUJUI')}
                      >
                        <Check className="size-4" />
                        {m.review_setujui()}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="h-9"
                        onClick={() => onPutuskan(d, 'DITOLAK')}
                      >
                        <X className="size-4" />
                        {m.review_tolak()}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
