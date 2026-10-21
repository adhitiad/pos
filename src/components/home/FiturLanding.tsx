import {
  ArrowRight,
  BookOpen,
  Coffee,
  Package,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Store,
  UtensilsCrossed,
  Users,
  WifiOff,
} from 'lucide-react'
import type { ElementType } from 'react'

import { Link } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'

import type { Feature } from '#/types/home'

const FITUR: Feature[] = [
  {
    id: 'kasir',
    title: m.feat_kasir_title,
    desc: m.feat_kasir_desc,
    icon: ShoppingCart,
  },
  {
    id: 'produk',
    title: m.feat_produk_title,
    desc: m.feat_produk_desc,
    icon: Package,
  },
  {
    id: 'buku',
    title: m.feat_buku_title,
    desc: m.feat_buku_desc,
    icon: BookOpen,
  },
  {
    id: 'offline',
    title: m.feat_offline_title,
    desc: m.feat_offline_desc,
    icon: WifiOff,
  },
  {
    id: 'member',
    title: m.feat_member_title,
    desc: m.feat_member_desc,
    icon: Users,
  },
  {
    id: 'akses',
    title: m.feat_karyawan_title,
    desc: m.feat_karyawan_desc,
    icon: ShieldCheck,
  },
]

const SEGMEN: { id: string; label: () => string; icon: ElementType }[] = [
  { id: 'warung', label: m.home_segmen_warung, icon: Store },
  { id: 'kafe', label: m.home_segmen_kafe, icon: Coffee },
  { id: 'resto', label: m.home_segmen_resto, icon: UtensilsCrossed },
  { id: 'ritel', label: m.home_segmen_ritel, icon: ShoppingBag },
]

export default function FiturLanding() {
  return (
    <section
      id="fitur"
      className="scroll-mt-20 border-y border-border bg-muted/20"
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-xs font-semibold tracking-[0.2em] text-brand uppercase">
              {m.home_fitur_kicker()}
            </p>
            <h2 className="mt-3 max-w-md font-display text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
              {m.home_fitur_judul()}
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
              {m.home_fitur_desc()}
            </p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
              {m.home_fitur_audiens()}
            </p>
            <Button
              asChild
              className="mt-6 h-11 w-full bg-brand text-brand-foreground hover:bg-brand/90 sm:w-auto"
            >
              <Link to="/kasir">
                {m.home_cta_kasir()}
                <ArrowRight />
              </Link>
            </Button>

            <div className="mt-8 border-t border-border pt-6">
              <p className="text-sm font-semibold">{m.home_segmen_judul()}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {m.home_segmen_desc()}
              </p>
              <ul className="mt-4 grid grid-cols-2 gap-2">
                {SEGMEN.map((item) => {
                  const Icon = item.icon
                  return (
                    <li
                      key={item.id}
                      className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-card px-3 text-sm font-medium"
                    >
                      <Icon className="size-4 shrink-0 text-brand" />
                      <span>{item.label()}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {FITUR.map((fitur) => {
              const Icon = fitur.icon
              return (
                <Card
                  key={fitur.id}
                  className="gap-0 border-border bg-card py-0 transition-colors hover:border-brand/35"
                >
                  <CardContent className="p-5 sm:p-6">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-brand/15 bg-brand-soft text-brand">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-4 text-base font-semibold">
                      {fitur.title()}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {fitur.desc()}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
