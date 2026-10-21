# WAJIB: TanStack Table (v9)

> Tabel data terstruktur dengan TanStack Table v9 modular dan komponen shadcn/ui.

## Aturan

- **Versi & Hook**: Repo ini menggunakan `@tanstack/react-table` v9 dan `@tanstack/table-core` v9. **WAJIB** memakai `useTable` (bukan `useReactTable` v8).
- **Fitur Modular di Tingkat Modul**: **WAJIB** mendeklarasikan konfigurasi fitur tabel menggunakan `tableFeatures({ ... })` di tingkat modul (module-level constant) agar referensi fitur stabil dan hemat memori (contoh: `rowSortingFeature`, `rowPaginationFeature`, `createSortedRowModel()`, `createPaginatedRowModel()`).
- **Komponen Tampilan**: **WAJIB** membungkus tabel dengan komponen shadcn/ui dari `#/components/ui/table` (`Table`, `TableHeader`, `TableRow`, `TableHead`, `TableBody`, `TableCell`).
- **Pemisahan Berkas Kolom & Tabel**: Untuk mencegah file melebihi batas 397 baris (`04-batas-file.md`), definisi kolom (`kolom-<fitur>.tsx`) dan komponen utama tabel (`tabel-<fitur>.tsx`) **WAJIB** dipisahkan ke berkas berbeda.
- **Formatter Bersama**: Tampilan data di dalam sel (cell renderer) **WAJIB** memanfaatkan helper bersama:
  - Mata uang / nominal: `rupiah(...)` dari `#/lib/format`.
  - Tanggal: `tanggalPendek(...)` dari `#/lib/format`.
  - Status/badge: `BadgeStatus` dari `#/components/shell/ui-bawaan`.
- **Keadaan Kosong & Loading**: Saat data kosong, tampilkan komponen `KeadaanKosong` dari `#/components/shell/ui-bawaan`, dan tampilkan indikator loading/skeleton saat proses fetching berlangsung.
