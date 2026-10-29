import { useEffect, useState } from 'react'
import { Bluetooth, Check, Printer, RefreshCw, Usb, Wifi } from 'lucide-react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { simpanPerangkatPrinter } from '#/lib/printer-daftar'
import {
  daftarPrinterPerangkatFn,
  setDefaultPrinterPerangkatFn,
} from '#/server/percetakanFn'
import {
  berlanggananPrinter,
  daftarPrinterSesi,
  dukunganSerial,
  pindaiPrinterOtomatis,
  printerTerpilih,
  setPrinterTerpilih,
  tambahPrinterDenganIzin,
} from '#/lib/printer-scan'
import type { JalurPrinter, PrinterPerangkat } from '#/types/printer'

import { TestPrintStruk } from './TestPrintStruk'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'

function labelJalur(jalur?: JalurPrinter): string {
  switch (jalur) {
    case 'usb':
      return m.printer_scan_port_usb()
    case 'bluetooth':
      return m.printer_scan_port_bluetooth()
    case 'wifi':
      return m.printer_scan_port_wifi()
    default:
      return m.printer_scan_port_serial()
  }
}

// Tombol pindai cepat di header: menghubungkan printer perangkat tanpa
// menyimpan apa pun ke database.
export default function PrinterQuickScan() {
  const [terbuka, setTerbuka] = useState(false)
  const [tahap, setTahap] = useState<'pindai' | 'test'>('pindai')
  const [daftar, setDaftar] = useState<PrinterPerangkat[]>([])
  const [terpilih, setTerpilih] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)
  const [perangkatDb, setPerangkatDb] = useState<Record<string, string>>({})
  const [defaultPerangkat, setDefaultPerangkat] = useState<string | null>(null)
  const didukung = dukunganSerial()

  const muatDefault = async () => {
    const rows = await daftarPrinterPerangkatFn()
    const peta: Record<string, string> = {}
    let defaultId: string | null = null
    for (const row of rows) {
      if (!row.perangkat) continue
      peta[row.perangkat] = row.id
      if (row.defaultPengguna) defaultId = row.perangkat
    }
    setPerangkatDb(peta)
    setDefaultPerangkat(defaultId)
  }

  useEffect(() => {
    setDaftar(daftarPrinterSesi())
    setTerpilih(printerTerpilih()?.id ?? null)
    void muatDefault().catch(() => {
      // daftar default opsional; jangan ganggu halaman
    })
    return berlanggananPrinter((baru) => {
      setDaftar(baru)
      setTerpilih(printerTerpilih()?.id ?? null)
    })
  }, [])

  const pindai = async (lanjutKeTest = false) => {
    setSibuk(true)
    try {
      const hasil = await pindaiPrinterOtomatis()
      await simpanPerangkatPrinter(hasil)
      await muatDefault()
      setTerpilih(printerTerpilih()?.id ?? null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.printer_scan_gagal())
    } finally {
      setSibuk(false)
      if (lanjutKeTest) setTahap('test')
    }
  }

  const hubungkan = async () => {
    setSibuk(true)
    try {
      const entri = await tambahPrinterDenganIzin()
      await simpanPerangkatPrinter([entri])
      await muatDefault()
      setTerpilih(entri.id)
      toast.success(m.printer_scan_berhasil())
      setTahap('test')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.printer_scan_gagal())
    } finally {
      setSibuk(false)
    }
  }

  const jadikanDefault = async (perangkat: string) => {
    const id = perangkatDb[perangkat]
    if (!id) return
    setSibuk(true)
    try {
      await setDefaultPrinterPerangkatFn({ data: { id } })
      setDefaultPerangkat(perangkat)
      toast.success(m.printer_scan_default())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.printer_scan_gagal())
    } finally {
      setSibuk(false)
    }
  }

  const pakai = (id: string) => {
    setPrinterTerpilih(id)
    setTerpilih(id)
  }

  return (
    <Dialog
      open={terbuka}
      onOpenChange={(open) => {
        setTerbuka(open)
        if (open) {
          setTahap('pindai')
          void pindai(true)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="min-h-[44px] h-11 gap-2"
          aria-label={m.printer_scan_dialog()}
          title={m.printer_scan_dialog()}
        >
          <Printer className="size-4" />
          <span className="hidden sm:inline">{m.printer_scan_cari()}</span>
          {daftar.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5">
              {daftar.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[85svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {tahap === 'test' ? m.printer_test_judul() : m.printer_scan_title()}
          </DialogTitle>
          <DialogDescription>
            {tahap === 'test' ? m.printer_test_desc() : m.printer_scan_desc()}
          </DialogDescription>
        </DialogHeader>

        {tahap === 'test' ? (
          <TestPrintStruk
            onLewati={() => {
              setTerbuka(false)
            }}
            onSelesai={() => {
              setTerbuka(false)
            }}
            onKembali={() => {
              setTahap('pindai')
            }}
          />
        ) : !didukung ? (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {m.printer_scan_tidak_support()}
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {m.printer_scan_port()}:
              </span>
              <Badge variant="outline" className="gap-1">
                <Usb className="size-3" />
                {m.printer_scan_port_usb()}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Bluetooth className="size-3" />
                {m.printer_scan_port_bluetooth()}
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Wifi className="size-3" />
                {m.printer_scan_port_wifi()}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">
                {daftar.length > 0
                  ? m.printer_scan_terdeteksi({ jumlah: daftar.length })
                  : m.printer_scan_kosong()}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                onClick={() => void pindai()}
                disabled={sibuk}
              >
                <RefreshCw
                  className={sibuk ? 'size-4 animate-spin' : 'size-4'}
                />
                {sibuk ? m.printer_scan_memindai() : m.printer_scan_ulang()}
              </Button>
            </div>

            {daftar.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                {m.printer_scan_kosong_hint()}
              </p>
            ) : (
              <ul className="space-y-2">
                {daftar.map((printer) => {
                  const aktif = printer.id === terpilih
                  const jalur = printer.jalur ?? 'serial'
                  const Ikon =
                    jalur === 'usb' ? Usb : jalur === 'wifi' ? Wifi : Bluetooth
                  return (
                    <li
                      key={printer.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3"
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-2">
                        <Ikon className="mt-0.5 size-4 shrink-0 text-brand" />
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                            {printer.nama}
                            {defaultPerangkat === printer.id && (
                              <Badge variant="secondary" className="h-5 px-1.5">
                                {m.printer_scan_default()}
                              </Badge>
                            )}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.printer_scan_dari_port()}:{' '}
                            <span className="font-medium text-foreground">
                              {labelJalur(jalur)}
                            </span>
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {m.printer_scan_id()}: {printer.id}
                          </p>
                        </div>
                      </div>
                      {defaultPerangkat !== printer.id &&
                        perangkatDb[printer.id] && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-11"
                            disabled={sibuk}
                            onClick={() => void jadikanDefault(printer.id)}
                          >
                            {m.printer_scan_jadikan_default()}
                          </Button>
                        )}
                      {aktif ? (
                        <Badge variant="secondary" className="gap-1">
                          <Check className="size-3" />
                          {m.printer_scan_aktif()}
                        </Badge>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-11"
                          onClick={() => {
                            pakai(printer.id)
                          }}
                        >
                          {m.printer_scan_pakai()}
                        </Button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}

            <Button
              className="h-11 w-full"
              onClick={() => void hubungkan()}
              disabled={sibuk}
            >
              <Printer className="size-4" />
              {m.printer_scan_tambah()}
            </Button>

            <p className="text-xs leading-relaxed text-muted-foreground">
              {m.printer_scan_tersimpan()}
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {m.printer_scan_port_catatan()}
            </p>
          </div>
        )}

        {tahap === 'pindai' && (
          <DialogFooter>
            <p className="text-xs text-muted-foreground">
              {m.printer_scan_server_note()}
            </p>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
