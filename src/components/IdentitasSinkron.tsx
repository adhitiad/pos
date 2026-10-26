import { useEffect } from 'react'

import { useRouterState } from '@tanstack/react-router'

import { m } from '#/paraglide/messages'
import { urlIkonPng, useIdentitasApp } from '#/hooks/identitas'

function pasangTautan(
  rel: string,
  href: string,
  tipe?: string,
): HTMLLinkElement {
  const pemilih = `link[data-pos-identitas="${rel}"]`
  const lama = document.head.querySelector<HTMLLinkElement>(pemilih)
  const tautan = lama ?? document.createElement('link')
  tautan.rel = rel
  tautan.href = href
  tautan.dataset.posIdentitas = rel
  if (tipe) tautan.type = tipe
  if (!lama) document.head.appendChild(tautan)
  return tautan
}

// Menyelaraskan favicon/manifest/judul dokumen dengan pengaturan owner.
// Ikon dibangun server sebagai SVG (/api/v1/app-icon).
export default function IdentitasSinkron() {
  const identitas = useIdentitasApp()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  useEffect(() => {
    const versi = encodeURIComponent(
      identitas.ikonUrl.slice(-16) || identitas.judul,
    )
    pasangTautan('icon', `/api/v1/app-icon?v=${versi}`, 'image/svg+xml')
    pasangTautan('manifest', '/api/v1/manifest')
    pasangTautan(
      'apple-touch-icon',
      identitas.ikonUrl
        ? urlIkonPng(identitas.ikonUrl, 180)
        : '/api/v1/app-icon',
    )
    const deskripsi = document.head.querySelector<HTMLMetaElement>(
      'meta[name="description"]',
    )
    if (deskripsi && identitas.deskripsi) {
      deskripsi.content = identitas.deskripsi
    }
  }, [identitas])

  useEffect(() => {
    const statis = m.app_title()
    const perbarui = () => {
      if (!document.title) return
      if (document.title.includes(statis)) {
        document.title = document.title.replaceAll(statis, identitas.judul)
      } else if (document.title === 'POS') {
        document.title = identitas.judul
      }
    }
    perbarui()
    const jeda = window.setTimeout(perbarui, 60)
    return () => window.clearTimeout(jeda)
  }, [pathname, identitas.judul])

  return null
}
