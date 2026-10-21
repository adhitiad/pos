import { useCallback, useEffect, useState } from 'react'
import { useNavigate, Link } from '@tanstack/react-router'
import {
  Bell,
  ClipboardList,
  PackageCheck,
  PackageX,
  ReceiptText,
  TrendingUp,
} from 'lucide-react'

import { m } from '#/paraglide/messages'
import { useNotifikasiDibaca, useSegarkanNotifikasi } from '#/lib/notifikasi'
import { notifikasiFn } from '#/server/notifikasiFn'
import type {
  Notifikasi,
  PeriodePendapatan,
  StatusPesananNotif,
} from '#/types/notifikasi'

import { Button } from '#/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'

const judulPendapatan = (periode: PeriodePendapatan) => {
  if (periode === 'harian') return m.notif_pendapatan_harian()
  if (periode === 'mingguan') return m.notif_pendapatan_mingguan()
  return m.notif_pendapatan_bulanan()
}

const labelStatus = (status: StatusPesananNotif) => {
  if (status === 'MENUNGGU') return m.notif_status_menunggu()
  if (status === 'DIPROSES') return m.notif_status_diproses()
  if (status === 'SELESAI') return m.notif_status_selesai()
  if (status === 'DIBATALKAN') return m.notif_status_dibatalkan()
  return m.notif_status_lunas()
}

const rupiah = (n: number) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)

export default function NotificationBell() {
  const navigate = useNavigate()
  const { dibaca, tandai } = useNotifikasiDibaca()
  const [daftar, setDaftar] = useState<Notifikasi[]>([])
  const [memuat, setMemuat] = useState(true)
  const [versi, setVersi] = useState(0)

  useEffect(() => {
    let aktif = true
    setMemuat(true)
    notifikasiFn()
      .then((data) => {
        if (aktif) setDaftar(data)
      })
      .catch(() => {
        if (aktif) setDaftar([])
      })
      .finally(() => {
        if (aktif) setMemuat(false)
      })
    return () => {
      aktif = false
    }
  }, [versi])

  const segarkan = useCallback(() => setVersi((v) => v + 1), [])
  useSegarkanNotifikasi(segarkan)

  const belumDibaca = daftar.filter((n) => !dibaca.has(n.id))

  const buka = (notif: Notifikasi) => {
    tandai([notif.id])
    void navigate({ to: '/notifikasi' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative size-11"
          aria-label={m.notif_label()}
        >
          <Bell className="size-4" />
          {belumDibaca.length > 0 && (
            <span className="absolute right-2 top-2 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {belumDibaca.length > 9 ? '9+' : belumDibaca.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 max-w-[calc(100vw-2rem)]"
      >
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>{m.notif_label()}</span>
          {belumDibaca.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {m.notif_belum_dibaca({ jumlah: belumDibaca.length })}
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {memuat ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">
            {m.notif_memuat()}
          </p>
        ) : belumDibaca.length === 0 ? (
          <div className="px-3 py-6 text-center">
            <Bell className="mx-auto mb-2 size-5 text-muted-foreground" />
            <p className="text-sm font-medium">
              {daftar.length > 0 ? m.notif_tidak_ada_baru() : m.notif_kosong()}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {daftar.length > 0
                ? m.notif_tidak_ada_baru_desc()
                : m.notif_kosong_desc()}
            </p>
          </div>
        ) : (
          belumDibaca.slice(0, 5).map((notif) => (
            <DropdownMenuItem
              key={notif.id}
              className="items-start gap-2 py-2"
              onSelect={() => buka(notif)}
            >
              {notif.tipe === 'stok' && (
                <PackageX className="mt-0.5 size-4 shrink-0 text-destructive" />
              )}
              {notif.tipe === 'pendapatan' && (
                <TrendingUp className="mt-0.5 size-4 shrink-0 text-primary" />
              )}
              {notif.tipe === 'transaksi' && (
                <ReceiptText className="mt-0.5 size-4 shrink-0 text-emerald-600" />
              )}
              {notif.tipe === 'pesanan' && (
                <>
                  {notif.untuk === 'kasir' ? (
                    <ClipboardList className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  ) : (
                    <PackageCheck className="mt-0.5 size-4 shrink-0 text-blue-600" />
                  )}
                </>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {notif.tipe === 'stok' && m.notif_stok_habis()}
                  {notif.tipe === 'pendapatan' &&
                    judulPendapatan(notif.periode)}
                  {notif.tipe === 'transaksi' && m.notif_transaksi_berhasil()}
                  {notif.tipe === 'pesanan' &&
                    (notif.untuk === 'kasir'
                      ? m.notif_pesanan_baru()
                      : m.notif_pesanan_status())}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {notif.tipe === 'stok' &&
                    m.notif_stok_pesan({
                      nama: notif.nama,
                      stok: notif.stok,
                      satuan: notif.satuan,
                    })}
                  {notif.tipe === 'pendapatan' &&
                    m.notif_pendapatan_pesan({
                      total: rupiah(notif.total),
                      jumlah: notif.jumlahTransaksi,
                    })}
                  {notif.tipe === 'transaksi' &&
                    m.notif_transaksi_pesan({
                      nomor: notif.nomor,
                      total: rupiah(notif.total),
                    })}
                  {notif.tipe === 'pesanan' &&
                    m.notif_pesanan_pesan({
                      nomor: notif.nomor,
                      status: labelStatus(notif.status),
                      total: rupiah(notif.total),
                    })}
                </p>
              </div>
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/notifikasi" className="w-full justify-center">
            {m.notif_lihat_semua()}
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
