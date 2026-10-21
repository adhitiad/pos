# WAJIB: Verifikasi Akhir Tugas

> Tugas belum selesai sebelum verifikasi hijau. Jalankan **setiap akhir tugas** pengodean, dalam urutan ini:

## Urutan wajib

1. **Typecheck** — `bunx tsc --noEmit` (repo strict: `noUnusedLocals`/`noUnusedParameters`, `verbatimModuleSyntax` → pakai `import type` untuk tipe)
2. **Lint** — `bun --bun run lint`
3. **Prettier** — `bunx prettier --check .` (gaya: tanpa semicolon, single quote, trailing comma). Bila merah, rapikan dengan `bun --bun run format`, lalu ulangi dari langkah 1
4. **Vitest per unit** — `bunx vitest run <file-unit-yang-disentuh>` untuk setiap modul logika yang diubah/ditambah (contoh: `jadwal-gaji`, `pph21`, `hak-cuti`, `pensiun`). Cakupan minimal: jalur normal + batas ambang (mis. bulan ke-4/5/8/9/12/13/16/17 untuk kurva gaji sakit; masa kerja 3/5 tahun untuk pesangon)

## Ketentuan

- Semua perintah lewat `bun`/`bunx` (lihat `01-bun.md`). Satu langkah merah = berhenti, perbaiki, ulangi dari langkah 1.
- Vitest terkonfigurasi (`vitest.config.ts`, env `node`, pola `tests/**/*.test.ts`, script `bun --bun run test`). Untuk modul logika murni baru, **WAJIB** sertakan file test unit di `./tests/` mengikuti gaya existing repo (zod-validated, fungsi murni UTC seperti `src/lib/jadwal-gaji.ts` + `tests/jadwal-gaji.test.ts`).
- Laporkan hasil keempat langkah di akhir pesan kerja (lolos/gagal + file yang dites).
