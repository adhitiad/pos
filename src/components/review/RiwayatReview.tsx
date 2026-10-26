import { m } from '#/paraglide/messages'
import type { RiwayatReview as RiwayatReviewRow } from '#/types/review'

import { Badge } from '#/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

const waktu = (nilai: string | Date) => new Date(nilai).toLocaleString('id-ID')

type Props = { daftar: RiwayatReviewRow[] }

export default function RiwayatReview({ daftar }: Props) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">
        {m.review_riwayat()}
      </h2>
      <div className="-mx-2 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{m.review_waktu()}</TableHead>
              <TableHead>{m.review_peninjau()}</TableHead>
              <TableHead>{m.review_draft()}</TableHead>
              <TableHead>{m.review_transaksi()}</TableHead>
              <TableHead>{m.review_status()}</TableHead>
              <TableHead>{m.review_catatan()}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {daftar.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-4 text-center text-neutral-500"
                >
                  {m.review_riwayat_kosong()}
                </TableCell>
              </TableRow>
            ) : (
              daftar.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap">
                    {waktu(r.createdAt)}
                  </TableCell>
                  <TableCell>{r.peninjauNama}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.draftNomor ?? '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {r.transaksiNomor ?? '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'DISETUJUI' ? 'default' : 'destructive'
                      }
                    >
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs whitespace-pre-wrap break-words text-sm">
                    {r.catatan ?? '—'}
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
