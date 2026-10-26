# FIT-02 — Offline-first Expo (store lokal & sinkron)

> Status: kontrak backend siap (`idempotencyKey`, `dibuatOffline`, `waktuKlien`);
> yang belum: sisi mobile (SQLite / WatermelonDB / AsyncStorage + antrean + retry).
> Repo backend (`E:\code\pos`) tidak memuat klien Expo; dokumen ini arsitektur
> sisi mobile yang harus dibangun di `pos_mobile`.

## 1. Kontrak server yang sudah siap (tanpa perubahan)

- `POST /api/v1/transaksi` menerima `idempotencyKey` (8–64), `dibuatOffline` (bool),
  `waktuKlien` (ISO-8601, ±24 jam dari server). Replay sama = `replay: true` tanpa
  potong stok / jurnal ganda (`SEC-21`, `MOBIL-02`).
- `Transaksi.idempotencyKey` unik; `dibuatOffline` dan `waktuKlien` tersimpan.
- `outbox.ts` (web) sudah punya pola: antrean lokal → kirim saat online → hapus.

## 2. Arsitektur sisi mobile (disarankan)

| Lapisan          | Teknologi                                                | Peran                                                                                                                                          |
| ---------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Store lokal      | **WatermelonDB**                                         | Sinkronisasi offline-first dengan SQLite native; relasi `Transaksi`, `Item`, `Pembayaran`; sync via `sync` adapter ke `POST /api/v1/transaksi` |
| Antrean (outbox) | WatermelonDB `outbox` table atau `AsyncStorage` kerangka | Menyimpan `idempotencyKey` + payload JSON saat offline; kirim ulang saat `NetInfo` = online                                                    |
| Konfirmasi       | `expo-network` / `expo-sqlite`                           | Deteksi koneksi; trigger retry dengan exponential backoff (max 5x)                                                                             |
| Konflik/retry    | `idempotencyKey` stabil                                  | Client buat kunci dari `transaksiId` lokal atau hash payload; server mengembalikan transaksi sama (tidak dobel stok)                           |
| Token sesi       | `expo-secure-store`                                      | Bearer token disimpan di keystore OS (iOS Keychain / Android Keystore); **tidak** `AsyncStorage`/`localStorage` (`FIT-04`, `SEC-25`)           |
| Printer          | `expo-bluetooth` / `expo-usb`                            | PrintJob dibuat dulu (`POST /api/v1/percetakan`); `struk` wajib (`FIT-01`) sebelum `statusPesanan = LUNAS`                                     |

## 3. Alur sinkron (contoh)

```
1. Kasir input transaksi di app (offline / koneksi lemah)
2. WatermelonDB menyimpan ke SQLite lokal + menulis ke `outbox`
3. App panggil `POST /api/v1/transaksi` dengan `idempotencyKey`
4. Server: replay? → kembalikan `replay: true`; baru? → buat transaksi + jurnal
5. Sukses → hapus baris `outbox`; gagal (5xx / timeout) → biarkan; retry otomatis
6. Saat `dibuatOffline = true`, `waktuKlien` wajib; server tolak jika > ±24 jam
```

## 4. Yang harus dibangun di `pos_mobile` (bukan repo ini)

- [ ] Schema WatermelonDB: `Transaksi`, `TransaksiItem`, `Pembayaran`, `Outbox`
- [ ] Adapter sync ke `POST /api/v1/transaksi` (menggunakan `idempotencyKey`)
- [ ] Handler `NetInfo` + retry dengan backoff
- [ ] UI: indikator `offline` + antrean belum terkirim + tombol "kirim ulang"
- [ ] Tests: replay idempoten, konflik waktuKlien ekstrem, retry setelah 5xx

## 5. Referensi kode backend (repo ini)

- `src/lib/outbox.ts` — pola outbox web (bisa dijadikan acuan adapter mobile)
- `src/validations/transaksi.ts` — `PostingTransaksiSchema` (idempotensi, waktuKlien)
- `src/server/transaksiIdempotensi.ts` — `muatReplayByKey`
- `docs/API.md` § `PostingTransaksi` — kontrak DTO lengkap
- `docs/EXPO.md` § 8 — daftar yang belum ada (printer Bluetooth, notifikasi push)
