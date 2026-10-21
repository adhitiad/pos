# WAJIB: Penanganan Kesalahan (Error Handling)

> Klien tidak boleh melihat isi perut database. Operator harus bisa mendiagnosis dari log.

## Aturan

- **DILARANG** membocorkan pesan error mentah database (`driver error`, query internal, stack trace Prisma/`pg`) ke response klien — termasuk via server function TanStack Start maupun API route.
- **WAJIB** mencatat detail error lengkap di log server (pesan asli, kode error, konteks: userId/operasi/input relevan — tanpa rahasia seperti password/token).
- **WAJIB** mengirim ke klien pesan umum yang aman dan informatif + kode yang bisa dirujuk ke log (mis. `Terjadi kesalahan saat menyimpan data (ref: XXXX). Hubungi operator.`).
- Terapkan di setiap batas kepercayaan: server function (`createServerFn`), API route (`src/routes/api/**`), dan job/mutasi DB (seed, generate slip).
