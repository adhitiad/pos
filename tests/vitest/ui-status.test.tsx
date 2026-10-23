import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { m } from '#/paraglide/messages'
import {
  HalamanError,
  HalamanLoading,
  HalamanNotFound,
} from '#/components/status/HalamanStatus'

describe('halaman status global', () => {
  it('menampilkan error dengan aksi coba lagi dan beranda', () => {
    const html = renderToStaticMarkup(<HalamanError reset={() => {}} />)
    expect(html).toContain(m.error_title())
    expect(html).toContain(m.error_retry())
    expect(html).toContain(m.error_home())
  })

  it('menampilkan not found dengan tautan beranda', () => {
    const html = renderToStaticMarkup(<HalamanNotFound />)
    expect(html).toContain(m.not_found_title())
    expect(html).toContain(m.not_found_home())
  })

  it('menampilkan loading sebagai status live', () => {
    const html = renderToStaticMarkup(<HalamanLoading />)
    expect(html).toContain('role="status"')
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain(m.loading_title())
  })
})
