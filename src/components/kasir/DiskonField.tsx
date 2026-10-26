import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { m } from '#/paraglide/messages'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

// Input diskon manual. KASIR dibatasi di UI (server tetap penentu akhir);
// OWNER melihat pengingat bahwa diskon besar diaudit (SEC-22).
export default function DiskonField({
  nilai,
  onChange,
  subtotal,
  persen,
  peran,
}: {
  nilai: number
  onChange: (nilai: number) => void
  subtotal: number
  persen: number
  peran: 'OWNER' | 'KASIR'
}) {
  // Batas ini hanya untuk tampilan; server menegakkan kebijakan yang sama.
  const maks =
    peran === 'KASIR' ? Math.floor((subtotal * persen) / 100) : undefined
  return (
    <div className="space-y-1">
      <Label htmlFor="kasir-diskon">{m.kasir_discount()}</Label>
      <Input
        id="kasir-diskon"
        type="number"
        min={0}
        max={maks}
        value={nilai}
        onChange={(e) => {
          const n = Number(e.target.value) || 0
          onChange(maks === undefined ? n : Math.min(Math.max(0, n), maks))
        }}
      />
      <p className="text-[11px] leading-tight text-muted-foreground">
        {maks === undefined
          ? m.kasir_diskon_owner_hint({ persen })
          : m.kasir_diskon_maks({ persen, maks: rupiah(maks) })}
      </p>
    </div>
  )
}
