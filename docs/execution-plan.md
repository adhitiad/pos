# Execution Plan — POS sampai selesai

> Urutan kerja. Jangan loncat: tiap phase mempersyaratkan phase sebelumnya dinyatakan **DONE** + verifikasi (`bunx --bun tsc --noEmit && bun run lint && bun --bun run build`).

## Phase 0 — Environment (owner) **DONE partial**

- [x] Local PostgreSQL `pos` + `.env.local` DATABASE_URL
- [ ] Create OAuth 2.0 client di Google Cloud Console
- [ ] Redirect URI: `http://localhost:3000/api/auth/callback/google`
- [ ] Tulis `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` di `.env.local`
- [ ] Set `OWNER_EMAILS="email-gmail-yang-dipakai-owner"`
- Verification: login dengan Google → session menampilkan avatar & role; hanya owner bisa `/buku-besar`.

## Phase 1 — Katalog produk (OWNER only)

- [ ] Migrasi `schema.prisma` — tidak ada perubahan (Produk/Kategori/Bahan sudah ada)
- [ ] Tambah `src/server/produk.ts`: `list`, `create`, `update`, `toggleAktif`, `delete` (only OWNER)
- [ ] Server functions `src/server/produkFn.ts`
- [ ] Halaman `/produk`: TanStack Table v9 + shadcn Table, shadcn Form (react-form)
- [ ] Pola input: ID via cuid auto, nama, SKU, harga, stok, kategori (Select), aktif (Switch)
- Verification: `src/routes/produk.tsx` grid mobile ≤ sm stack, tombol tap 44×44.

## Phase 2 — Member & loyalitas

- [ ] `src/server/member.ts` + `/member`: list + phone search + point adjust
- [ ] Integrasi ke kasir (sudah ada via `kasirData`)
- [ ] Kasir `/member` URL shareable.

## Phase 3 — Bahan & alert stok

- [ ] Halaman `/bahan`: table + badge `stok <= stokMinimum` warna destructive
- [ ] Sync kupon pesanan bahan (formula order) — future.

## Phase 4 — Slip POS

- [ ] `window.print()` pada struk sukses (CSS `@media print`).
- [ ] Optional PDF `@react-pdf/renderer`.

## Phase 5 — Tests

- [ ] Vitest setup + test postingTransaksi (happy-path, stok kurang → rollback)
- [ ] Test jurnal balance helper.

## Phase 6 — API docs & deploy

- [ ] `/docs/api.md`: catalog server functions + ports + env.
- [ ] Vercel env mapping + deployment.

## Phase 7 — Polish mobile

- [ ] `@media print` + brand logo.
- [ ] Kasir offline (IndexedDB), jurnal deferred.

## Rollback per phase

- Stuck RUN: `git stash`; `bun run db:push --help` → re-migrate.

## Progress log

- 2026-10-16 Phase 0 in progress (Google OAuth pending).
- 2026-10-16 Phase 1-7 pending.
