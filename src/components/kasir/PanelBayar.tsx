import { useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useStore } from '@tanstack/react-store'

import { cartStore } from '#/lib/kasir-store'
import { hitungTotal } from '#/lib/kasir-total'
import { m } from '#/paraglide/messages'
import { mejaDataFn } from '#/server/mejaFn'
import type { BarisKeranjang, DataKasir, MejaRingkas } from '#/types/kasir'
import { useAntreanOffline } from '#/hooks/useAntreanOffline'
import { useFormKasir } from '#/hooks/useFormKasir'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Separator } from '#/components/ui/separator'
import { Slider } from '#/components/ui/slider'
import { Switch } from '#/components/ui/switch'
import { Textarea } from '#/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'

import AntreanPanel from './AntreanPanel'
import DaftarDraft from './DaftarDraft'
import DiskonField from './DiskonField'
import PembayaranPanel from './PembayaranPanel'
import RingkasanBayar from './RingkasanBayar'
import Struk from './Struk'

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function PanelBayar({
  data,
  bolehBayar,
  peran,
}: {
  data: DataKasir
  bolehBayar: boolean
  peran: 'OWNER' | 'KASIR'
}) {
  const cart = useStore(cartStore)
  const [memberTerpilih, setMemberTerpilih] = useState('')
  const [pakaiMember, setPakaiMember] = useState(false)
  const [cariMember, setCariMember] = useState('')
  const [daftarMeja, setDaftarMeja] = useState<MejaRingkas[]>([])

  const petaProduk = new Map(data.produk.map((p) => [p.id, p]))
  // Produk di keranjang bisa sudah tak ada di master (dihapus/dinonaktifkan
  // saat masih ada di keranjang) → lewati, jangan sampai render crash.
  const isiCart: BarisKeranjang[] = Object.entries(cart)
    .map(([produkId, item]) => {
      const produk = petaProduk.get(produkId)
      if (!produk || !item) return null
      return { produk, qty: item.qty, modifiers: item.modifiers }
    })
    .filter((b): b is BarisKeranjang => b !== null && b.qty > 0)
  const subtotal = isiCart.reduce((s, b) => s + b.produk.harga * b.qty, 0)

  const offline = useAntreanOffline()
  const pembayaran = useFormKasir({
    data,
    isiCart,
    subtotal,
    simpanAntrean: offline.simpanAntrean,
    saatReset: () => {
      setMemberTerpilih('')
      setPakaiMember(false)
      setCariMember('')
    },
  })
  const { form, struk, setStruk, pending, split, setSplit } = pembayaran

  useEffect(() => {
    let montir = true
    mejaDataFn()
      .then((daftar) => {
        if (montir)
          setDaftarMeja(
            daftar
              .filter((meja) => meja.aktif)
              .map((meja) => ({
                id: meja.id,
                nomor: meja.nomor,
                nama: meja.nama,
              })),
          )
      })
      .catch(() => {
        // meja opsional — kasir tetap bisa checkout tanpa meja
      })
    return () => {
      montir = false
    }
  }, [])

  const nilai = useStore(form.store, (s) => s.values)
  const memberAktif = data.member.find((x) => x.id === nilai.memberId)
  const kurirAktif = data.delivery.find((x) => x.id === nilai.deliveryId)
  const { total } = hitungTotal({
    subtotal,
    diskon: Number(nilai.diskon) || 0,
    pajakPersen: data.pajakPersen,
    tukarPoin: Number(nilai.tukarPoin) || 0,
    memberPoin: memberAktif?.poin ?? 0,
    tarif: kurirAktif?.tarif ?? 0,
  })
  const dibayarSplit = pembayaran.baris.reduce(
    (s, b) => s + (Number(b.jumlah) || 0),
    0,
  )
  const splitCocok = !split || dibayarSplit === total

  return (
    <div className="min-w-0 space-y-3">
      {!bolehBayar && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50/50 p-3 text-sm dark:border-amber-400/30 dark:bg-amber-950/30">
          {m.shift_wajib_buka()}{' '}
          <Link to="/shift" className="font-medium underline">
            {m.shift_buka()}
          </Link>
        </div>
      )}
      {bolehBayar && data.shiftAktif && (
        <p className="text-xs text-neutral-500">
          {m.shift_aktif_label()}: {m.shift_kas_awal()} Rp
          {rupiah(data.shiftAktif.kasAwal)}
        </p>
      )}
      {!offline.daring && (
        <div className="rounded-md border border-amber-500/30 bg-amber-50/50 dark:border-amber-400/30 dark:bg-amber-950/30 p-3 text-sm">
          {m.kasir_offline()}
        </div>
      )}

      <AntreanPanel
        antrean={offline.antrean}
        sinkron={offline.sinkron}
        daring={offline.daring}
        onKirim={() => void offline.kirimAntrean()}
        onHapus={(id) => void offline.hapusAntrean(id)}
      />

      {struk && (
        <Struk
          struk={struk}
          onBaru={() => {
            setStruk(null)
          }}
        />
      )}

      <DaftarDraft items={isiCart} />

      <Separator />

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void form.handleSubmit()
        }}
      >
        <div className="space-y-3 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="pakai-member" className="cursor-pointer">
                {m.kasir_pakai_member()}
              </Label>
              <p className="text-xs text-neutral-500">
                {pakaiMember ? m.kasir_member() : m.kasir_non_member()}
              </p>
            </div>
            <Switch
              id="pakai-member"
              checked={pakaiMember}
              onCheckedChange={(v) => {
                setPakaiMember(v)
                if (!v) {
                  form.setFieldValue('memberId', '')
                  form.setFieldValue('tukarPoin', 0)
                  setMemberTerpilih('')
                  setCariMember('')
                }
              }}
            />
          </div>

          {pakaiMember && (
            <form.Field name="memberId">
              {(field) => {
                const q = cariMember.trim().toLowerCase()
                const daftar = data.member.filter(
                  (mm) =>
                    !q ||
                    mm.nama.toLowerCase().includes(q) ||
                    (mm.telepon ?? '').toLowerCase().includes(q),
                )
                return (
                  <div className="space-y-2">
                    <Input
                      placeholder={m.member_cari()}
                      value={cariMember}
                      onChange={(e) => {
                        setCariMember(e.target.value)
                      }}
                    />
                    <Select
                      value={field.state.value}
                      onValueChange={(v) => {
                        field.handleChange(v)
                        setMemberTerpilih(v)
                        form.setFieldValue('tukarPoin', 0)
                      }}
                    >
                      <SelectTrigger aria-label={m.kasir_pilih_member()}>
                        <SelectValue placeholder={m.kasir_pilih_member()} />
                      </SelectTrigger>
                      <SelectContent>
                        {daftar.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-neutral-500">
                            {m.member_kosong()}
                          </div>
                        ) : (
                          daftar.map((mm) => (
                            <SelectItem key={mm.id} value={mm.id}>
                              {mm.nama} ({mm.poin} pts)
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {memberAktif && (
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-muted/50 px-2 py-1.5 text-xs">
                        <span className="font-medium">{memberAktif.nama}</span>
                        <span className="text-neutral-500">
                          {m.member_tier()}: {memberAktif.tier}
                        </span>
                        <span className="text-neutral-500">
                          {m.member_poin()}: {memberAktif.poin}
                        </span>
                        {memberAktif.diskonPersen != null &&
                          memberAktif.diskonPersen > 0 && (
                            <span className="text-neutral-500">
                              {m.member_diskon_persen()}:{' '}
                              {memberAktif.diskonPersen}%
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                )
              }}
            </form.Field>
          )}
        </div>

        <form.Field name="deliveryId">
          {(field) => (
            <div className="space-y-1">
              <Label>{m.kasir_delivery()}</Label>
              <Select
                value={field.state.value}
                onValueChange={field.handleChange}
              >
                <SelectTrigger aria-label={m.kasir_delivery()}>
                  <SelectValue placeholder={m.kasir_no_delivery()} />
                </SelectTrigger>
                <SelectContent>
                  {data.delivery.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.nama} — Rp{rupiah(d.tarif)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </form.Field>

        <div className="grid grid-cols-2 gap-2">
          <form.Field name="diskon">
            {(field) => (
              <DiskonField
                nilai={field.state.value}
                onChange={field.handleChange}
                subtotal={subtotal}
                persen={data.diskonKasirMaksPersen}
                peran={peran}
              />
            )}
          </form.Field>
          <form.Field name="tukarPoin">
            {(field) => {
              const member = data.member.find((x) => x.id === memberTerpilih)
              const maks = member?.poin ?? 0
              return (
                <div className="space-y-2">
                  <Label>
                    {m.kasir_tukar()} ({field.state.value}/{maks})
                  </Label>
                  <Slider
                    aria-label={m.kasir_tukar()}
                    value={[field.state.value]}
                    max={Math.max(maks, 1)}
                    step={1}
                    disabled={!member}
                    onValueChange={([v]) => {
                      field.handleChange(v)
                    }}
                  />
                </div>
              )
            }}
          </form.Field>
        </div>

        {daftarMeja.length > 0 && (
          <form.Field name="mejaId">
            {(field) => (
              <div className="space-y-1">
                <Label>{m.kasir_meja()}</Label>
                <Select
                  value={field.state.value}
                  onValueChange={field.handleChange}
                >
                  <SelectTrigger aria-label={m.kasir_meja()}>
                    <SelectValue placeholder={m.kasir_pilih_meja()} />
                  </SelectTrigger>
                  <SelectContent>
                    {daftarMeja.map((meja) => (
                      <SelectItem key={meja.id} value={meja.id}>
                        {meja.nomor}
                        {meja.nama ? ` - ${meja.nama}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
        )}

        <PembayaranPanel
          total={total}
          split={split}
          onSplitChange={setSplit}
          metode={nilai.metodeBayar}
          onMetodeChange={(md) => {
            form.setFieldValue('metodeBayar', md)
          }}
          uangDiterima={pembayaran.uangDiterima}
          onUangDiterimaChange={pembayaran.setUangDiterima}
          baris={pembayaran.baris}
          onBarisChange={pembayaran.setBaris}
        />

        <form.Field name="catatan">
          {(field) => (
            <div className="space-y-1">
              <Label htmlFor="kasir-catatan">{m.kasir_note()}</Label>
              <Textarea
                id="kasir-catatan"
                rows={2}
                value={field.state.value}
                onChange={(e) => {
                  field.handleChange(e.target.value)
                }}
              />
            </div>
          )}
        </form.Field>

        <RingkasanBayar
          nilai={nilai}
          subtotal={subtotal}
          memberPoin={memberAktif?.poin ?? 0}
          tarif={kurirAktif?.tarif ?? 0}
          pajakPersen={data.pajakPersen}
          pajakJenis={data.pajakJenis}
        />

        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={pending || isiCart.length === 0 || !splitCocok}
        >
          {m.kasir_pay()} · Rp{rupiah(total)}
        </Button>
      </form>
    </div>
  )
}
