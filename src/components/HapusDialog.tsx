import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'

// Konfirmasi hapus bersama — dipakai /produk, /member, /bahan.
export default function HapusDialog({
  terbuka,
  judul,
  deskripsi,
  batal,
  ya,
  onBatal,
  onYa,
}: {
  terbuka: boolean
  judul: string
  deskripsi: string
  batal: string
  ya: string
  onBatal: () => void
  onYa: () => void
}) {
  return (
    <Dialog
      open={terbuka}
      onOpenChange={(buka) => {
        if (!buka) onBatal()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{judul}</DialogTitle>
          <DialogDescription>{deskripsi}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col sm:flex-row gap-2 w-full">
          <Button
            variant="outline"
            onClick={onBatal}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {batal}
          </Button>
          <Button
            variant="destructive"
            onClick={onYa}
            className="w-full sm:w-auto min-h-[44px]"
          >
            {ya}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
