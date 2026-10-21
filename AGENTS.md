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
bun run test               # vitest (unit, tests/*.test.ts)
bun run test:e2e            # playwright (tests/e2e/*.spec.ts, chromium)
bunx tsc --noEmit          # typecheck
```

## Gate definisi-selesai

Setiap perubahan kode WAJIB lolos ketiganya: `tsc --noEmit`, `lint`, `build`.
Uji DB manual pakai skrip sekali-pakai di `C:\Users\humas\AppData\Local\Temp\opencode\`,
impor absolut (`E:/code/pos/src/...`), jalankan via
`bunx dotenv run -f .env.local -- bun <skrip>` — lalu `db:seed` untuk reset.

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
