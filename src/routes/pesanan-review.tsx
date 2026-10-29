import { createFileRoute, redirect } from '@tanstack/react-router'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { daftarPesananDrafFn } from '#/server/pesananDrafFn'
import DashboardLayout from '#/components/DashboardLayout'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'

export const Route = createFileRoute('/pesanan-review')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional'))
      throw redirect({ to: user.role === 'OWNER' ? '/dashboard' : '/' })
  },
  loader: async () => {
    const daftar = await daftarPesananDrafFn()
    return { daftar }
  },
  component: PesananReview,
})

function PesananReview() {
  const { daftar } = Route.useLoaderData()
  // Data nyata dari DB — tidak ada item palsu
  return (
    <DashboardLayout peran="KASIR" judul="Review Pesanan Dine-in">
      <div className="mb-4 text-sm text-muted-foreground">
        Tinjau pesanan dine-in sebelum final. Nama, nomor meja, dan item
        ditampilkan dari DB nyata. Tambah/kurangi item kemudian kirim ke kasir.
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {daftar.map((p) => (
          <Card
            key={p.id}
            className="border-amber-200/60 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/30"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="font-serif text-lg">
                  {p.id.slice(0, 8)}…
                </CardTitle>
                <Badge variant="outline" className="text-[11px]">
                  {p.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="rounded-lg bg-white/60 dark:bg-black/20 px-2 py-1.5 text-sm space-y-1">
                <p>
                  <strong>Meja:</strong> {p.mejaNomor ?? '—'}
                </p>
                <p>
                  <strong>Nama:</strong> {p.nama ?? 'Non-member'}
                </p>
                <p>
                  <strong>No HP:</strong> {p.telepon ?? '—'}
                </p>
                {p.memberId && (
                  <p>
                    <strong>Member ID:</strong> {p.memberId}
                  </p>
                )}
              </div>
              <div className="text-muted-foreground text-sm">
                <p>Items: {p.itemCount}</p>
                <p>Subtotal: Rp{p.subtotal.toLocaleString('id-ID')}</p>
              </div>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline">
                  + Tambah
                </Button>
                <Button size="sm" variant="outline">
                  − Kurang
                </Button>
                <Button
                  size="sm"
                  className="bg-[#002037] text-[#e8dccb] hover:bg-[#003a5c]"
                >
                  Final
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  )
}
