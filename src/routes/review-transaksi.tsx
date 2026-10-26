import { useEffect, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'

import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { pengaturanDataFn } from '#/server/pengaturanFn'
import { punyaAkses } from '#/server/peran'
import {
  listDraftMenungguFn,
  riwayatReviewTransaksiFn,
  setModeReviewTransaksiFn,
} from '#/server/reviewAntreanFn'
import type { DraftMenunggu } from '#/types/review'

import DashboardLayout from '#/components/DashboardLayout'
import AntreanDraft from '#/components/review/AntreanDraft'
import DialogReview from '#/components/review/DialogReview'
import RiwayatReview from '#/components/review/RiwayatReview'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'

export const Route = createFileRoute('/review-transaksi')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => {
    const [daftar, riwayat, pengaturan] = await Promise.all([
      listDraftMenungguFn(),
      riwayatReviewTransaksiFn(),
      pengaturanDataFn(),
    ])
    return {
      daftar,
      riwayat,
      mode: pengaturan.reviewTransaksiMode,
    }
  },
  component: ReviewTransaksi,
})

type Pilihan = {
  draft: DraftMenunggu
  keputusan: 'DISETUJUI' | 'DITOLAK'
}

function ReviewTransaksi() {
  const { daftar, riwayat, mode } = Route.useLoaderData()
  const router = useRouter()

  const [wajibOwner, setWajibOwner] = useState(mode === 'owner')
  const [pilihan, setPilihan] = useState<Pilihan | null>(null)

  useEffect(() => {
    setWajibOwner(mode === 'owner')
  }, [mode])

  const ubahKebijakan = async (aktif: boolean) => {
    setWajibOwner(aktif)
    try {
      await setModeReviewTransaksiFn({
        data: { mode: aktif ? 'owner' : 'kasir' },
      })
      toast.success(m.review_mode_tersimpan())
      await router.invalidate()
    } catch (e) {
      setWajibOwner(!aktif)
      toast.error(e instanceof Error ? e.message : m.review_gagal())
    }
  }

  return (
    <DashboardLayout peran="OWNER" judul={m.review_title()}>
      <p className="text-sm text-muted-foreground">{m.review_desc()}</p>

      <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
        <div className="space-y-0.5">
          <Label htmlFor="wajib-owner" className="text-sm font-medium">
            {m.review_wajib_owner()}
          </Label>
          <p className="text-xs text-muted-foreground">
            {m.review_wajib_owner_desc()}
          </p>
        </div>
        <Switch
          id="wajib-owner"
          checked={wajibOwner}
          onCheckedChange={(aktif) => void ubahKebijakan(aktif)}
        />
      </div>

      <AntreanDraft
        daftar={daftar}
        onPutuskan={(draft, keputusan) => setPilihan({ draft, keputusan })}
      />

      <RiwayatReview daftar={riwayat} />

      <DialogReview
        terbuka={pilihan !== null}
        draft={pilihan?.draft ?? null}
        keputusan={pilihan?.keputusan ?? 'DISETUJUI'}
        onTutup={() => setPilihan(null)}
        onSelesai={() => void router.invalidate()}
      />
    </DashboardLayout>
  )
}
