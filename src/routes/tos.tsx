import { createFileRoute } from '@tanstack/react-router'

import HalamanInfo from '#/components/HalamanInfo'
import { m } from '#/paraglide/messages'

export const Route = createFileRoute('/tos')({
  head: () => ({
    meta: [{ title: `${m.tos_title()} · ${m.app_title()}` }],
  }),
  component: Tos,
})

function Tos() {
  return (
    <HalamanInfo judul={m.tos_title()}>
      <p className="text-foreground">{m.tos_intro()}</p>
      <h2 className="pt-2 text-lg font-semibold text-foreground sm:text-xl">
        {m.tos_penggunaan()}
      </h2>
      <ul className="list-disc space-y-2 pl-5">
        <li>{m.tos_item1()}</li>
        <li>{m.tos_item2()}</li>
        <li>{m.tos_item3()}</li>
        <li>{m.tos_item4()}</li>
      </ul>
      <h2 className="pt-2 text-lg font-semibold text-foreground sm:text-xl">
        {m.tos_pembatalan()}
      </h2>
      <p>{m.tos_pembatalan_desc()}</p>
      <p className="pt-2 text-xs">{m.tos_efektif()}</p>
    </HalamanInfo>
  )
}
