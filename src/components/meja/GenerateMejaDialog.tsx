'use client'

import { useState } from 'react'

import { m } from '#/paraglide/messages'
import { buatBanyakMejaFn } from '#/server/mejaFn'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'
import { QrCode, Table, Printer, X, Plus, LayoutGrid } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '#/components/ui/dialog'
import { Separator } from '#/components/ui/separator'
import { toast } from 'sonner'

type GenerateMejaInput = {
  dari: string
  sampai: string
  aktif: boolean
  cetakA4: boolean
}

export function GenerateMejaDialog({
  terbuka,
  onTutup,
  onSelesai,
}: {
  terbuka: boolean
  onTutup: () => void
  onSelesai: () => void
}) {
  const [form, setForm] = useState<GenerateMejaInput>({
    dari: '1',
    sampai: '10',
    aktif: true,
    cetakA4: false,
  })
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<{ nomor: string }[] | null>(null)

  const generate = async () => {
    const dari = Number(form.dari)
    const sampai = Number(form.sampai)
    if (!dari || !sampai || sampai < dari) {
      toast.error(m.meja_generate_error())
      return
    }
    if (sampai - dari + 1 > 200) {
      toast.error('Maksimal 200 meja per generate')
      return
    }

    setLoading(true)
    try {
      const hasil = await buatBanyakMejaFn({
        data: { dari, sampai, aktif: form.aktif },
      })
      setPreview(
        Array.from({ length: Math.min(hasil.dibuat.length, 20) }, (_, i) => ({
          nomor: hasil.dibuat[i].nomor,
        })),
      )
      toast.success(
        m.meja_generate_success({
          jumlah: String(hasil.totalDibuat),
          dilewati: String(hasil.dilewati.length),
        }),
      )
      onSelesai()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.meja_generate_error())
    } finally {
      setLoading(false)
    }
  }

  const cetak = () => {
    window.print()
  }

  const jumlahLembar = Math.ceil((preview?.length ?? 0) / 2)

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          setForm({ dari: '1', sampai: '10', aktif: true, cetakA4: false })
        }
        className="h-10 rounded-lg border-[#002037] bg-[#002037]/5 px-3 text-xs font-medium text-[#002037] hover:bg-[#002037]/10 dark:text-[#e8dccb] dark:bg-[#e8dccb]/10"
      >
        <Plus className="mr-1.5 size-3.5" />
        {m.meja_generate()}
      </Button>

      <Dialog open={terbuka} onOpenChange={onTutup}>
        <DialogContent className="sm:max-w-[640px] p-0 overflow-hidden">
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <DialogTitle className="text-lg font-serif font-semibold text-[#002037] dark:text-[#e8dccb]">
                    {m.meja_generate()}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-muted-foreground mt-1">
                    {m.meja_generate_desc()}
                  </DialogDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 p-1.5 text-neutral-500 hover:text-[#002037] dark:text-neutral-400 dark:hover:text-[#e8dccb]"
                  onClick={onTutup}
                >
                  <X className="size-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-[#fafaf9] dark:bg-[#0a0a0a]">
              <div className="p-6 space-y-6">
                {/* Form kiri */}
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {m.meja_generate_dari()}
                      </Label>
                      <Input
                        value={form.dari}
                        onChange={(e) =>
                          setForm({ ...form, dari: e.target.value })
                        }
                        placeholder="1"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {m.meja_generate_sampai()}
                      </Label>
                      <Input
                        value={form.sampai}
                        onChange={(e) =>
                          setForm({ ...form, sampai: e.target.value })
                        }
                        placeholder="10"
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                    <Switch
                      checked={form.aktif}
                      onCheckedChange={(aktif) => setForm({ ...form, aktif })}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {m.meja_generate_aktif()}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {m.meja_generate_hint_aktif()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
                    <Switch
                      checked={form.cetakA4}
                      onCheckedChange={(cetakA4) =>
                        setForm({ ...form, cetakA4 })
                      }
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        {m.meja_generate_cetak_a4()}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        {m.meja_generate_hint_cetak()}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={generate}
                    disabled={loading}
                    className="w-full h-11 rounded-lg bg-[#002037] px-4 py-3 text-center text-sm font-semibold text-[#e8dccb] shadow-sm hover:bg-[#003a5c] focus:outline-none focus:ring-2 focus:ring-[#002037]/40 disabled:opacity-50 dark:bg-[#e8dccb] dark:text-[#002037] dark:hover:bg-[#e8dccb]/90"
                  >
                    {loading
                      ? m.meja_generate_btn_proses()
                      : m.meja_generate_submit()}
                  </Button>
                </div>
              </div>
            </div>

            {preview && preview.length > 0 && (
              <Separator className="mx-6 my-0" />
            )}

            {/* Preview & Print kanan */}
            {preview && preview.length > 0 && (
              <div className="p-6 bg-[#fafaf9] dark:bg-[#0a0a0a] border-t border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Printer className="size-4 text-neutral-500" />
                    <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                      {m.meja_print_title()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={cetak}
                    className="h-9 px-3 text-xs font-medium border-[#002037] text-[#002037] dark:border-[#e8dccb] dark:text-[#e8dccb] hover:bg-[#002037]/10 dark:hover:bg-[#e8dccb]/10"
                  >
                    <LayoutGrid className="mr-1.5 size-3.5" />
                    {m.meja_print_cetak()}
                  </Button>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
                  {m.meja_print_a4_desc()}
                </p>

                {/* A4 Print preview sheets */}
                <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:gap-4 justify-center max-w-md mx-auto">
                  {Array.from({ length: jumlahLembar }).map((_, lembarIdx) => {
                    const mulai = lembarIdx * 2
                    const mejaDua = preview.slice(mulai, mulai + 2)
                    return (
                      <div
                        key={lembarIdx}
                        className="print:a4 print:break-inside-avoid relative rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 shadow-sm p-4 print:shadow-none print:border-none print:rounded-none print:bg-transparent"
                        style={{
                          width: '210mm',
                          minHeight: '297mm',
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* A4 sheet header */}
                        <div className="flex items-center justify-between mb-6 print:mb-2">
                          <div className="flex items-center gap-2">
                            <Table className="size-5 text-[#002037] dark:text-[#e8dccb]" />
                            <span className="text-xs font-semibold text-[#002037] dark:text-[#e8dccb] uppercase tracking-wider">
                              {m.meja_generate_label_meja()}
                            </span>
                          </div>
                          <span className="text-[10px] text-neutral-400 print:text-neutral-300">
                            {m.meja_generate_lembar({
                              nomor: String(lembarIdx + 1),
                            })}
                          </span>
                        </div>

                        {/* 2 labels side by side */}
                        <div className="flex flex-col sm:flex-row gap-4 print:flex-row print:gap-2">
                          {mejaDua.map((meja) => (
                            <div
                              key={meja.nomor}
                              className="flex-1 min-w-0 p-4 print:p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg print:rounded-none print:border-none bg-[#fafaf9]/50 print:bg-transparent flex flex-col"
                            >
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-tighter">
                                    {m.meja_print_meja()}
                                  </span>
                                  <QrCode className="size-6 print:size-8" />
                                </div>
                                <div className="text-4xl font-serif font-bold text-[#002037] dark:text-[#e8dccb] leading-none mb-2 print:text-3xl">
                                  {meja.nomor}
                                </div>
                                <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-3 print:my-2"></div>
                                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 text-center leading-snug print:text-[9px]">
                                  {m.meja_generate_desc_label()}
                                </p>
                              </div>
                            </div>
                          ))}
                          {mejaDua.length === 1 && (
                            <div className="flex-1 min-w-0 p-4 print:p-2 border border-neutral-200 dark:border-neutral-700 rounded-lg print:rounded-none print:border-none bg-[#fafaf9]/50 print:bg-transparent flex flex-col justify-center">
                              <div className="flex-1 text-center opacity-30">
                                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 uppercase tracking-tighter mb-2">
                                  {m.meja_generate_kosong()}
                                </div>
                                <Table className="mx-auto size-8 opacity-50" />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Cut line */}
                        <div className="mt-4 print:mt-2">
                          <div className="flex justify-center">
                            <div className="w-full h-[1px] bg-neutral-300 dark:bg-neutral-600 print:h-[0.5px]"></div>
                          </div>
                          <p className="text-[9px] text-neutral-400 dark:text-neutral-500 text-center mt-1.5 print:mt-0.5">
                            {m.meja_generate_potong()}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-6 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 print:hidden">
                  <span>
                    {preview.length} meja siap dicetak • {jumlahLembar} lembar
                    A4
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={cetak}
                    className="h-8 px-2"
                  >
                    <Printer className="mr-1 size-3.5" />
                    {m.meja_print_cetak()}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
