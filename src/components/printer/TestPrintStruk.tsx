import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Printer, SkipForward } from 'lucide-react'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { useIdentitasApp } from '#/lib/identitas'
import { cetakEscpos, dukunganSerial } from '#/lib/printer'
import { printerTerpilih } from '#/lib/printer-scan'
import { barisStrukUji, strukUji } from '#/lib/struk-uji'
import {
  UKURAN_KERTAS_DEFAULT,
  labelUkuranKertas,
  lebarKolomEscPos,
  ukuranKertasDari,
} from '#/lib/ukuran-kertas'
import { pengaturanDataFn } from '#/server/pengaturanFn'
import type { IdUkuranKertasTermal } from '#/lib/ukuran-kertas'

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

const escapeHtml = (teks: string): string =>
  teks
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

function cetakManual(
  baris: string[],
  namaToko: string,
  lebarMm: number,
  tinggiMm: number,
): void {
  const jendela = window.open('', '_blank', 'width=420,height=680')
  if (!jendela) throw new Error(m.printer_test_popup())
  const judul = escapeHtml(`Test print — ${namaToko || 'POS'}`)
  jendela.document.write(`<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${judul}</title>
  <style>
    @page { size: ${lebarMm}mm ${tinggiMm}mm; margin: 4mm; }
    body { margin: 0; padding: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; line-height: 1.35; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; }
  </style>
</head>
<body>
  <pre>${escapeHtml(baris.join('\n'))}</pre>
</body>
</html>`)
  jendela.document.close()
  jendela.focus()
  jendela.setTimeout(() => jendela.print(), 250)
}

export function TestPrintStruk({
  onLewati,
  onSelesai,
  onKembali,
}: {
  onLewati: () => void
  onSelesai?: () => void
  onKembali?: () => void
}) {
  const identitas = useIdentitasApp()
  const payload = useMemo(() => strukUji(), [])
  const [ukuranKertas, setUkuranKertas] = useState<IdUkuranKertasTermal>(
    UKURAN_KERTAS_DEFAULT,
  )
  const ukuran = ukuranKertasDari(ukuranKertas)
  const kolom = lebarKolomEscPos(ukuran)
  const baris = useMemo(
    () => barisStrukUji(payload, identitas.judul, kolom),
    [payload, identitas.judul, kolom],
  )
  const [sibuk, setSibuk] = useState(false)
  const [adaSerial] = useState(() => dukunganSerial())
  const [printer] = useState(() => printerTerpilih())

  useEffect(() => {
    let aktif = true
    pengaturanDataFn()
      .then((p) => {
        if (aktif) setUkuranKertas(p.ukuranKertasTermal as IdUkuranKertasTermal)
      })
      .catch(() => {
        // Pengaturan printer opsional; test print tetap memakai default.
      })
    return () => {
      aktif = false
    }
  }, [])

  const selesai = () => {
    if (onSelesai) onSelesai()
    else onLewati()
  }

  const cetakOtomatis = async () => {
    if (!printer) {
      toast.error(m.printer_test_printer_kosong())
      return
    }
    setSibuk(true)
    try {
      await cetakEscpos(baris, undefined, kolom)
      toast.success(m.printer_test_berhasil())
      selesai()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.printer_test_gagal())
    } finally {
      setSibuk(false)
    }
  }

  const cetakLewatBrowser = () => {
    try {
      cetakManual(baris, identitas.judul, ukuran.lebarMm, ukuran.tinggiMm)
      toast.success(m.printer_test_manual_berhasil())
      selesai()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.printer_test_gagal())
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary">{m.printer_test_dummy()}</Badge>
        <Badge variant="outline">{labelUkuranKertas(ukuran)}</Badge>
        {printer ? (
          <span className="text-muted-foreground">
            {m.printer_test_printer_aktif({ nama: printer.nama })}
          </span>
        ) : (
          <span className="text-amber-700 dark:text-amber-400">
            {m.printer_test_printer_kosong()}
          </span>
        )}
      </div>

      <pre className="max-h-[42svh] overflow-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-snug whitespace-pre">
        {baris.join('\n')}
      </pre>

      <p className="text-xs leading-relaxed text-muted-foreground">
        {m.printer_test_info_otomatis()}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {m.printer_test_info_manual()}
      </p>
      {!adaSerial && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-50/50 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-950/30">
          {m.printer_test_tidak_support()}
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="h-11 sm:flex-1"
          onClick={() => void cetakOtomatis()}
          disabled={sibuk || !adaSerial || !printer}
        >
          <Printer className="size-4" />
          {sibuk ? m.printer_test_mengirim() : m.printer_test_otomatis()}
        </Button>
        <Button
          variant="outline"
          className="h-11 sm:flex-1"
          onClick={cetakLewatBrowser}
        >
          {m.printer_test_manual()}
        </Button>
      </div>

      <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
        <div className="flex gap-2">
          <Button variant="ghost" className="h-11" onClick={onLewati}>
            <SkipForward className="size-4" />
            {m.printer_test_lewati()}
          </Button>
          {onKembali && (
            <Button variant="ghost" className="h-11" onClick={onKembali}>
              {m.printer_test_kembali()}
            </Button>
          )}
        </div>
      </DialogFooter>
    </div>
  )
}

export function DialogTestPrint({ trigger }: { trigger?: ReactNode }) {
  const [terbuka, setTerbuka] = useState(false)

  return (
    <Dialog open={terbuka} onOpenChange={setTerbuka}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="h-11">
            <Printer className="size-4" />
            {m.printer_test_buka()}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85svh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{m.printer_test_judul()}</DialogTitle>
          <DialogDescription>{m.printer_test_desc()}</DialogDescription>
        </DialogHeader>
        <TestPrintStruk
          onLewati={() => {
            setTerbuka(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
