import { useState } from 'react'
import { useForm } from '@tanstack/react-form'

import { m } from '#/paraglide/messages'
import type { NilaiFormBahan } from '#/types/bahan'

import { Button } from '#/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'

// Form tambah/edit bahan. Remount via `key` saat target edit berubah,
// sehingga nilai awal cukup dari prop `awal`.
export default function FormBahan({
  awal,
  judul,
  onSubmit,
  onBatal,
}: {
  awal: NilaiFormBahan
  judul: string
  onSubmit: (nilai: NilaiFormBahan) => Promise<void>
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
                  <Label>{m.bahan_nama()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="satuan">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.bahan_satuan()}</Label>
                  <Input
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="jenis">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.bahan_jenis()}</Label>
                  <Input
                    value={field.state.value}
                    placeholder={m.bahan_jenis_placeholder()}
                    onChange={(e) => {
                      field.handleChange(e.target.value)
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="stok">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.bahan_stok()}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(Number(e.target.value))
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="stokMinimum">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.bahan_minimum()}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(Number(e.target.value))
                    }}
                  />
                </div>
              )}
            </form.Field>
            <form.Field name="hargaSatuan">
              {(field) => (
                <div className="space-y-1">
                  <Label>{m.bahan_harga()}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={field.state.value}
                    onChange={(e) => {
                      field.handleChange(Number(e.target.value))
                    }}
                  />
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
              {m.bahan_simpan()}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onBatal}
              className="w-full sm:w-auto min-h-[44px]"
            >
              {m.bahan_batal()}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
