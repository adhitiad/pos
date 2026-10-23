# Setup GitHub — Issues, Project, dan Keamanan

Dokumen ini dijalankan **setelah CICD-01** (repo punya commit, remote `origin`,
dan sudah di-push). Sebelum itu, perintah `gh repo view` akan gagal.

## 1. Scope project

```bash
gh auth refresh -h github.com -s project
```

Scope `project` dibutuhkan untuk membuat/mengubah GitHub Project. Tanpa scope ini
`gh project ...` akan gagal.

## 2. Label standar

Jalankan workflow sekali dari tab **Actions → Sync labels → Run workflow**,
atau:

```bash
gh workflow run labels.yml
```

Label dibuat/diperbarui: `type:*`, `priority:P0–P3`, `area:auth|db|printer|ui|ci`,
dan `needs:triage`.

## 3. Tautan pelaporan keamanan

`.github/ISSUE_TEMPLATE/config.yml` masih memakai placeholder `OWNER/REPO`.
Isi otomatis dari remote:

```bash
bun run scripts/siapkan-github.ts --config-only
```

Perintah ini hanya mengganti placeholder; tidak membuat issue.

## 4. Project board

```bash
gh project create --owner @me --title "POS Roadmap"
```

Catat nomor project dari output, lalu buat field:

```bash
gh project field-create <nomor> --owner @me --name "Priority" \
  --data-type SINGLE_SELECT --single-select-options "P0,P1,P2,P3"

gh project field-create <nomor> --owner @me --name "Area" \
  --data-type SINGLE_SELECT --single-select-options "auth,db,printer,ui,ci"

gh project field-create <nomor> --owner @me --name "Estimate" \
  --data-type NUMBER

gh project link <nomor> --owner @me
```

Kolom status default GitHub adalah `Todo / In Progress / Done`. Ubah lewat
**Project → Settings → Status** menjadi `Backlog / Ready / In Progress / Review / Done`
(opsi field tidak dapat diubah lewat `gh` versi ini).

## 5. Issue dari daftar tugas

Pratinjau tanpa menulis apa pun:

```bash
bun run scripts/siapkan-github.ts --dry-run
```

Buat issue dari semua item `[ ]` di `docs/DAFTAR-TUGAS.md`, lalu masukkan ke
project:

```bash
bun run scripts/siapkan-github.ts --project <nomor> --owner @me
```

Skrip melewati judul yang sudah ada, memakai label sesuai prefix
(`PRN-SEC` → security/printer/P1, `PRN-PERF`/`PRN-FEAT` → P2, `CICD-16` →
security/P1, sisanya chore/CI/P2). `DAFTAR-TUGAS.md` tetap sumber kebenaran.

## 6. Keamanan repo (CICD-16)

Setelah repo ada, aktifkan alerts dan automated security fixes:

```bash
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
gh api -X PUT "repos/$REPO/vulnerability-alerts"
gh api -X PUT "repos/$REPO/automated-security-fixes"
```

Private vulnerability reporting tidak selalu tersedia untuk setiap repo/plan.
Endpoint `repos/$REPO/private-vulnerability-reporting` mengembalikan `404` pada
verifikasi repo `adhitiad/pos` tanggal 2026-10-22; jangan menafsirkan respons ini
sebagai aktif. Periksa **Settings → Code security** di UI bila ingin menguji
ketersediaan kembali. Selama belum tersedia, ikuti fallback di `SECURITY.md`.
Workflow `.github/workflows/dependency-review.yml` otomatis meninjau dependency
pada PR dan menggagalkan temuan severity `high` ke atas.

## 7. Proteksi branch (CICD-02)

Di **Settings → Rules → Rulesets** (atau Branches):

- target `main`;
- wajib pull request sebelum merge;
- required checks: `Typecheck · Lint · Format · Build`, `Unit test (Postgres)`,
  `End-to-end Playwright test`;
- larang force-push dan penghapusan branch;
- minimal 1 approval.

Cek nama job persis dari run CI pertama; required check harus memakai nama itu.
