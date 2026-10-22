# WAJIB: Git, Commit, Push, dan Deploy

> Berlaku untuk semua agen. Jangan menyimpulkan izin dari tugas sebelumnya.

## Gerbang persetujuan

- **DILARANG** `git commit` sampai pengguna menulis persis **"ok Commit"**.
- **DILARANG** `git push` sampai pengguna menulis persis **"ok push"**.
- **DILARANG** deploy ke Vercel/Netlify (termasuk `workflow_dispatch` deploy)
  tanpa perintah eksplisit dari pengguna.
- Setelah commit diizinkan, stage hanya file yang relevan. Jangan pernah
  meng-commit `.env*` selain `.env.example`, token, atau kredensial.

## Sebelum commit

- Periksa `git status`, `git diff`, dan `git log --oneline -10`; pastikan tidak
  ada perubahan tak terkait yang ikut terbawa.
- Jalankan gate `.agents/rules/07-verifikasi.md`; jangan mengandalkan hasil
  gate lama bila file berubah setelah gate dijalankan.
- Jalankan `bun run docs:sync` lalu `bun run docs:check`; setelah build jalankan
  `bun run perf:budget`.
- Perbarui `docs/DAFTAR-TUGAS.md` untuk pekerjaan yang benar-benar selesai.
- Bila perubahan mengubah alur, aturan, atau operasi repo, tambahkan/catat
  aturannya di `.agents/rules/` — bukan hanya di commit message.
- Jangan menulis klaim "deploy/CI berhasil" tanpa URL run atau bukti runtime.

## Deploy produksi

- Repo memakai **GitHub Free**; required reviewer environment tidak tersedia
  untuk repo private. Gate produksi adalah `workflow_dispatch` manual dari
  `main` + branch policy `main`, bukan auto-deploy.
- Deploy WAJIB lewat `.github/workflows/deploy-production.yml`: migrasi →
  status migrasi → build/deploy Vercel → smoke test.
- Jangan menjalankan `db:seed` atau `db:push` di produksi.
- Simpan nilai rahasia hanya di GitHub Environment `production`, bukan di
  workflow, dokumen, atau source code.
