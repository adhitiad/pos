# POS — Task Log & Roadmap

> Dokumen tunggal daftar pekerjaan (done / ongoing / next). Update saat rencana berubah.
> Task ID prefix `POS-N`.

## Conventions

- Status: `✅ Done` · `🛠 In progress` · `📋 Pending` · `🚫 Blocked` · `⏸ On hold`
- Owner default: main.
- Verifikasi: `bun --bun run build`, `bunx --bun tsc --noEmit`, `bun run lint`.

---

## ✅ DONE

### POS-1 Fundament

- Scaffold TanStack Start (React, file-router, bun) + ESLint/Tailwind4/Shadcn/T3Env
- Fix `bun install` EBUSY; build passes.
- Intent restored via `@tanstack/intent` dev dep.

### POS-2 Database — master & transaksi

- Schema `prisma/schema.prisma`: User/Session/Account/Verification, Kategori, Bahan, Produk, ProdukBahan (BOM), Member, Delivery, Transaksi, TransaksiItem.
- `db:push`, `db:generate`, `db:seed` sukses; DB lokal `pos`.
- Harga pakai Decimal(14,2); ID pakai cuid.

### POS-3 Buku besar

- `Akun`, `Jurnal`, `JurnalDetail`, enum `TipeAkun`.
- Seed 7 CoA: Kas, Persediaan Bahan, Pajak Keluaran, Modal, Pendapatan Penjualan, Pendapatan Jasa Antar, HPP.

### POS-4 Posting transaksi atomik

- `src/server/transaksi.ts` `postingTransaksi` — validasi stok, decrement, jurnal berimbang, poin 1/10.000.
- `postingTransaksiFn` guarded kasir.
- Uji nyata: total 44.000, arus berimbang 44.075, stok kopi 5000→4942, poin 4.

### POS-5 Auth Google-only

- `better-auth` configured with `prismaAdapter`; email/password off; Google social only.
- `.env.local`: generated `BETTER_AUTH_SECRET`, placeholder `GOOGLE_CLIENT_ID/SECRET`, `OWNER_EMAILS`.

### POS-6 Role enum OWNER/KASIR/MEMBER

- `enum Role` added, `User.role Role @default(MEMBER)`.
- `requirePeran/requireKasir/requireOwner` guards.
- Owner enrollment via `OWNER_EMAILS` env on `user.create.before` hook.
- `/kasir` for OWNER/KASIR; `/buku-besar` only for OWNER.

### POS-7 i18n

- Paraglide locales `en, id, zh, ko` (de dropped). `messages/*.json` + regenerated `src/paraglide`.
- Locale switcher shows 4 locales.

### POS-8 Akses laporan

- `Buku-besar`: trial balance + journal entries dengan saldo running (overflow-x-auto mobile).

### POS-9 Mobile reflow Kasir

- Product grid `sm:grid-cols-2`, tap targets 44×44.
- Form + cart panels; overflow containted to scrolling.

### POS-10 Verifikasi build

- `tsc --noEmit ✅`, lint ✅, `vite build ✅`.

### POS-11 Setup Google OAuth (Owner) — panduan di `docs/setup-google-oauth.md`

- Wiring terbukti: `GET /api/auth/get-session` → 200 null; `POST sign-in/social` → 500 CLIENT_ID (provider terdaftar, tinggal isi kredensial).
- Endpoint sesi yang benar: `/get-session` (bukan `/session`).

### POS-12 Katalog produk (OWNER) — DONE

- `src/server/produk.ts` + `produkFn.ts`: CRUD produk (incl. resep/BOM), toggle aktif, hapus (riwayat item aman via SetNull), CRUD kategori (hapus dijaga bila dipakai).
- `/produk`: TanStack Table v9 (`useTable` + `FlexRender`), cari client-side, form TanStack Form + Switch, resep dinamis, hapus 2-langkah, i18n 4 bahasa (±26 key).
- Guard anti-loop: MEMBER → `/`, KASIR tanpa akses → `/kasir`; link home disesuaikan peran.
- Uji DB nyata: create/update/toggle/SKU ganda/ kategori-berisi — semua sesuai ekspektasi, DB bersih kembali.

---

## 🛠 IN PROGRESS

(none right now, all done)

---

## 📋 NEXT (priority order)

### POS-11 Setup Google OAuth (Owner) — 🚫 Blocked on Google Console

- Steps:
  1. Google Cloud Console → APIs & Services → Credentials → OAuth client ID → Web.
  2. Add redirect URIs: `http://localhost:3000/api/auth/callback/google`, plus production.
  3. Copy Client ID & Secret into `.env.local`.
  4. Set `OWNER_EMAILS="your-owner@email.com"` (email Google yang dipakai owner).
- Verification: login → `/login` (UI Google button) → `/kasir` shows session avatar + sign out.

### POS-12 Rename rute klien / UX (Owner) — Preview

- Carian: redirect `/` → `/kasir` for logged-in users? (currently lands on Home menu). Keep manual.

### POS-13 Empty product data — Profile add-on (Owner) — Preview

- Add product CRUD page: `/produk` managed by OWNER only.
- POST endpoint `/api/produk` guarded.
- Use `@tanstack/react-table` v9 + shadcn Table; form via `@tanstack/react-form`.

### POS-14 Member CRUD (Owner) — Preview

- `/member` route; phone search; point redemption.

### POS-15 Stock alert (bahan kurang minimum) (Owner) — Preview

- `stok <= stokMinimum` badge; list on `/bahan`.

### POS-16 Kasir offline / QR printing (Owner) — Preview

- Slip printer / PDF download; print with `window.print()`.

### POS-17 Cross-platform (iOS/Android sign-in) — Preview

- Optional Google Client ID array per platform.

### POS-18 ESLint config TS — migrate from `.js` to `.ts` after upgrade to ESLint 10 — Preview

- Re-evaluate.

### POS-19 CI / tests — Preview

- Add Vitest e2e tests: posting transaksi, jurnal balance.

### POS-20 Docs update on API — Preview

- Every server fn and table documented under `docs/api.md`.

---

## 📌 Quick Reference

- DB: `postgresql://postgres:postgres@localhost:5432/pos`
- Dev: `bun --bun run dev` (port 3000)
- Build: `bun --bun run build`
- Generations: `bun run generate-routes`
- Drift fix: `bunx --bun tsc --noEmit && bun run lint`
- Seed reset: `bun run db:seed` (runs with fresh data).

---

## Changelog

- 2026-10-16 Initial scaffold + POS suite.
- 2026-10-16 Auth Google-only + Role + Mobile.
