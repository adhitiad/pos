# WAJIB: Batas Panjang File & Anti-Duplikasi

> File gemuk = tanggung jawab campur. Pecah sebelum membusuk.

## Aturan

- Setiap file kode **WAJIB < 397 baris**.
- **Toleransi khusus +11 baris** (maksimal **408 baris**) hanya bila ada alasan arsitektur yang kuat dan ditulis eksplisit (mis. menjaga keutuhan satu fungsi murni + tabel tarif). Tanpa alasan mendesak: patuhi batas awal.
- Bila file melebihi batas (atau toleransi), **WAJIB dipecah** ke file/folder baru yang relevan secara domain/tanggung jawab (contoh: `src/lib/pph21.ts` → `src/lib/pph21/tarif.ts`, `src/lib/pph21/hitung.ts`).
- Saat memecah/membuat file baru, **DILARANG menduplikasi** fungsi, struktur, atau logika yang sudah ada di modul terkait — ekstrak dan impor dari satu sumber kebenaran.
- Cek baris sebelum selesai (PowerShell): `(Get-Content <file>).Count` wajib < 397 (atau ≤ 408 dengan alasan tertulis di PR/pesan kerja).

## Batas ini berlaku untuk

- `src/lib/**` (aturan bisnis: gaji, cuti, pensiun, PPh 21), `src/routes/**`, `src/components/**` (di luar `ui/` bawaan shadcn), dan file Prisma/seed yang ditulis tangan.
- Dikecualikan: file generated (`src/generated/**`, `src/paraglide/**`, `src/routeTree.gen.ts`) dan `ui/` bawaan shadcn — jangan dihitung, jangan diedit manual.
