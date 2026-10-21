import { useMemo, useState } from 'react'
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { toast } from 'sonner'

import { m } from '#/paraglide/messages'
import { getSessionFn } from '#/server/authFn'
import { punyaAkses } from '#/server/peran'
import { updateUserRoleFn, userDataFn } from '#/server/userFn'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
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

const PER_PAGE = 10

function User() {
  const data = Route.useLoaderData()
  const router = useRouter()
  const [cari, setCari] = useState('')
  const [page, setPage] = useState(1)
  const [saving, setSaving] = useState<Set<string>>(new Set())

  const muatUlang = async () => {
    await router.invalidate()
  }

  const ubahRole = async (id: string, role: string) => {
    setSaving((prev) => new Set([...prev, id]))
    try {
      await updateUserRoleFn({ data: { id, role } })
      toast.success(m.user_role_ubah())
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

  const q = cari.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!q) return data
    return data.filter(
      (u) =>
        u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [data, q])

  const totalPage = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  if (page > totalPage) setPage(totalPage)
  const start = (page - 1) * PER_PAGE
  const halaman = filtered.slice(start, start + PER_PAGE)

  return (
    <DashboardLayout peran="OWNER" judul={m.user_title()}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          placeholder={m.user_cari_hint()}
          value={cari}
          onChange={(e) => {
            setCari(e.target.value)
            setPage(1)
          }}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 && (
        <p className="py-4 text-sm text-neutral-500">{m.user_kosong()}</p>
      )}

      {filtered.length > 0 && (
        <>
          <div className="-mx-2 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{m.user_nama()}</TableHead>
                  <TableHead>{m.user_email()}</TableHead>
                  <TableHead>{m.user_role()}</TableHead>
                  <TableHead className="text-right">{m.user_aksi()}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {halaman.map((u) => (
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

          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {m.user_halaman({ page, total: totalPage })}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <span>{m.user_sebelumnya()}</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPage}
                onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
              >
                <span>{m.user_berikutnya()}</span>
              </Button>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
