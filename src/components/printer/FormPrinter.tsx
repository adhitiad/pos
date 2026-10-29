import { useState } from 'react'
import { useForm } from '@tanstack/react-form'

import { m } from '#/paraglide/messages'
import type { NilaiFormPrinter } from '#/types/percetakan'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Switch } from '#/components/ui/switch'

// Form tambah/edit printer. Remount via `key` saat target edit berubah,
// sehingga nilai awal cukup dari prop `awal`.
export default function FormPrinter({
  awal,
  judul,
  onSubmit,
  onBatal,
}: {
  awal: NilaiFormPrinter
  judul: string
  onSubmit: (nilai: NilaiFormPrinter) => Promise<void>
  onBatal: () => void
}) {
  const [pending, setPending] = useState(false)
  const form = useForm({
    defaultValues: awal,
    onSubmit: async ({ value }) => {
      setPending(true)
      try {
        await onSubmit(value)
      } finally {
        setPending(false)
      }
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{judul}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <form.Field name="nama">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.printer_nama()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="tipe">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.printer_tipe()}</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => {
                      field.handleChange(v)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ESC_POS">ESC/POS (58mm)</SelectItem>
                      <SelectItem value="RAW">RAW (printer biasa)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
            <form.Field name="lokasi">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.printer_lokasi()}</Label>
                  <Input
                    placeholder={m.printer_lokasi_hint()}
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="perangkat">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.printer_perangkat()}</Label>
                  <Input
                    placeholder={m.printer_perangkat_hint()}
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="koneksi">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.printer_koneksi()}</Label>
                  <Select
                    value={field.state.value}
                    onValueChange={(v) => {
                      field.handleChange(v)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USB">
                        {m.printer_scan_port_usb()}
                      </SelectItem>
                      <SelectItem value="BLUETOOTH">
                        {m.printer_scan_port_bluetooth()}
                      </SelectItem>
                      <SelectItem value="WIFI">
                        {m.printer_scan_port_wifi()}
                      </SelectItem>
                      <SelectItem value="SERIAL">
                        {m.printer_scan_port_serial()}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <form.Field name="default">
              {(field) => (
                <div className="flex items-center gap-2">
                  <Switch
                    id="printer-default"
                    checked={field.state.value}
                    onCheckedChange={(v) => {
                      field.handleChange(v)
                    }}
                  />
                  <Label htmlFor="printer-default">{m.printer_default()}</Label>
                </div>
              )}
            </form.Field>
            <form.Field name="aktif">
              {(field) => (
                <div className="flex items-center gap-2">
                  <Switch
                    id="printer-aktif"
                    checked={field.state.value}
                    onCheckedChange={(v) => {
                      field.handleChange(v)
                    }}
                  />
                  <Label htmlFor="printer-aktif">{m.printer_aktif()}</Label>
                </div>
              )}
            </form.Field>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <Button
              type="submit"
              disabled={pending}
              className="h-11 w-full sm:w-auto min-h-[44px]"
            >
              {m.printer_simpan()}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onBatal}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {m.printer_batal()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
