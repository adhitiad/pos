import type { ElementType } from 'react'

import type { produkLanding, produkTerpopuler } from '#/server/produk'

export type ProdukKartu = Awaited<ReturnType<typeof produkTerpopuler>>[number]

export type ProdukLanding = Awaited<ReturnType<typeof produkLanding>>

export interface Feature {
  id: string
  title: () => string
  desc: () => string
  icon: ElementType
  soon?: boolean
}
