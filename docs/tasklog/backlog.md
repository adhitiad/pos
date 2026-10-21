# Backlog & Task List

<|start|> # | ID | Task | Status | Priority |
|---|----|------|--------|----------|
| 1 | POS-11 | Setup Google OAuth + fill OWNER_EMAILS | 🚫 Blocked | High |
| 2 | POS-13 | Product CRUD (OWNER) | 📋 Pending | High |
| 3 | POS-14 | Member CRUD (OWNER) | 📋 Pending | High |
| 4 | POS-15 | Stock alert bahan minimum | 📋 Pending | Medium |
| 5 | POS-16 | Slip printer / PDF | 📋 Pending | Medium |
| 6 | POS-17 | Cross-platform sign-in | 📋 Pending | Low |
| 7 | POS-18 | Migrate eslint config to .ts | 📋 Pending | Low |
| 8 | POS-19 | Vitest e2e tests | 📋 Pending | Medium |
| 9 | POS-20 | Document API server functions | 📋 Pending | Low |

Updated ongoing: total tasks 9.

### Detail POS-17 — Cross-platform sign-in (opsional, low)

- Rencana: `docs/POS-17-cross-platform-signin.md`
- Endpoint: `POST /api/auth/sign-in/social` (exchange Google idToken → sesi cookie Better Auth)
- Status: Belum mulai. Menunggu kredensial Google OAuth dari POS-11 (owner action di Google Cloud Console).
- File target: `src/server/auth-social.ts`, `src/routes/api/v1/auth-social.ts`, (opsional) `src/server/auth-socialFn.ts`
