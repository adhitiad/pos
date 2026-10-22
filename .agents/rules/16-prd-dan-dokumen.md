# WAJIB: PRD, Dokumen, dan Sinkronisasi

> Dokumen yang bertentangan membuat agen salah mengambil keputusan. Aturan ini
> mengikat semua perubahan fitur, arsitektur, operasional, dan performa.

## Hirarki

1. Kode + `prisma/schema.prisma` + migration — perilaku nyata.
2. `docs/DAFTAR-TUGAS.md` — status tugas (satu-satunya sumber centang).
3. `docs/API.md` — kontrak REST/DTO web + Expo.
4. `docs/PRD.md` — niat produk untuk manusia.
5. `docs/PRD-AI.md` — peta kerja dan invariant untuk agen/LLM.
6. `.agents/rules/**` — aturan wajib implementasi.
7. `docs/*.md` lain — detail topik.

Bila bertentangan, jangan memilih yang paling mudah; perbaiki dokumen yang
basi atau kode yang salah, lalu jalankan gate.

## Kapan memperbarui apa

| Perubahan | Wajib diperbarui |
| --- | --- |
| Fitur/perilaku/persona/ruang lingkup | `docs/PRD.md` + `docs/PRD-AI.md` |
| Status tugas, blocked/partial | `docs/DAFTAR-TUGAS.md` |
| Endpoint/DTO/aturan bisnis API | `docs/API.md` |
| Arsitektur, invariant, performa, keamanan | `docs/PRD-AI.md` + aturan terkait di `.agents/rules/` |
| Deploy/operasional | `docs/DEPLOY.md`/`docs/OPERASIONAL.md` + `15-git-dan-deploy.md` |
| Anggaran/baseline performa | `docs/PERFORMA.md` + `docs/PRD.md` bila target berubah |

Jangan menyalin status manual ke PRD. Blok `AUTO:PRD` dan `AUTO:PRD-AI`
dihasilkan dari `DAFTAR-TUGAS.md` dan struktur repo.

## Perintah sinkronisasi

```bash
bun run docs:sync    # perbarui snapshot otomatis
bun run docs:check   # gagal bila snapshot tidak sinkron (dipakai CI)
```

- `predev` menjalankan `docs:sync` agar PRD ikut berubah saat app dijalankan.
- `docs:check` wajib hijau sebelum commit.
- Jangan mengedit isi blok di antara marker `AUTO:*:START`/`END` secara manual.

## Performa

- Target dan anggaran ada di `docs/PERFORMA.md`; ringkasan mengikat ada di
  `docs/PRD-AI.md`.
- Setelah build: `bun run perf:budget`. Over budget = gate merah.
- Jangan mengklaim optimasi tanpa pengukuran sebelum/sesudah.
- Perubahan schema/query wajib mempertimbangkan index, `select`, batas daftar,
  dan N+1.

## Larangan

- Jangan membuat dokumen baru yang menduplikasi status/backlog.
- Jangan mencentang tugas tanpa bukti gate dan tanpa memperbarui snapshot.
- Jangan menghapus/merename dokumen yang ditautkan tanpa memperbarui peta di
  `AGENTS.md`, `docs/README.md`, dan `docs/PRD-AI.md`.
- Jangan menulis klaim "selesai", "deploy berhasil", atau "CI hijau" tanpa bukti
  berupa perintah, URL run, atau respons runtime.
