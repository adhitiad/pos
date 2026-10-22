import { useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  createPrinterFn,
  daftarPrinterFn,
  hapusPrinterFn,
  updatePrinterFn,
} from '#/server/percetakanFn'
import type { NilaiFormPrinter, PrinterRow } from '#/types/percetakan'

import DashboardLayout from '#/components/DashboardLayout'
import HapusDialog from '#/components/HapusDialog'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import FormPrinter from '#/components/printer/FormPrinter'
import PrinterQuickScan from '#/components/printer/PrinterQuickScan'
import { DialogTestPrint } from '#/components/printer/TestPrintStruk'
import TabelPrinter from '#/components/printer/TabelPrinter'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'

export const Route = createFileRoute('/printer')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => daftarPrinterFn(),
  component: Printer,
})

const formKosong: NilaiFormPrinter = {
  nama: '',
  tipe: 'ESC_POS',
  lokasi: '',
  perangkat: '',
  koneksi: 'USB',
  default: false,
  aktif: true,
}

const awalDari = (p: PrinterRow): NilaiFormPrinter => ({
  nama: p.nama,
  tipe: p.tipe,
  lokasi: p.lokasi ?? '',
  perangkat: p.perangkat ?? '',
  koneksi: p.koneksi,
  default: p.default,
  aktif: p.aktif,
})

function Printer() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [cari, setCari] = useState('')
  const [panel, setPanel] = useState<null | { id: string | null }>(null)
  const [hapusId, setHapusId] = useState<string | null>(null)

  const baris = useMemo(() => {
    const q = cari.trim().toLowerCase()
    if (!q) return data
    return data.filter(
      (p) =>
        p.nama.toLowerCase().includes(q) ||
        (p.lokasi ?? '').toLowerCase().includes(q) ||
        (p.perangkat ?? '').toLowerCase().includes(q),
    )
  }, [data, cari])

  const muatUlang = async () => {
    await router.invalidate()
  }

  const gagal = (e: unknown) => {
    toast.error(e instanceof Error ? e.message : 'Operasi gagal')
  }

  const simpan = async (nilai: NilaiFormPrinter) => {
    try {
      const payload = {
        nama: nilai.nama,
        tipe: nilai.tipe as 'ESC_POS' | 'RAW',
        lokasi: nilai.lokasi || undefined,
        perangkat: nilai.perangkat || undefined,
        koneksi: nilai.koneksi as 'USB' | 'BLUETOOTH' | 'WIFI' | 'SERIAL',
        default: nilai.default,
        aktif: nilai.aktif,
      }
      if (panel?.id)
        await updatePrinterFn({ data: { ...payload, id: panel.id } })
      else await createPrinterFn({ data: payload })
      setPanel(null)
      toast.success(m.toast_simpan())
      await muatUlang()
    } catch (e) {
      gagal(e)
    }
  }

  const printerEdit = panel?.id
    ? (data.find((x) => x.id === panel.id) ?? null)
    : null

  return (
    <DashboardLayout
      peran="OWNER"
      judul={m.printer_title()}
      aksi={
        <Button
          className="h-11"
          onClick={() => {
            setPanel({ id: null })
          }}
        >
          {m.printer_tambah()}
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>{m.printer_scan_title()}</CardTitle>
          <CardDescription>{m.printer_scan_desc()}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <PrinterQuickScan />
          <DialogTestPrint />
          <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
            {m.printer_scan_server_note()}
          </p>
        </CardContent>
      </Card>

      <Input
        placeholder={m.printer_cari()}
        value={cari}
        onChange={(e) => {
          setCari(e.target.value)
        }}
        className="max-w-sm"
      />

      {panel && (
        <FormPrinter
          key={panel.id ?? 'baru'}
          awal={printerEdit ? awalDari(printerEdit) : formKosong}
          judul={panel.id ? m.printer_edit() : m.printer_tambah()}
          onSubmit={simpan}
          onBatal={() => {
            setPanel(null)
          }}
        />
      )}

      <HapusDialog
        terbuka={hapusId !== null}
        judul={m.hapus_judul()}
        deskripsi={`${m.hapus_deskripsi()} (${data.find((x) => x.id === hapusId)?.nama ?? ''})`}
        batal={m.printer_batal()}
        ya={m.printer_hapus()}
        onBatal={() => {
          setHapusId(null)
        }}
        onYa={() => {
          const id = hapusId
          if (!id) return
          hapusPrinterFn({ data: { id } })
            .then(() => {
              setHapusId(null)
              toast.success(m.toast_hapus())
              return muatUlang()
            })
            .catch(gagal)
        }}
      />

      <TabelPrinter
        baris={baris}
        onEdit={(p) => {
          setPanel({ id: p.id })
        }}
        onHapus={setHapusId}
      />
    </DashboardLayout>
  )
}
