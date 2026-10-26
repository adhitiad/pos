import { createFileRoute, redirect } from '@tanstack/react-router'

import { usePengaturanForm } from '#/hooks/usePengaturanForm'
import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { pengaturanDataFn } from '#/server/pengaturanFn'

import DashboardLayout from '#/components/DashboardLayout'
import BagianIdentitas from '#/components/pengaturan/BagianIdentitas'
import BagianOperasional from '#/components/pengaturan/BagianOperasional'
import { Button } from '#/components/ui/button'

export const Route = createFileRoute('/pengaturan')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => pengaturanDataFn(),
  component: Pengaturan,
})

function Pengaturan() {
  const awal = Route.useLoaderData()
  const form = usePengaturanForm(awal)

  return (
    <DashboardLayout peran="OWNER" judul={m.pengaturan_title()}>
      <BagianIdentitas form={form} />
      <BagianOperasional form={form} />

      <div className="flex justify-end">
        <Button onClick={() => void form.onSubmit()} disabled={form.simpan}>
          {m.pengaturan_simpan()}
        </Button>
      </div>
    </DashboardLayout>
  )
}
