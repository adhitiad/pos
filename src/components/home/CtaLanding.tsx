import { ArrowRight, Check } from 'lucide-react'

import { Link } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'

export default function CtaLanding() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-20">
      <div className="overflow-hidden rounded-3xl bg-brand text-brand-foreground">
        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:p-14">
          <div>
            <p className="text-sm font-medium text-brand-foreground/75">
              {m.home_akhir_kicker()}
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl leading-tight tracking-tight text-balance sm:text-4xl">
              {m.home_akhir_judul()}
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-brand-foreground/80">
              {m.home_akhir_desc()}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="h-12 bg-brand-foreground px-6 text-base text-brand hover:bg-brand-foreground/90"
              >
                <Link to="/kasir">
                  {m.home_cta_kasir()}
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-brand-foreground/30 bg-transparent px-6 text-base text-brand-foreground hover:bg-brand-foreground/10 hover:text-brand-foreground"
              >
                <Link to="/pesanan">{m.home_akhir_etalase()}</Link>
              </Button>
            </div>
          </div>

          <ul className="space-y-2.5 text-sm text-brand-foreground/85">
            {[
              m.home_signal_offline(),
              m.home_signal_ledger(),
              m.home_signal_tax(),
              m.home_flow_struk(),
            ].map((label) => (
              <li key={label} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0" />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
