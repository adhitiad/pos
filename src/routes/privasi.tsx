import { createFileRoute } from '@tanstack/react-router'

import HalamanInfo from '#/components/HalamanInfo'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/privasi')({
  head: () => ({
    meta: [{ title: `${m.privasi_title()} · ${m.app_title()}` }],
  }),
  component: Privasi,
})

function Privasi() {
  return (
    <HalamanInfo judul={m.privasi_title()}>
      <p className="text-foreground">{m.privasi_intro()}</p>
      <h2 className="pt-2 text-lg font-semibold text-foreground sm:text-xl">
        {m.privasi_data_dikumpulkan()}
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>{m.privasi_item1()}</li>
        <li>{m.privasi_item2()}</li>
        <li>{m.privasi_item3()}</li>
      </ul>
      <h2 className="pt-2 text-lg font-semibold text-foreground sm:text-xl">
        {m.privasi_penggunaan_data()}
      </h2>
      <p>{m.privasi_penggunaan_desc()}</p>
      <h2 className="pt-2 text-lg font-semibold text-foreground sm:text-xl">
        {m.privasi_penyimpanan()}
      </h2>
      <p>{m.privasi_penyimpanan_desc()}</p>
      <p className="pt-2 text-xs">{m.privasi_efektif()}</p>
    </HalamanInfo>
  )
}
