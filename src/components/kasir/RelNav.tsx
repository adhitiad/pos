import { Link, useRouterState } from '@tanstack/react-router'
import {
  BarChart3,
  Bell,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  Home,
  Layout,
  Monitor,
  Package,
  Printer,
  Receipt,
  ScrollText,
  Settings,
  ShoppingCart,
  Table,
  Truck,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { pengaturanDataFn } from '#/server/pengaturanFn'
import { AKSES } from '#/server/peran'
import { useIdentitasApp } from '#/hooks/identitas'
import { useLogoUrl } from '#/hooks/logo'
import { m } from '#/paraglide/messages'

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '#/components/ui/sidebar'

const TAUTAN_DASAR = [
  {
    ke: '/',
    ikon: Home,
    label: m.nav_home(),
    peran: AKSES.semua,
  },
  {
    ke: '/notifikasi',
    ikon: Bell,
    label: m.notif_title(),
    peran: AKSES.semua,
  },
  {
    ke: '/pengajuan',
    ikon: ClipboardCheck,
    label: m.nav_pengajuan(),
    peran: AKSES.operasional,
  },
  {
    ke: '/kasir',
    ikon: ShoppingCart,
    label: m.nav_pos(),
    peran: AKSES.operasional,
  },
  {
    ke: '/review-transaksi',
    ikon: ClipboardList,
    label: m.nav_review(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/shift',
    ikon: Wallet,
    label: m.nav_shift(),
    peran: AKSES.operasional,
  },
  {
    ke: '/dashboard',
    ikon: Layout,
    label: m.dashboard_title(),
    peran: AKSES.operasional,
  },
  {
    ke: '/produk',
    ikon: Package,
    label: m.produk_title(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/member',
    ikon: Users,
    label: m.member_title(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/bahan',
    ikon: Boxes,
    label: m.bahan_title(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/supplier',
    ikon: Truck,
    label: m.supplier_title(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/percetakan',
    ikon: Printer,
    label: m.percetakan_title(),
    peran: AKSES.operasional,
  },
  {
    ke: '/printer',
    ikon: Printer,
    label: m.printer_title(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/buku-besar',
    ikon: Receipt,
    label: m.nav_ledger(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/laporan',
    ikon: BarChart3,
    label: m.nav_laporan(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/laporan-belanja',
    ikon: Truck,
    label: m.laporan_belanja_title(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/audit-log',
    ikon: ScrollText,
    label: m.audit_title(),
    peran: AKSES.manajerial,
  },
  { ke: '/user', ikon: User, label: m.user_title(), peran: AKSES.manajerial },
  {
    ke: '/pengaturan',
    ikon: Settings,
    label: m.nav_pengaturan(),
    peran: AKSES.manajerial,
  },
] as const

const TAUTAN_FNB = [
  {
    ke: '/meja',
    ikon: Table,
    label: m.nav_meja(),
    peran: AKSES.manajerial,
  },
  {
    ke: '/dapur',
    ikon: Monitor,
    label: m.nav_dapur(),
    peran: AKSES.operasional,
  },
] as const

export default function RelNav({ peran }: { peran?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const logoUrl = useLogoUrl()
  const identitas = useIdentitasApp()
  const [modeFnb, setModeFnb] = useState(false)

  useEffect(() => {
    let mounted = true
    const ref = crypto.randomUUID()
    pengaturanDataFn()
      .then((p) => {
        if (mounted) setModeFnb(p.modeFnb === true)
      })
      .catch((err) => {
        // pengaturan opsional — navigasi F&B tetap disembunyikan bila gagal baca
        console.error('[RelNav] gagal baca pengaturan', { ref, err })
      })
    return () => {
      mounted = false
    }
  }, [])

  const tautan = modeFnb ? [...TAUTAN_DASAR, ...TAUTAN_FNB] : TAUTAN_DASAR
  const tampil = tautan.filter((t) =>
    !peran ? true : (t.peran as readonly string[]).includes(peran),
  )

  return (
    <>
      <Sidebar collapsible="icon" className="chrome-surface border-r">
        <SidebarHeader className="border-b chrome-divider">
          <div className="flex items-center justify-center gap-2.5 py-1">
            <img src={logoUrl} alt="" className="h-9 w-9 shrink-0" />
            <span className="chrome-title truncate text-base font-semibold group-data-[collapsible=icon]:hidden">
              {identitas.judul}
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {tampil.map((t) => (
              <SidebarMenuItem key={t.ke}>
                <SidebarMenuButton
                  asChild
                  tooltip={t.label}
                  isActive={pathname === t.ke}
                  className="text-sidebar-foreground font-medium tracking-tight"
                >
                  <Link to={t.ke}>
                    <t.ikon />
                    <span>{t.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      {/* Nav bawah mobile — semua tautan ditampilkan dengan scroll horizontal */}
      <nav className="chrome-surface fixed inset-x-0 bottom-0 z-40 snap-x border-t overflow-x-auto pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex min-w-max items-stretch justify-around gap-1 px-2 py-1">
          {tampil.map((t) => (
            <Link
              key={t.ke}
              to={t.ke}
              className="chrome-nav-item flex min-h-14 min-w-14 snap-start flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px]"
              activeProps={{ 'data-status': 'active' }}
            >
              <t.ikon className="size-5" />
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  )
}
