# WAJIB: Keterbacaan Kode

> Kode ditulis untuk dibaca manusia (rekan programmer), bukan untuk pamer.

## Aturan

- **WAJIB** memakai nama fungsi, variabel, dan tipe yang ekspresif, jelas, dan deskriptif. Contoh: `hitungPesangon`, `tanggalEfektifGaji`, `saldoCutiTersisa` — bukan `calc`, `tmp`, `d2`.
- **WAJIB** menulis logika yang lugas dan terstruktur: satu fungsi satu tanggung jawab, alur eksplisit, hindari nested dalam (>3 level dipecah jadi fungsi bantu).
- **DILARANG** menulis _clever code_: one-liner yang butuh >30 detik untuk dipahami, trik operator yang ambigu, singkatan tak umum, atau abstraksi prematur.
- Bahasa komentar dan pesan domain mengikuti repo: istilah kepegawaian dalam **Bahasa Indonesia** (sesuai komentar schema), istilah teknis umum boleh Inggris.
- **WAJIB** memindahkan semua type/interface TypeScript ke `src/types/**/*.d.ts`
- **WAJIB** memindahkan semua skema Zod ke `src/validations/**/*.ts`
- **DILARANG** memakai tipe `any` di kode sumber apa pun (`x: any`, `as any`, `const x: any`).
  Semua nilai harus memiliki tipe yang eksplisit (interface/type, generic, atau `unknown`
  bila memang dinamis lalu discoping via type-guard atau validasi Zod). Untuk nilai
  dinamis yang belum ter-typing, pergunakan `unknown` — bukan `any`.
