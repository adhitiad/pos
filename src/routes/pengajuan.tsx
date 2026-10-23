import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { Plus } from 'lucide-react'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { daftarPengajuanFn } from '#/server/pengajuanFn'
import { punyaAkses } from '#/server/peran'
import type { PengajuanRingkas } from '#/types/pengajuan'

import DashboardLayout from '#/components/DashboardLayout'
import DaftarPengajuan from '#/components/pengajuan/DaftarPengajuan'
import DialogKeputusan from '#/components/pengajuan/DialogKeputusan'
import DialogPengeluaran from '#/components/pengeluaran/DialogPengeluaran'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/pengajuan')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional')) throw redirect({ to: '/' })
  },
  loader: async () => {
    const [daftar, user] = await Promise.all([
      daftarPengajuanFn(),
      getSessionFn(),
    ])
    return { daftar, peran: user!.role }
  },
  component: Pengajuan,
})

function Pengajuan() {
  const { daftar, peran } = Route.useLoaderData()
  const router = useRouter()

  const [dialogPengeluaran, setDialogPengeluaran] = useState(false)
  const [dipilih, setDipilih] = useState<PengajuanRingkas | null>(null)

  const peranPemilik = peran === 'OWNER'

  return (
    <DashboardLayout
      peran={peran}
      judul={m.pengajuan_judul()}
      aksi={
        <Button className="h-11" onClick={() => setDialogPengeluaran(true)}>
          <Plus className="size-4" />
          {peranPemilik ? m.pengeluaran_simpan() : m.pengajuan_kirim()}
        </Button>
      }
    >
      <p className="text-sm text-muted-foreground">{m.pengajuan_desc()}</p>

      <DaftarPengajuan
        daftar={daftar}
        peran={peranPemilik ? 'OWNER' : 'KASIR'}
        onPutuskan={setDipilih}
      />

      <DialogPengeluaran
        terbuka={dialogPengeluaran}
        onTutup={() => setDialogPengeluaran(false)}
        peran={peranPemilik ? 'OWNER' : 'KASIR'}
        onSelesai={() => void router.invalidate()}
      />

      <DialogKeputusan
        terbuka={dipilih !== null}
        pengajuan={dipilih}
        onTutup={() => setDipilih(null)}
        onSelesai={() => void router.invalidate()}
      />
    </DashboardLayout>
  )
}
