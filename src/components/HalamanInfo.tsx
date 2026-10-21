import { ArrowLeft } from 'lucide-react'

import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { m } from '#/paraglide/messages'

import Footer from '#/components/Footer'
import Header from '#/components/Header'
import { Button } from '#/components/ui/button'

export default function HalamanInfo({
  judul,
  ikon,
  children,
}: {
  judul: string
  ikon?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="-ml-2 mb-4 min-h-11"
          >
            <Link to="/">
              <ArrowLeft />
              {m.home_kembali()}
            </Link>
          </Button>
          <article className="rounded-2xl border bg-card p-6 text-card-foreground shadow-sm sm:p-8">
            <header className="mb-6 flex items-center gap-3 border-b pb-5">
              {ikon && (
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  {ikon}
                </div>
              )}
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {judul}
              </h1>
            </header>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              {children}
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  )
}
