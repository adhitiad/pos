import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { IsiStruk } from '#/components/percetakan/TabelPrintJob'
import { normalisasiStrukPayload } from '#/lib/struk'
import { m } from '#/paraglide/messages'

describe('normalisasi payload struk', () => {
  it('menerima payload lama tanpa items tanpa membuat array undefined', () => {
    const payload = normalisasiStrukPayload({
      nomor: 'POS-20261020-0001',
      total: 30000,
    })

    expect(payload?.nomor).toBe('POS-20261020-0001')
    expect(payload?.total).toBe(30000)
    expect(payload?.items).toEqual([])
  })

  it('membuang modifier dan item yang tidak memiliki nama', () => {
    const payload = normalisasiStrukPayload({
      nomor: 'POS-1',
      items: [
        { nama: 'Kopi', qty: 2, harga: 15000, subtotal: 30000, modifier: [] },
        { qty: 1 },
      ],
    })

    expect(payload?.items).toHaveLength(1)
    expect(payload?.items[0]?.modifier).toEqual([])
  })

  it('mengembalikan null bila payload bukan objek atau tanpa nomor', () => {
    expect(normalisasiStrukPayload(null)).toBeNull()
    expect(normalisasiStrukPayload([])).toBeNull()
    expect(normalisasiStrukPayload({ total: 1 })).toBeNull()
  })

  it('merender payload lama tanpa crash', () => {
    const payload = normalisasiStrukPayload({
      nomor: 'POS-LAMA',
      total: 30000,
    })
    expect(payload).not.toBeNull()

    const html = renderToStaticMarkup(<IsiStruk payload={payload!} />)

    expect(html).toContain(m.percetakan_item_kosong())
    expect(html).toContain('30.000')
  })
})
