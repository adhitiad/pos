'use client'

import { useEffect, useState } from 'react'

import { Link } from '@tanstack/react-router'

import { authClient } from '#/lib/auth-client'
import { useIdentitasApp } from '#/hooks/identitas'
import { useLogoUrl } from '#/hooks/logo'
import { getPenggunaFn } from '#/server/authFn'
import { m } from '#/paraglide/messages'

import PrinterQuickScan from '#/components/printer/PrinterQuickScan'

import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { Button } from '#/components/ui/button'
import { SidebarTrigger } from '#/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import ParaglideLocaleSwitcher from './LocaleSwitcher'
import NotificationBellLazy from './NotificationBellLazy'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const { data: session, isPending } = authClient.useSession()
  const logoUrl = useLogoUrl()
  const identitas = useIdentitasApp()
  const [peran, setPeran] = useState<string | undefined>()

  useEffect(() => {
    if (isPending) return
    if (!session?.user) {
      setPeran(undefined)
      return
    }

    let aktif = true
    void getPenggunaFn()
      .then((pengguna) => {
        if (aktif) setPeran(pengguna?.role)
      })
      .catch((error: unknown) => {
        if (!aktif) return
        console.error('[Header] gagal memuat peran pengguna', error)
        setPeran(undefined)
      })
    return () => {
      aktif = false
    }
  }, [isPending, session?.user.id])

  const isOwner = peran === 'OWNER'
  const isKasir = peran === 'OWNER' || peran === 'KASIR'
  const tampilkanPesanan = !isPending && (!session?.user || peran === 'MEMBER')

  return (
    <header className="chrome-surface sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <SidebarTrigger
            size="icon"
            variant="ghost"
            className="md:hidden shrink-0 min-h-[44px] min-w-[44px]"
          />
          <img src={logoUrl} alt="" className="h-8 w-8 shrink-0" />
          <span className="chrome-title truncate text-lg font-semibold">
            {identitas.judul}
          </span>
        </div>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          {tampilkanPesanan && (
            <Link
              to="/pesanan"
              search={{ meja: undefined }}
              className="chrome-link"
            >
              {m.pesan_judul()}
            </Link>
          )}
          {isKasir && (
            <Link to="/dashboard" className="chrome-link">
              {m.dashboard_title()}
            </Link>
          )}
          {isKasir && (
            <Link to="/kasir" className="chrome-link">
              {m.nav_pos()}
            </Link>
          )}
          {isOwner && (
            <Link to="/buku-besar" className="chrome-link">
              {m.nav_ledger()}
            </Link>
          )}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {isKasir && <PrinterQuickScan />}
          {peran && <NotificationBellLazy />}
          <ThemeToggle />
          <ParaglideLocaleSwitcher />
          {isPending ? (
            <span className="h-8 w-8" />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage
                      src={session.user.image ?? undefined}
                      alt={session.user.name}
                    />
                    <AvatarFallback>
                      {session.user.name.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel className="font-semibold">
                  {m.menu_profil({ name: session.user.name })}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isKasir && (
                  <DropdownMenuItem asChild>
                    <Link to="/kasir">{m.menu_kasir()}</Link>
                  </DropdownMenuItem>
                )}
                {isOwner && (
                  <DropdownMenuItem asChild>
                    <Link to="/buku-besar">{m.menu_ledger()}</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to="/notifikasi">{m.menu_notifikasi()}</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    void authClient.signOut()
                  }}
                >
                  {m.menu_keluar()}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/login" className="chrome-link">
              <Button variant="outline" size="sm" className="h-11">
                {m.nav_login()}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
