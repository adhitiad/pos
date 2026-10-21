import { useState } from 'react'
import { useForm } from '@tanstack/react-form'

import { m } from '#/paraglide/messages'
import type { NilaiFormSupplier } from '#/types/supplier'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Switch } from '#/components/ui/switch'

// Form tambah/edit supplier. Remount via `key` saat target edit berubah,
// sehingga nilai awal cukup dari prop `awal`.
export default function FormSupplier({
  awal,
  judul,
  onSubmit,
  onBatal,
}: {
  awal: NilaiFormSupplier
  judul: string
  onSubmit: (nilai: NilaiFormSupplier) => Promise<void>
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
                  <Label>{m.supplier_nama()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="kontak">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.supplier_kontak()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="alamat">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.supplier_alamat()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="catatan">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.supplier_catatan()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
          </div>
          <form.Field name="aktif">
            {(field) => (
              <div className="flex items-center gap-2">
                <Switch
                  id="supplier-aktif"
                  checked={field.state.value}
                  onCheckedChange={(v) => {
                    field.handleChange(v)
                  }}
                />
                <Label htmlFor="supplier-aktif">{m.supplier_aktif()}</Label>
              </div>
            )}
          </form.Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending} className="h-11">
              {m.supplier_simpan()}
            </Button>
            <Button type="button" variant="outline" onClick={onBatal}>
              {m.supplier_batal()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
