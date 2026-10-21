import {
  ArrowRight,
  BookOpen,
  Check,
  Languages,
  Package,
  Printer,
  ReceiptText,
  ShoppingCart,
  WifiOff,
} from 'lucide-react'

import { Link } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'

const sinyal = [
  { id: 'offline', label: m.home_signal_offline, icon: WifiOff },
  { id: 'buku', label: m.home_signal_ledger, icon: BookOpen },
  { id: 'pajak', label: m.home_signal_tax, icon: ReceiptText },
  { id: 'bahasa', label: m.home_signal_lang, icon: Languages },
]

const alur = [
  {
    id: 'pesanan',
    judul: m.home_flow_pesanan_judul,
    deskripsi: m.home_flow_pesanan_desc,
    icon: ShoppingCart,
  },
  {
    id: 'stok',
    judul: m.home_flow_stok_judul,
    deskripsi: m.home_flow_stok_desc,
    icon: Package,
  },
  {
    id: 'buku',
    judul: m.home_flow_buku_judul,
    deskripsi: m.home_flow_buku_desc,
    icon: BookOpen,
  },
]

export default function HeroLanding({ peran }: { peran: string | undefined }) {
  const tujuanUtama: '/pesanan' | '/kasir' =
    peran === 'MEMBER' ? '/pesanan' : '/kasir'
  const labelUtama = peran === 'MEMBER' ? m.pesan_judul() : m.home_cta_kasir()

  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-10 pb-12 sm:px-6 sm:pt-14 sm:pb-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16 lg:py-24">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
            {m.home_hero_kicker()}
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-[2.2rem] leading-[1.06] tracking-tight text-balance sm:text-5xl lg:text-6xl">
            {m.home_hero_judul()}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            {m.home_hero_lead()}
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-12 w-full bg-brand px-6 text-base text-brand-foreground hover:bg-brand/90 sm:w-auto"
            >
              <Link to={tujuanUtama}>
                {labelUtama}
                <ArrowRight />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full px-6 text-base sm:w-auto"
            >
              <a href="#fitur">{m.home_cta_fitur()}</a>
            </Button>
          </div>

          <ul className="mt-8 grid max-w-lg grid-cols-2 gap-x-5 gap-y-3 text-sm text-muted-foreground sm:flex sm:flex-wrap">
            {sinyal.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.id} className="inline-flex items-center gap-2">
                  <Icon className="size-4 shrink-0 text-brand" />
                  <span>{item.label()}</span>
                </li>
              )
            })}
          </ul>
        </div>

        <Card className="overflow-hidden border-border bg-card py-0 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-brand-soft/60 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-brand-ink dark:text-brand">
              <ReceiptText className="size-4 shrink-0" />
              <span className="truncate">{m.home_flow_judul()}</span>
            </div>
            <Badge
              variant="outline"
              className="gap-1.5 border-brand/25 bg-background/80 text-brand-ink dark:text-brand"
            >
              <WifiOff className="size-3" />
              {m.home_flow_luring()}
            </Badge>
          </div>

          <div className="p-4 sm:p-5">
            {alur.map((item, index) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  className="relative flex gap-3 pb-5 last:pb-0"
                >
                  {index < alur.length - 1 && (
                    <span className="absolute top-10 left-[1.15rem] h-[calc(100%-1.35rem)] w-px bg-border" />
                  )}
                  <div className="relative z-10 flex size-9 shrink-0 items-center justify-center rounded-xl border border-brand/15 bg-brand-soft text-brand">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 pt-0.5">
                    <h2 className="text-sm font-semibold">{item.judul()}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {item.deskripsi()}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="grid gap-2 border-t border-border bg-muted/30 px-4 py-4 sm:grid-cols-2 sm:px-5">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Printer className="size-4 shrink-0 text-brand" />
              <span>{m.home_flow_struk()}</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Check className="size-4 shrink-0 text-brand" />
              <span>{m.home_flow_audit()}</span>
            </div>
          </div>
        </Card>
      </div>
    </section>
  )
}
