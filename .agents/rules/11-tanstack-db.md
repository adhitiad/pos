# WAJIB: TanStack DB & Lapisan Data

> Kelola koleksi data reaktif klien secara terstruktur dan sinkron aman dengan database server.

## Aturan

- **Sumber Kebenaran (Source of Truth)**: Database server (PostgreSQL via Prisma 7 di `src/db.ts`) adalah sumber data utama aplikasi. TanStack DB (`@tanstack/db`) berfungsi sebagai lapisan koleksi reaktif di sisi klien untuk kueri lokal, pembaruan optimistik, dan sinkronisasi data relasional interaktif.
- **Isolasi Lingkungan DB**:
  - `DATABASE_URL`, koneksi PostgreSQL, dan Prisma Client **DILARANG** diakses langsung dari komponen browser/klien.
  - Interaksi data antara klien dan database server **WAJIB** melalui server function (`createServerFn`) atau rute API terproteksi (`src/routes/api/**`) dengan guard sesi (`wajibMasuk`, `wajibPeran`).
- Kontrak endpoint REST resmi ada di `docs/API.md` — tambah endpoint = update file itu juga.
- **Skema & Validasi Koleksi**: Setiap koleksi TanStack DB di sisi klien **WAJIB** memiliki definisi tipe eksplisit dan divalidasi dengan Zod schema yang selaras dengan model DTO server.
- **Pembaruan Optimistik & Rollback**:
  - Pembaruan lokal yang bersifat optimistik **WAJIB** menangani skenario kegagalan server dengan mengembalikan (rollback) state koleksi ke kondisi sebelum mutasi.
  - Tampilkan notifikasi galat yang ramah pengguna menggunakan `pesanGalat` atau `sonner` tanpa menampilkan pesan error mentah database (lihat `05-error-handling.md`).
- **Pencegahan Data Stale**: Sinkronkan kembali koleksi data atau invalidasikan cache saat terjadi perubahan status penting di server (misalnya persetujuan cuti, penerbitan slip gaji, mutasi pegawai).
