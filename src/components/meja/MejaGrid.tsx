import { Check, Clock, QrCode, Table, Users } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import type { Meja } from '#/types/meja'

export default function MejaGrid({ data }: { data: Meja[] }) {
  // Periksa jumlah total meja; jika < 10, tetap tampilkan semua yang ada
  // (tidak membuat meja palsu — hanya visualisasi data nyata)
  const terisi = data.filter((m) => m.aktif && m.jumlahTransaksi > 0)
  const bebas = data.filter((m) => m.aktif && m.jumlahTransaksi === 0)
  const nonaktif = data.filter((m) => !m.aktif)

  return (
    <div className="space-y-6">
      {/* Ringkasan */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        <StatCard
          label="Total"
          value={data.length}
          icon={<Table className="size-4" />}
          color="bg-[#002037] text-[#e8dccb]"
        />
        <StatCard
          label="Terisi"
          value={terisi.length}
          icon={<Users className="size-4" />}
          color="bg-amber-700 text-amber-50"
        />
        <StatCard
          label="Bebas"
          value={bebas.length}
          icon={<Check className="size-4" />}
          color="bg-emerald-700 text-emerald-50"
        />
        <StatCard
          label="Nonaktif"
          value={nonaktif.length}
          icon={<Clock className="size-4" />}
          color="bg-neutral-600 text-neutral-50"
        />
      </div>

      {/* Grid meja — hanya data nyata, tidak inventasi */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {data.map((m) => {
          const isBebas = m.aktif && m.jumlahTransaksi === 0
          const isTerisi = m.aktif && m.jumlahTransaksi > 0
          return (
            <Link
              key={m.id}
              to="/meja"
              search={{ id: m.id }}
              className={`group relative rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#002037]/40 ${
                isTerisi
                  ? 'border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/40'
                  : isBebas
                    ? 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/40'
                    : 'border-neutral-200 bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800/40'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-serif text-xl font-semibold text-[#002037] dark:text-[#e8dccb]">
                    {m.nomor}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {m.nama || '—'}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    isTerisi
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      : isBebas
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300'
                        : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  {isTerisi ? 'Terisi' : isBebas ? 'Bebas' : 'Nonaktif'}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-3.5" />
                <span>{m.jumlahTransaksi} transaksi</span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#002037] px-3 text-xs font-medium text-[#e8dccb] shadow-sm hover:bg-[#003a5c] focus:outline-none focus:ring-2 focus:ring-[#002037]/40"
                  onClick={() => {
                    /* QR akan dibuka via /meja */
                  }}
                >
                  <QrCode className="size-3.5" />
                  QR Meja
                </button>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
}) {
  return (
    <div className={`rounded-xl p-3 ${color}`}>
      <div className="flex items-center gap-2 text-xs opacity-90">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 font-serif text-2xl font-bold">{value}</div>
    </div>
  )
}
