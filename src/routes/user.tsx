import { useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import {
  revokeUserSessionsFn,
  updateUserRoleFn,
  userDataFn,
} from '#/server/userFn'

import { Button } from '#/components/ui/button'
import DashboardLayout from '#/components/DashboardLayout'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table'
import {
  HeaderUrutTabel,
  PaginasiTabel,
  PencarianTabel,
  useKontrolTabel,
} from '#/hooks/table-controls'

export const Route = createFileRoute('/user')({
  beforeLoad: async () => {
    const user = await getSessionFn()
    if (!user) throw redirect({ to: '/login' })
    if (!punyaAkses(user.role, 'manajerial'))
      throw redirect({ to: user.role === 'KASIR' ? '/kasir' : '/' })
  },
  loader: async () => userDataFn(),
  component: User,
})

function User() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [saving, setSaving] = useState<Set<string>>(new Set())
  const kontrol = useKontrolTabel(
    data,
    (user) => `${user.name} ${user.email} ${user.role}`,
    {
      nama: (user) => user.name,
      email: (user) => user.email,
      role: (user) => user.role,
    },
  )

  const muatUlang = async () => {
    await router.invalidate()
  }

  const ubahRole = async (id: string, role: string) => {
    setSaving((prev) => new Set([...prev, id]))
    try {
      const hasil = await updateUserRoleFn({ data: { id, role } })
      toast.success(
        hasil.berubah ? m.user_role_ubah_sesi() : m.user_role_ubah(),
      )
      await muatUlang()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mengubah role')
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const cabutSesi = async (id: string) => {
    if (!window.confirm(m.user_cabut_sesi_konfirmasi())) return
    setSaving((prev) => new Set([...prev, id]))
    try {
      const hasil = await revokeUserSessionsFn({ data: { id } })
      toast.success(m.user_cabut_sesi_berhasil({ jumlah: hasil.dicabut }))
      await muatUlang()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Gagal mencabut sesi')
    } finally {
      setSaving((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  return (
    <DashboardLayout peran="OWNER" judul={m.user_title()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PencarianTabel
          placeholder={m.user_cari_hint()}
          value={kontrol.cari}
          onChange={kontrol.setCari}
        />
      </div>

      {kontrol.jumlahBaris === 0 && (
        <p className="py-4 text-sm text-neutral-500">{m.user_kosong()}</p>
      )}

      {kontrol.jumlahBaris > 0 && (
        <>
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <HeaderUrutTabel
                    kunci="nama"
                    aktif={kontrol.kunciUrut === 'nama'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                  >
                    {m.user_nama()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="email"
                    aktif={kontrol.kunciUrut === 'email'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                  >
                    {m.user_email()}
                  </HeaderUrutTabel>
                  <HeaderUrutTabel
                    kunci="role"
                    aktif={kontrol.kunciUrut === 'role'}
                    arah={kontrol.arahUrut}
                    onUrut={kontrol.toggleUrut}
                  >
                    {m.user_role()}
                  </HeaderUrutTabel>
                  <TableHead className="text-right">{m.user_aksi()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kontrol.baris.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.name}</p>
                    </TableCell>
                    <TableCell className="text-sm text-neutral-500">
                      {u.email}
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) => {
                          void ubahRole(u.id, value)
                        }}
                        defaultValue={u.role}
                      >
                        <SelectTrigger className="w-32 h-9">
                          <SelectValue placeholder={m.user_role()} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="OWNER">
                            {m.user_role_owner()}
                          </SelectItem>
                          <SelectItem value="KASIR">
                            {m.user_role_kasir()}
                          </SelectItem>
                          <SelectItem value="MEMBER">
                            {m.user_role_member()}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {u.roleManual
                          ? m.user_role_manual()
                          : m.user_role_dari_env()}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void ubahRole(u.id, u.role)
                        }}
                        disabled={saving.has(u.id)}
                      >
                        {m.user_simpan()}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        className="ml-2"
                        onClick={() => {
                          void cabutSesi(u.id)
                        }}
                        disabled={saving.has(u.id)}
                      >
                        {m.user_cabut_sesi()}
                      </Button>
                      {saving.has(u.id) && (
                        <span className="ml-2 animate-pulse text-xs text-muted-foreground">
                          …
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <PaginasiTabel
            halamanAktif={kontrol.halamanAktif}
            jumlahHalaman={kontrol.jumlahHalaman}
            jumlahBaris={kontrol.jumlahBaris}
            ukuranHalaman={kontrol.ukuranHalaman}
            onHalaman={kontrol.setHalaman}
            onUkuranHalaman={kontrol.setUkuranHalaman}
          />
        </>
      )}
    </DashboardLayout>
  )
}
