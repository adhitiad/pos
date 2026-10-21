import { Link } from '@tanstack/react-router'

import { useIdentitasApp } from '#/lib/identitas'
import { useLogoUrl } from '#/lib/logo'
import { m } from '#/paraglide/messages'

export default function Footer() {
  const logoUrl = useLogoUrl()
  const identitas = useIdentitasApp()
  return (
    <footer className="chrome-surface mt-auto border-t">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm leading-none">
          <img src={logoUrl} alt="" className="h-5 w-5 shrink-0" />
          <span className="chrome-title font-medium">
            {identitas.judul} — {m.footer_credit()}
          </span>
        </div>
        <p className="chrome-link text-sm">{m.footer_rights()}</p>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link
            to="/"
            className="chrome-link inline-flex min-h-11 items-center"
          >
            {m.nav_pos()}
          </Link>
          <Link
            to="/pesanan"
            className="chrome-link inline-flex min-h-11 items-center"
          >
            {m.pesan_judul()}
          </Link>
          <Link
            to="/buku-besar"
            className="chrome-link inline-flex min-h-11 items-center"
          >
            {m.nav_ledger()}
          </Link>
          <Link
            to="/tentang"
            className="chrome-link inline-flex min-h-11 items-center"
          >
            {m.tentang_title()}
          </Link>
          <Link
            to="/privasi"
            className="chrome-link inline-flex min-h-11 items-center"
          >
            {m.privasi_title()}
          </Link>
          <Link
            to="/tos"
            className="chrome-link inline-flex min-h-11 items-center"
          >
            {m.tos_title()}
          </Link>
        </nav>
      </div>
    </footer>
  )
}
