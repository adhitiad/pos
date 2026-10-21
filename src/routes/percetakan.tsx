import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  ambilPrintJobFn,
  daftarPrintJobFn,
  gagalPrintJobFn,
  selesaiPrintJobFn,
} from '#/server/percetakanFn'
import type { PrintJobRow } from '#/types/percetakan'

import DashboardLayout from '#/components/DashboardLayout'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import TabelPrintJob, {
  DialogStruk,
} from '#/components/percetakan/TabelPrintJob'

const SEMUA = 'semua'

export const Route = createFileRoute('/percetakan')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'operasional')) throw redirect({ to: '/' })
  },
  loader: async () => daftarPrintJobFn({ data: { take: 50 } }),
  component: Percetakan,
})

function Percetakan() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [status, setStatus] = useState(SEMUA)
  const [lihat, setLihat] = useState<PrintJobRow | null>(null)
  const [gagalJob, setGagalJob] = useState<PrintJobRow | null>(null)
  const [pesan, setPesan] = useState('')

  const muatUlang = async () => {
    await router.invalidate()
  }

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Operasi gagal')
  }

  const daftar = data.filter((job) => status === SEMUA || job.status === status)

  return (
    <DashboardLayout
      peran="OWNER"
      judul={m.percetakan_title()}
      aksi={
        <div className="w-48">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SEMUA}>{m.percetakan_semua()}</SelectItem>
              <SelectItem value="MENUNGGU">
                {m.percetakan_menunggu()}
              </SelectItem>
              <SelectItem value="DIPROSES">
                {m.percetakan_diproses()}
              </SelectItem>
              <SelectItem value="DICETAK">{m.percetakan_dicetak()}</SelectItem>
              <SelectItem value="GAGAL">{m.percetakan_gagal()}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      }
    >
      <DialogStruk
        job={lihat}
        onTutup={() => {
          setLihat(null)
        }}
      />

      <Dialog
        open={gagalJob !== null}
        onOpenChange={(buka) => {
          if (!buka) {
            setGagalJob(null)
            setPesan('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{m.percetakan_gagal_judul()}</DialogTitle>
            <DialogDescription>
              {m.percetakan_gagal_deskripsi()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="percetakan-pesan">{m.percetakan_pesan()}</Label>
            <Input
              id="percetakan-pesan"
              value={pesan}
              onChange={(e) => {
                setPesan(e.target.value)
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setGagalJob(null)
                setPesan('')
              }}
            >
              {m.printer_batal()}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const job = gagalJob
                if (!job) return
                gagalPrintJobFn({
                  data: { id: job.id, pesan: pesan || undefined },
                })
                  .then(() => {
                    setGagalJob(null)
                    setPesan('')
                    toast.success(m.percetakan_gagal_berhasil())
                    return muatUlang()
                  })
                  .catch(gagal)
              }}
            >
              {m.percetakan_tandai_gagal()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TabelPrintJob
        daftar={daftar}
        onLihat={(job) => {
          setLihat(job)
        }}
        onAmbil={(job) => {
          ambilPrintJobFn({ data: { id: job.id } })
            .then(() => {
              toast.success(m.percetakan_diambil())
              return muatUlang()
            })
            .catch(gagal)
        }}
        onSelesai={(job) => {
          selesaiPrintJobFn({ data: { id: job.id } })
            .then(() => {
              toast.success(m.percetakan_selesai_berhasil())
              return muatUlang()
            })
            .catch(gagal)
        }}
        onGagal={(job) => {
          setGagalJob(job)
        }}
      />
    </DashboardLayout>
  )
}
