import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'

import type { AntreanItem } from '#/types/outbox'

export default function AntreanPanel({
  antrean,
  sinkron,
  daring,
  onKirim,
  onHapus,
}: {
  antrean: AntreanItem[]
  sinkron: boolean
  daring: boolean
  onKirim: () => void
  onHapus: (id: string) => void
}) {
  if (antrean.length === 0) return null
  return (
    <div className="space-y-2 rounded-md border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {m.kasir_antrean()} ({antrean.length})
        </p>
        <Button
          variant="outline"
          disabled={sinkron || !daring}
          className="min-h-[44px]"
          onClick={onKirim}
        >
          {m.kasir_kirim_ulang()}
        </Button>
      </div>
      {antrean.map((a) => (
        <div
          key={a.id}
          className="flex items-center justify-between gap-2 text-sm"
        >
          <span>
            {a.payload.items.reduce((s, i) => s + i.qty, 0)} item ·{' '}
            {a.dibuat.slice(0, 16).replace('T', ' ')}
            {a.galat && <span className="text-red-600"> — {a.galat}</span>}
          </span>
          <Button
            variant="outline"
            className="min-h-[44px]"
            onClick={() => onHapus(a.id)}
          >
            {m.kasir_hapus_antrean()}
          </Button>
        </div>
      ))}
    </div>
  )
}
