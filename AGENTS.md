# AGENTS.md — POS

> Dibaca agen sebelum menyentuh repo ini. Detail per topik di `.agents/rules/`.

## Perintah (WAJIB bun/bunx, tanpa npm/npx/pnpm)

```bash
bun install
bun --bun run dev          # :3000
bun --bun run build
bun run generate-routes    # tiap tambah/ubah route
bun run db:generate | db:seed | db:studio
bun run db:migrate          # buat migration baru (dev, prisma migrate dev)
bun run db:migrate:deploy   # apply migration (dev/prod/CI, migrate deploy)
bun run db:migrate:status   # cek status migration
bun run lint | bun run format | bun run check
bun run docs:sync          # sinkronkan snapshot PRD dari DAFTAR-TUGAS
bun run docs:check         # gagal bila snapshot PRD basi
bun run perf:budget        # cek anggaran bundle setelah build
bun run test:vitest        # vitest (unit, tests/vitest/*.test.ts)
bun run test:coverage      # unit + ambang cakupan (vitest.config.ts)
bun run test:load          # k6 checkout bersamaan (butuh k6 + server hidup)
bun run test               # alias test:vitest
bun run test:e2e            # playwright (tests/e2e/*.spec.ts, chromium)
bunx tsc --noEmit          # typecheck
opencode mcp list           # status MCP; pos-expo & pos-backend wajib "connected"
```

## Gate definisi-selesai

Setiap perubahan kode WAJIB lolos: `tsc --noEmit`, `lint`, `check`,
`docs:check`, `test:vitest`, `test:e2e` (bila route/guard/endpoint berubah),
`build`, dan `perf:budget` setelah build. Setelah suite DB dijalankan, `bun run
db:seed` wajib dieksekusi lagi sebelum uji manual — tes integrasi memakai
database dev yang sama dan menghapus master produk/kategori.
Uji DB manual pakai skrip sekali-pakai di `C:\Users\humas\AppData\Local\Temp\opencode\`,
impor absolut (`E:/code/pos/src/...`), jalankan via
`bunx dotenv run -f .env.local -- bun <skrip>` — lalu `db:seed` untuk reset.

## Peta dokumen (wajib)

Urutan baca dan sinkronisasi:

```text
AGENTS.md → docs/DAFTAR-TUGAS.md → .agents/rules/** → docs/PRD.md
  → docs/PRD-AI.md → docs/** (API, DEPLOY, OPERASIONAL, PERFORMA, …)
```

- `docs/DAFTAR-TUGAS.md` satu-satunya sumber status tugas.
- `docs/PRD.md` = niat produk untuk manusia; `docs/PRD-AI.md` = kontrak kerja
  agen/LLM dan invariant teknis.
- Blok `AUTO:PRD` di kedua PRD dihasilkan `bun run docs:sync`; jangan edit manual.
- Perubahan fitur/perilaku wajib memperbarui PRD terkait, `API.md` bila kontrak
  berubah, dan aturan `.agents/rules/` bila konvensi berubah.
- Detail: `.agents/rules/16-prd-dan-dokumen.md`.

## Konvensi kode

- Aturan gaya: `.agents/rules/` (keterbacaan, komentar, error-handling, batas file).
- Data: Postgres+Prisma satu-satunya sumber kebenaran; klien akses hanya via
  server function ber-guard (`requireOwner`/`requireKasir`) — lihat `11-tanstack-db.md`.
- Skema DB via Prisma Migrate (`prisma/migrations/`, baseline `20261019000000_baseline`);
  ubah skema → `bun run db:migrate`, deploy → `bun run db:migrate:deploy`.
  `db:push` hanya untuk eksperimen lokal sekali-pakai.
- Error DB mentah DILARANG ke klien; kirim pesan aman + ref log (`05-error-handling.md`).
- Uang rupiah = integer; kolom Decimal(14,2); ID cuid().
- UI: shadcn/ui + Tailwind v4 saja; komponen baru via
  `bunx shadcn@latest add -y <nama>`; file `ui/*` registry yang kena lint WAJIB
  dibetulkan (jangan overwrite buta file yang sudah dibetulkan: button.tsx).
- i18n: tambah key ke `messages/{en,id,zh,ko}.json` (keempatnya!), lalu compile:
  `bunx @inlang/paraglide-js compile --project ./project.inlang --outdir ./src/paraglide`.
- Test: logika murni di `src/server/*.ts` (tanpa createServerFn) agar bisa unit-test;
  wrapper `*Fn.ts` hanya validasi + guard + panggil fungsi murni.
- API: kontrak resmi di `docs/API.md` (dipakai web + Expo). Fitur data baru WAJIB
  lewat endpoint itu; route REST di `src/routes/api/v1/*` hanya guard + envelope.
- Status tugas: update `docs/DAFTAR-TUGAS.md` (centang bila selesai).
- Git/deploy: **jangan commit/push/deploy tanpa perintah eksplisit** — commit
  hanya setelah "ok Commit", push hanya setelah "ok push"; detail di
  `15-git-dan-deploy.md`.

## MCP (agen lintas repo)

`pos-expo` + `pos-backend` (`mcp/server-expo.ts`, `mcp/server-backend.ts`, transport di
`mcp/stdio.ts`, tool berkas di `mcp/repo.ts`) memberi agen akses baca
`docs/**` + `src/**` saat mengembangkan `E:/code/pos_mobile`. Server ketiga,
`pos-mobile` (`mcp/server-mobile.ts`), membaca repo mobile itu sendiri
(`docs/**`, `src/**`, `tests/`, `.agents/`, `AGENTS.md`, `app.json`) lewat tool
`mobile_list_files` / `mobile_read_file` / `mobile_search`; akarnya bisa
diganti dengan env `POS_MOBILE_ROOT`. Transport wajib
satu pesan JSON per baris (standar MCP stdio) — jangan menambahkan header
`Content-Length`; regresi: `bunx vitest run tests/vitest/mcp.test.ts`.
Direktori `./mcp/` dan tes MCP-nya **tidak di-commit** (`.gitignore`) — hanya
ada di mesin developer.

Server tambahan (global, bukan bagian repo): `agentweb` (remote
`https://api.agentweb.live/mcp`, key di `~/.config/opencode/secrets/`).
Hanya 4 tool yang diizinkan lewat `permissions`: `web_search`, `web_fetch`,
`time_now`, `weather_forecast`.
