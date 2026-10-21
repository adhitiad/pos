import { ArrowRight } from 'lucide-react'

import { Link } from '@tanstack/react-router'

import { urlGambarCloudinary } from '#/lib/cloudinary'
import { m } from '#/paraglide/messages'

import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent } from '#/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '#/components/ui/carousel'

import type { ProdukKartu, ProdukLanding } from '#/types/home'

const rupiah = (nilai: number) =>
  `Rp${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(nilai)}`

const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0])
    .join('')
    .toUpperCase()

function ProdukCard({ produk }: { produk: ProdukKartu }) {
  return (
    <Link
      to="/pesanan"
      aria-label={`${m.home_populer_cta()}: ${produk.nama}`}
      className="group block h-full rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <Card className="h-full gap-0 overflow-hidden p-0 border-border transition-colors group-hover:border-brand/35">
        <div className="relative aspect-[4/3] overflow-hidden bg-accent">
          {produk.gambar ? (
            <img
              src={urlGambarCloudinary(produk.gambar, 640)}
              alt={produk.nama}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              aria-hidden
              className="relative flex h-full w-full items-center justify-center overflow-hidden bg-linear-to-br from-muted via-accent to-muted"
            >
              <span className="absolute -right-3 -bottom-8 font-display text-[8rem] leading-none text-foreground/5 select-none">
                {inisial(produk.nama)}
              </span>
              <span className="relative font-display text-3xl font-semibold tracking-tight text-muted-foreground">
                {inisial(produk.nama)}
              </span>
            </div>
          )}
          {produk.terjual > 0 && (
            <Badge
              variant="secondary"
              className="absolute top-3 left-3 shadow-sm"
            >
              {produk.terjual} {m.produk_terjual()}
            </Badge>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 text-sm font-semibold sm:text-base">
            {produk.nama}
          </h3>
          <div className="mt-auto flex items-center justify-between gap-2 pt-1">
            <span className="font-semibold">{rupiah(produk.harga)}</span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-brand">
              {m.home_populer_cta()}
              <ArrowRight className="size-3.5" />
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function BarisProduk({
  id,
  judul,
  deskripsi,
  kicker,
  produk,
  utama = false,
}: {
  id: string
  judul: string
  deskripsi: string
  kicker?: string
  produk: ProdukKartu[]
  utama?: boolean
}) {
  if (produk.length === 0) return null

  const judulId = `produk-${id}`
  const tampilCarousel = produk.length > 3

  return (
    <section
      aria-labelledby={judulId}
      className={utama ? undefined : 'border-t pt-8 sm:pt-10'}
    >
      <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          {utama && kicker && (
            <p className="mb-2 text-xs font-semibold tracking-[0.18em] text-muted-foreground uppercase">
              {kicker}
            </p>
          )}
          <h2
            id={judulId}
            className={
              utama
                ? 'text-xl font-bold sm:text-2xl'
                : 'text-lg font-bold sm:text-xl'
            }
          >
            {judul}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {deskripsi}
          </p>
        </div>
        {utama && (
          <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
            <Link to="/pesanan">
              {m.pesan_judul()}
              <ArrowRight />
            </Link>
          </Button>
        )}
      </div>

      {tampilCarousel ? (
        <Carousel opts={{ align: 'start' }} aria-label={judul}>
          <CarouselContent className="-ml-3">
            {produk.map((item) => (
              <CarouselItem
                key={item.produkId}
                className="basis-[86%] pl-3 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <ProdukCard produk={item} />
              </CarouselItem>
            ))}
          </CarouselContent>

          <div className="mt-5 flex justify-end gap-2 sm:mt-6">
            <CarouselPrevious
              aria-label={m.home_carousel_sebelum()}
              className="static top-auto right-auto left-auto size-11 translate-y-0"
            />
            <CarouselNext
              aria-label={m.home_carousel_berikut()}
              className="static top-auto right-auto left-auto size-11 translate-y-0"
            />
          </div>
        </Carousel>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {produk.map((item) => (
            <ProdukCard key={item.produkId} produk={item} />
          ))}
        </div>
      )}
    </section>
  )
}

export default function ProdukLanding({ produk }: { produk: ProdukLanding }) {
  if (
    produk.populer.length === 0 &&
    produk.baru.length === 0 &&
    produk.campuran.length === 0
  ) {
    return null
  }

  return (
    <section
      aria-label={m.home_produk_pilihan()}
      className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16"
    >
      <div className="space-y-10 sm:space-y-12">
        <BarisProduk
          id="populer"
          judul={m.produk_terpopuler()}
          kicker={m.home_populer_kicker()}
          deskripsi={m.home_populer_desc()}
          produk={produk.populer}
          utama
        />
        <BarisProduk
          id="baru"
          judul={m.home_baru_judul()}
          deskripsi={m.home_baru_desc()}
          produk={produk.baru}
        />
        <BarisProduk
          id="campuran"
          judul={m.home_campuran_judul()}
          deskripsi={m.home_campuran_desc()}
          produk={produk.campuran}
        />
      </div>
    </section>
  )
}
