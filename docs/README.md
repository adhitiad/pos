# Dokumentasi POS

Indeks dokumen teknis dan operasional. Status pekerjaan ada di
[`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md), bukan di halaman ini.

## Mulai di sini

1. Setup lokal, env, dan perintah: [`../README.md`](../README.md)
2. Aturan wajib agen: [`../AGENTS.md`](../AGENTS.md) + [`../.agents/rules/`](../.agents/rules/)
3. Niat produk: [`PRD.md`](PRD.md) · kontrak agen/LLM: [`PRD-AI.md`](PRD-AI.md)
4. Kontrak API web + Expo: [`API.md`](API.md)
5. Deploy produksi: [`DEPLOY.md`](DEPLOY.md)
6. Checklist uji manual: [`TEST-MANUAL.md`](TEST-MANUAL.md)
7. Performa dan anggaran bundle: [`PERFORMA.md`](PERFORMA.md)

## Peta dokumen

| Dokumen                                          | Isi                                                                    |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| [`PRD.md`](PRD.md)                               | Niat produk, persona, ruang lingkup, NFR, dan rencana untuk manusia    |
| [`PRD-AI.md`](PRD-AI.md)                         | Kontrak kerja agen/LLM, invariant teknis, gate, dan peta kode          |
| [`PERFORMA.md`](PERFORMA.md)                     | Target Core Web Vitals, baseline bundle, query, dan prosedur ukur      |
| [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md)             | Sumber kebenaran status tugas, temuan audit, dan backlog               |
| [`DEPLOY.md`](DEPLOY.md)                         | Setup Vercel, environment GitHub, urutan migrasi, smoke test, rollback |
| [`OPERASIONAL.md`](OPERASIONAL.md)               | Backup/PITR, uptime, monitoring, dan prosedur operasi                  |
| [`API.md`](API.md)                               | Kontrak REST `/api/v1/*` untuk web dan klien native                    |
| [`EXPO.md`](EXPO.md)                             | Integrasi aplikasi Expo/mobile                                         |
| [`TEST-MANUAL.md`](TEST-MANUAL.md)               | Checklist uji manual web + backend                                     |
| [`GITHUB-SETUP.md`](GITHUB-SETUP.md)             | Issue, label, Project, dan tata kelola GitHub                          |
| [`setup-google-oauth.md`](setup-google-oauth.md) | Konfigurasi Google OAuth                                               |
| [`execution-plan.md`](execution-plan.md)         | Rencana eksekusi dan keputusan teknis                                  |
| [`BUKTI-KODE.md`](BUKTI-KODE.md)                 | Bukti kode dan diagram alur                                            |
| [`../MYDIAGRAM.md`](../MYDIAGRAM.md)             | Diagram alur aplikasi lengkap                                          |

## Sinkronisasi dokumen

Urutan yang mengikat:

```text
AGENTS.md → DAFTAR-TUGAS.md → .agents/rules/** → PRD.md → PRD-AI.md → docs/**
```

- Status tugas hanya diubah di `DAFTAR-TUGAS.md`.
- Snapshot di kedua PRD dihasilkan oleh `bun run docs:sync`; jangan edit blok
  `AUTO:*` secara manual.
- `bun run docs:check` dijalankan di CI dan gagal bila snapshot basi.
- Detail aturan: [`../.agents/rules/16-prd-dan-dokumen.md`](../.agents/rules/16-prd-dan-dokumen.md).

## Status deploy

Repo memakai **GitHub Free** (private). Required reviewer environment tidak
tersedia pada plan ini; gate produksi adalah `workflow_dispatch` manual dari
`main` + branch policy `main`. Auto-deploy `main` dimatikan di `vercel.json`.
Detail: [`DEPLOY.md`](DEPLOY.md).

## Riwayat

`docs/README.md` sebelumnya adalah task log `POS-1`–`POS-20` yang sudah basi.
Isinya sudah dikonsolidasikan ke [`DAFTAR-TUGAS.md`](DAFTAR-TUGAS.md); riwayat
lengkap tetap tersedia di git history.
