import { m } from '#/paraglide/messages'

import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import type { NilaiFilterLaporan } from '#/types/laporan'

export default function FilterLaporan({
  nilai,
  onDari,
  onSampai,
  onGrup,
  onUserType,
  onTampilkan,
  unduh,
}: {
  nilai: NilaiFilterLaporan
  onDari: (v: string) => void
  onSampai: (v: string) => void
  onGrup: (v: 'harian' | 'mingguan' | 'bulanan') => void
  onUserType: (v: string) => void
  onTampilkan: () => void
  unduh: (format: string) => string
}) {
  return (
    <>
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          onTampilkan()
        }}
      >
        <div className="space-y-1">
          <Label>{m.laporan_dari()}</Label>
          <Input
            type="date"
            value={nilai.dari}
            onChange={(e) => onDari(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.laporan_sampai()}</Label>
          <Input
            type="date"
            value={nilai.sampai}
            onChange={(e) => onSampai(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label>{m.laporan_grup()}</Label>
          <Select value={nilai.grup} onValueChange={onGrup}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="harian">{m.laporan_harian()}</SelectItem>
              <SelectItem value="mingguan">{m.laporan_mingguan()}</SelectItem>
              <SelectItem value="bulanan">{m.laporan_bulanan()}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>{m.kunjungan_user_type()}</Label>
          <Select value={nilai.userType} onValueChange={onUserType}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{m.kunjungan_user_type()}</SelectItem>
              <SelectItem value="member">
                {m.kunjungan_user_type_member()}
              </SelectItem>
              <SelectItem value="non-member">
                {m.kunjungan_user_type_nonmember()}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="submit">{m.laporan_tampilkan()}</Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={unduh('csv')}>{m.laporan_unduh_csv()}</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={unduh('xlsx')}>{m.laporan_unduh_xlsx()}</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={unduh('pdf')}>{m.laporan_unduh_pdf()}</a>
        </Button>
      </div>
    </>
  )
}
