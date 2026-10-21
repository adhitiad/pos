# WAJIB: Bun & Bunx

> Berlaku untuk SEMUA perintah di repo ini. Tidak ada pengecualian.

## Aturan

- **WAJIB** memakai `bun` untuk install dan menjalankan script: `bun install`, `bun --bun run dev`, `bun --bun run build`, dst.
- **WAJIB** memakai `bunx` untuk tool sekali-pakai (`tsc`, `prettier`, `vitest`, `prisma`, `shadcn`, dsb).
- **DILARANG** memakai `npm`, `npx`, `yarn`, maupun `pnpm` dalam perintah apapun. Jika sebuah dokumen (termasuk `README.md` generik bawaan template) menyuruh `pnpm`/`npm`, terjemahkan ke padanan `bun`/`bunx`-nya.

## Padanan perintah

| Jangan                              | Lakukan                         |
| ----------------------------------- | ------------------------------- |
| `npm run dev` / `pnpm dev`          | `bun --bun run dev`             |
| `npx tsc --noEmit`                  | `bunx tsc --noEmit`             |
| `npx prettier --check .`            | `bunx prettier --check .`       |
| `pnpm dlx shadcn@latest add <nama>` | `bunx shadcn@latest add <nama>` |

## Catatan repo

- Script DB (`db:generate`, `db:push`, `db:migrate`, `db:studio`, `db:seed`) sudah membungkus `dotenv -e .env.local -- prisma ...` — tetap jalankan lewat `bun --bun run db:*`, jangan panggil `prisma` langsung tanpa dotenv.
