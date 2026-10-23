import {
  Compass,
  Home,
  LoaderCircle,
  RotateCcw,
  TriangleAlert,
} from 'lucide-react'
import type { ReactNode } from 'react'

import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'

function BingkaiStatus({
  ikon,
  judul,
  deskripsi,
  aksi,
  status,
}: {
  ikon: ReactNode
  judul: string
  deskripsi: string
  aksi?: ReactNode
  status?: boolean
}) {
  return (
    <main
      className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background p-4 sm:p-6"
      role={status ? 'status' : undefined}
      aria-live={status ? 'polite' : undefined}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,color-mix(in_oklab,var(--primary)_14%,transparent),transparent_58%)]"
      />
      <section className="relative w-full max-w-md rounded-3xl border border-border/70 bg-card p-6 text-center shadow-xl sm:p-9">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border bg-muted text-foreground">
          {ikon}
        </div>
        <p className="mt-5 text-xs font-semibold tracking-[0.24em] text-muted-foreground uppercase">
          POS
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{judul}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
          {deskripsi}
        </p>
        {aksi && (
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            {aksi}
          </div>
        )}
      </section>
    </main>
  )
}

export function HalamanLoading() {
  return (
    <BingkaiStatus
      status
      ikon={<LoaderCircle className="size-6 animate-spin" />}
      judul={m.loading_title()}
      deskripsi={m.loading_desc()}
      aksi={
        <div className="mx-auto flex w-full max-w-xs flex-col gap-2">
          <div className="h-2.5 animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-4/5 animate-pulse rounded-full bg-muted" />
          <div className="h-2.5 w-3/5 animate-pulse rounded-full bg-muted" />
        </div>
      }
    />
  )
}

export function HalamanError({ reset }: { reset: () => void }) {
  return (
    <BingkaiStatus
      ikon={<TriangleAlert className="size-6 text-destructive" />}
      judul={m.error_title()}
      deskripsi={m.error_desc()}
      aksi={
        <>
          <Button className="h-11" onClick={reset}>
            <RotateCcw className="size-4" />
            {m.error_retry()}
          </Button>
          <Button asChild variant="outline" className="h-11">
            <a href="/">
              <Home className="size-4" />
              {m.error_home()}
            </a>
          </Button>
        </>
      }
    />
  )
}

export function HalamanNotFound() {
  return (
    <BingkaiStatus
      ikon={<Compass className="size-6" />}
      judul={m.not_found_title()}
      deskripsi={m.not_found_desc()}
      aksi={
        <Button asChild className="h-11">
          <a href="/">
            <Home className="size-4" />
            {m.not_found_home()}
          </a>
        </Button>
      }
    />
  )
}
