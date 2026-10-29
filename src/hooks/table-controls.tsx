import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronsUpDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'

import { cn } from 'cn'
import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from '#/components/ui/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { TableHead } from '#/components/ui/table'
import type { PengurutTabel } from '#/types/table'

export type { PengurutTabel } from '#/types/table'

export const UKURAN_HALAMAN_TABEL = [10, 25, 50, 100] as const

function daftarHalaman(aktif: number, total: number): Array<number | '…'> {
  if (total <= 7)
    return Array.from({ length: total }, (_, indeks) => indeks + 1)

  const mulai = Math.max(2, Math.min(aktif - 1, total - 4))
  const akhir = Math.min(total - 1, Math.max(aktif + 1, 5))
  const hasil: Array<number | '…'> = [1]
  if (mulai > 2) hasil.push('…')
  for (let halaman = mulai; halaman <= akhir; halaman += 1) hasil.push(halaman)
  if (akhir < total - 1) hasil.push('…')
  hasil.push(total)
  return hasil
}

export function useKontrolTabel<T>(
  data: T[],
  teksPencarian: (baris: T) => string,
  pengurut: PengurutTabel<T>,
) {
  const [cari, setCari] = useState('')
  const [kunciUrut, setKunciUrut] = useState<string | null>(null)
  const [arahUrut, setArahUrut] = useState<'asc' | 'desc'>('asc')
  const [ukuranHalaman, setUkuranHalaman] = useState<number>(10)
  const [indeksHalaman, setIndeksHalaman] = useState(0)

  const barisTerpilih = useMemo(() => {
    const q = cari.trim().toLocaleLowerCase()
    const hasil = q
      ? data.filter((baris) =>
          teksPencarian(baris).toLocaleLowerCase().includes(q),
        )
      : data
    const ambilNilai = kunciUrut ? pengurut[kunciUrut] : undefined
    if (!ambilNilai) return hasil

    const pembanding = new Intl.Collator(undefined, {
      numeric: true,
      sensitivity: 'base',
    })
    return [...hasil].sort((a, b) => {
      const kiri = ambilNilai(a)
      const kanan = ambilNilai(b)
      let urutan = 0
      if (kiri instanceof Date && kanan instanceof Date) {
        urutan = kiri.getTime() - kanan.getTime()
      } else if (typeof kiri === 'number' && typeof kanan === 'number') {
        urutan = kiri - kanan
      } else {
        urutan = pembanding.compare(String(kiri ?? ''), String(kanan ?? ''))
      }
      return arahUrut === 'asc' ? urutan : -urutan
    })
  }, [data, teksPencarian, cari, kunciUrut, arahUrut, pengurut])

  const jumlahHalaman = Math.max(
    1,
    Math.ceil(barisTerpilih.length / ukuranHalaman),
  )
  const halamanAktif = Math.min(indeksHalaman, jumlahHalaman - 1)
  const barisHalaman = barisTerpilih.slice(
    halamanAktif * ukuranHalaman,
    (halamanAktif + 1) * ukuranHalaman,
  )

  useEffect(() => {
    if (indeksHalaman !== halamanAktif) setIndeksHalaman(halamanAktif)
  }, [indeksHalaman, halamanAktif])

  return {
    baris: barisHalaman,
    jumlahBaris: barisTerpilih.length,
    jumlahHalaman,
    halamanAktif,
    ukuranHalaman,
    cari,
    setCari: (nilai: string) => {
      setCari(nilai)
      setIndeksHalaman(0)
    },
    setUkuranHalaman: (nilai: number) => {
      if (!UKURAN_HALAMAN_TABEL.some((ukuran) => ukuran === nilai)) {
        return
      }
      setUkuranHalaman(nilai)
      setIndeksHalaman(0)
    },
    setHalaman: setIndeksHalaman,
    kunciUrut,
    arahUrut,
    toggleUrut: (kunci: string) => {
      if (!pengurut[kunci]) return
      setArahUrut((arah) =>
        kunciUrut === kunci && arah === 'asc' ? 'desc' : 'asc',
      )
      setKunciUrut(kunci)
      setIndeksHalaman(0)
    },
  }
}

