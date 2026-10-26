import type { ElementType } from 'react'

import type { produkLanding } from '#/server/produk'

export type { ProdukKartu } from '#/types/produk'

export type ProdukLanding = Awaited<ReturnType<typeof produkLanding>>

export interface Feature {
  id: string
  title: () => string
  desc: () => string
  icon: ElementType
  soon?: boolean
}
