import { m } from '#/paraglide/messages'
import type { BarisKunjungan } from '#/types/kunjungan'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'

export default function KosongLaporan({ deret }: { deret: BarisKunjungan[] }) {
  return (
    <>
      <p className="text-sm text-neutral-500">{m.laporan_kosong()}</p>
      <p className="text-sm text-neutral-400">{m.laporan_kosong_hint()}</p>
      {deret.length === 0 ? (
        <>
          <p className="text-sm text-neutral-500 mt-4">
            {m.kunjungan_kosong()}
          </p>
          <p className="text-sm text-neutral-400">
            {m.kunjungan_kosong_hint()}
          </p>
        </>
      ) : (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>{m.kunjungan_title()}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="-mx-2 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{m.laporan_periode()}</TableHead>
                    <TableHead className="text-right">
                      {m.kunjungan_jumlah()}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deret.map((r) => (
                    <TableRow key={r.tanggal}>
                      <TableCell>{r.tanggal}</TableCell>
                      <TableCell className="text-right">
                        {r.jumlahKunjungan}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
