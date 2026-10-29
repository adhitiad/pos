import { useState } from 'react'

import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Checkbox } from '#/components/ui/checkbox'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import type { CartModifier } from '#/types/kasir-store'
import type { GrupModifier } from '#/types/kasir'

export default function ModifierPicker({
  modifierGrup,
  selected,
  onConfirm,
  onCancel,
}: {
  modifierGrup: GrupModifier[]
  selected: CartModifier[]
  onConfirm: (m: CartModifier[]) => void
  onCancel: () => void
}) {
  const [pilihan, setPilihan] = useState<CartModifier[]>(selected)

  const valid = modifierGrup.every((g) => {
    const dipilih = pilihan.filter((p) =>
      g.modifiers.some((mm) => mm.id === p.modifierId),
    ).length
    return !g.wajib || dipilih >= g.min
  })

  const toggleModifier = (modifierId: string) => {
    const ada = pilihan.find((p) => p.modifierId === modifierId)
    const grup = modifierGrup.find((g) =>
      g.modifiers.some((mm) => mm.id === modifierId),
    )
    if (ada) {
      if (ada.qty <= 1) {
        setPilihan(pilihan.filter((p) => p.modifierId !== modifierId))
      } else {
        setPilihan(
          pilihan.map((p) =>
            p.modifierId === modifierId ? { ...p, qty: ada.qty - 1 } : p,
          ),
        )
      }
      return
    }
    if (grup) {
      const sudah = pilihan.filter((p) =>
        grup.modifiers.some((mm) => mm.id === p.modifierId),
      ).length
      if (sudah >= grup.max) return
    }
    setPilihan([...pilihan, { modifierId, qty: 1, catatan: '' }])
  }

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{m.kasir_pilih_modifier()}</DialogTitle>
          <DialogDescription>{m.kasir_pilih_modifier_desc()}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {modifierGrup.map((g) => (
            <div key={g.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-medium">{g.nama}</Label>
                <span className="text-xs text-neutral-500">
                  {g.wajib ? 'Wajib' : 'Opsional'} · {g.min}-{g.max}
                </span>
              </div>
              <div className="space-y-1">
                {g.modifiers.map((mod) => {
                  const ada = pilihan.find((p) => p.modifierId === mod.id)
                  return (
                    <div
                      key={mod.id}
                      className="flex items-center justify-between gap-2"
                    >
                      <Checkbox
                        checked={ada != null}
                        onCheckedChange={() => {
                          toggleModifier(mod.id)
                        }}
                      />
                      <div className="flex-1">
                        <span className="text-sm">{mod.nama}</span>
                        {mod.hargaTambahan > 0 && (
                          <span className="text-xs text-neutral-500 ml-1">
                            + Rp{' '}
                            {new Intl.NumberFormat('id-ID', {
                              maximumFractionDigits: 0,
                            }).format(mod.hargaTambahan)}
                          </span>
                        )}
                      </div>
                      {ada != null && (
                        <Input
                          type="number"
                          min={1}
                          value={ada.qty || ''}
                          onChange={(e) => {
                            setPilihan(
                              pilihan.map((p) =>
                                p.modifierId === mod.id
                                  ? {
                                      ...p,
                                      qty: Number(e.target.value) || 1,
                                    }
                                  : p,
                              ),
                            )
                          }}
                          className="w-16 text-right"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          {!valid && (
            <p className="text-xs text-amber-600">{m.kasir_modifier_wajib()}</p>
          )}
        </div>
        <DialogFooter className="mt-5 flex flex-col sm:flex-row gap-2 w-full">
          <Button onClick={onCancel} className="w-full sm:w-auto min-h-[44px]">
            {m.kasir_batal()}
          </Button>
          <Button
            onClick={() => {
              onConfirm(pilihan.filter((p) => p.qty > 0))
            }}
            disabled={!valid}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {m.kasir_tambah_modifier()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