export function PencarianTabel({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <Input
      type="search"
      value={value}
      placeholder={placeholder ?? m.tabel_cari()}
      onChange={(event) => onChange(event.target.value)}
      className={cn('w-full max-w-sm sm:max-w-md', className)}
      aria-label={placeholder ?? m.tabel_cari()}
    />
  )
}

export function HeaderUrutTabel({
  kunci,
  aktif,
  arah,
  onUrut,
  children,
  className,
}: {
  kunci: string
  aktif: boolean
  arah: 'asc' | 'desc'
  onUrut: (kunci: string) => void
  children: ReactNode
  className?: string
}) {
  return (
    <TableHead
      className={className}
      aria-sort={aktif ? (arah === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-2 h-8 px-2"
        onClick={() => onUrut(kunci)}
      >
        {children}
        {aktif ? (
          arah === 'asc' ? (
            <ArrowUpIcon aria-hidden />
          ) : (
            <ArrowDownIcon aria-hidden />
          )
        ) : (
          <ChevronsUpDownIcon aria-hidden />
        )}
      </Button>
    </TableHead>
  )
}

export function PaginasiTabel({
  halamanAktif,
  jumlahHalaman,
  jumlahBaris,
  ukuranHalaman,
  onHalaman,
  onUkuranHalaman,
}: {
  halamanAktif: number
  jumlahHalaman: number
  jumlahBaris: number
  ukuranHalaman: number
  onHalaman: (halaman: number) => void
  onUkuranHalaman: (ukuran: number) => void
}) {
  if (jumlahBaris === 0) return null

  const halaman = halamanAktif + 1
  const nomorHalaman = daftarHalaman(halaman, jumlahHalaman)

  return (
    <div className="mt-4 flex flex-col gap-3 pb-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>{m.tabel_baris_per_halaman()}</span>
        <Select
          value={String(ukuranHalaman)}
          onValueChange={(nilai) => onUkuranHalaman(Number(nilai))}
        >
          <SelectTrigger
            size="sm"
            className="w-full sm:w-[74px]"
            aria-label={m.tabel_baris_per_halaman()}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UKURAN_HALAMAN_TABEL.map((ukuran) => (
              <SelectItem key={ukuran} value={String(ukuran)}>
                {ukuran}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <span className="text-sm text-muted-foreground">
          {m.tabel_halaman_info({ halaman, total: jumlahHalaman })}
        </span>
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationLink
                href="#"
                size="sm"
                aria-label={m.tabel_sebelumnya()}
                aria-disabled={halamanAktif === 0}
                className={cn(
                  halamanAktif === 0 && 'pointer-events-none opacity-50',
                )}
                onClick={(event) => {
                  event.preventDefault()
                  if (halamanAktif > 0) onHalaman(halamanAktif - 1)
                }}
              >
                <ChevronLeftIcon aria-hidden />
                <span className="hidden sm:block">{m.tabel_sebelumnya()}</span>
              </PaginationLink>
            </PaginationItem>
            {nomorHalaman.map((nomor, indeks) =>
              nomor === '…' ? (
                <PaginationItem key={`ellipsis-${indeks}`}>
                  <span className="flex size-8 items-center justify-center text-sm">
                    …
                  </span>
                </PaginationItem>
              ) : (
                <PaginationItem key={nomor}>
                  <PaginationLink
                    href="#"
                    size="icon-sm"
                    isActive={nomor === halaman}
                    aria-label={String(nomor)}
                    onClick={(event) => {
                      event.preventDefault()
                      onHalaman(nomor - 1)
                    }}
                  >
                    {nomor}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationLink
                href="#"
                size="sm"
                aria-label={m.tabel_berikutnya()}
                aria-disabled={halamanAktif >= jumlahHalaman - 1}
                className={cn(
                  halamanAktif >= jumlahHalaman - 1 &&
                    'pointer-events-none opacity-50',
                )}
                onClick={(event) => {
                  event.preventDefault()
                  if (halamanAktif < jumlahHalaman - 1)
                    onHalaman(halamanAktif + 1)
                }}
              >
                <span className="hidden sm:block">{m.tabel_berikutnya()}</span>
                <ChevronRightIcon aria-hidden />
              </PaginationLink>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  )
}
