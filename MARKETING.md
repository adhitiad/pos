# MARKETING — POS + Buku Besar untuk UMKM Indonesia

> Dokumen ini adalah bahan baku penjualan: positioning, fitur yang benar-benar ada,
> naskah bicara, dan jawaban atas keraguan calon pembeli.
> Semua klaim di bawah **terverifikasi ke kode** (lihat `docs/API.md` & `docs/DAFTAR-TUGAS.md`).
> Yang belum ada ditandai eksplisit — jangan dijanjikan ke calon pembeli.

---

## 1. Positioning satu kalimat

**POS beropensource yang sudah membawa akuntansi, mode luring, dan siap jadi aplikasi mobile sendiri.**

Alternatif framing per audiens:

| Audiens                       | Cara menjelaskan                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| Pemilik warung kopi           | "Kasir yang catatannya tak hilang, dan stokmu tetap jalan kalau internet mati."           |
| Owner restoran                | "Meja, modifier, dapur, dan buku besar dalam satu sistem."                                |
| Tim yang punya sistem sendiri | "Antrian offline dengan idempotensi: kirim ulang tak pernah jadi dobel."                  |
| Mitra / investor              | "Produk jadi penuh: kontrak REST lengkap, 4 bahasa, 76 endpoint, app Expo tinggal pakai." |

---

## 2. Masalah rutin yang dialami bisnis

1. **Kasir murah = data hilang.** Format CSV, tidak ada jejak siapa ubah harga jam 8 malam.
2. **Internet di warung sering mati.** Transaksi menggantung atau dicatat di kertas, cek ulang manual.
3. **Buku besar disusun manual di akhir bulan.** Laba tidak terlihat harian.
4. **Stok bahan sering meleset.** Resep dihitung manual, opname bulanan, selisih baru ketahuan.
5. **Lisensi kasir = biaya per outlet per tahun**, dan tetap tidak ada aplikasi mobile.
6. **Retur & selisih kas tidak tercatat** → keribuan saat rekap.

---

## 3. Yang kami tawarkan (modul nyata, siap demo)

### 3.1 Kasir

- Transaksi real-time: jumlah, harga, diskon, pajak, split payment (Tunai/QRIS/e-wallet/kartu/transfer).
- Barcode/SKU, pencarian produk, modifier (tingkat gula, topping), catatan per transaksi.
- Struk langsung tampil + cetak ke printer thermal ESC/POS.
- **Tetap jalan saat internet mati** → antrean offline, kirim ulang otomatis, dan **kunci idempotensi** di server sehingga transaksi tidak pernah dobel.

### 3.2 Inventori & bahan baku

- Produk + resep bahan (BOM): penjualan memotong stok produk **dan** bahan sesuai resep.
- Stok minimum + peringatan menipis.
- Pembelian bahan ke supplier, dengan sumber belanja (supplier / pasar online / pasar offline) & catatan hutang.
- **Stok opname**: bandingkan stok sistem vs fisik, koreksi tercatat dengan alasan.

### 3.3 Pelanggan & loyalitas

- Data member, riwayat belanja, poin (1 poin = Rp100), tier otomatis (Bronze/Silver/Gold) + diskon per tier.
- Poin dapat ditukar di kasir dan dipakai otomatis saat pembayaran.

### 3.4 Akuntansi & laporan (bukan sekadar kasir)

- **Buku besar**: jurnal berimbang otomatis tiap transaksi, akun double-entry (Kas, Persediaan, Pendapatan, HPP, Pajak).
- Laporan penjualan, HPP, laba kotor, produk terlaris, performa kasir, rekap pajak PB1 (restoran) & PPN (retail).
- Ekspor **CSV / Excel / PDF** untuk akuntan dan kantor pajak.
- Laporan belanja (per supplier / per pasar) & daftar hutang supplier.

### 3.5 Operasional harian

- **Shift kasir**: buka/tutup kas, catatan kas fisik, selisih kas otomatis.
- **Retur** dengan pembalikan stok & jurnal.
- Dapur (KDS) + meja + modifier untuk mode restoran; pesanan online publik (QRIS/e-wallet).
- Antrean cetak per printer (siap untuk printer Bluetooth di ponsel).

### 3.6 Keamanan & akuntabilitas

- 3 peran: **Owner** (penuh), **Kasir** (transaksi), **Member** (pelanggan).
- **Audit log**: tiap perubahan sensitif (harga, peran, hapus data, pengaturan) tercatat siapa, kapan, dan dari nilai apa ke nilai apa.
- Role bisa dikelola dari halaman **Manajemen User** (bukan hanya dari file env).
- Login Google, tanpa kata sandi yang dibagikan.
- Rate limit, header keamanan, dan log tanpa data pribadi.

---

## 4. Untuk siapa

| Segmen                             | Yang akan langsung terasa                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Warung kopi / kedai (1–3 gerobak)  | Kecepatan kasir, stok bahan akurat, mode luring, biaya lisensi.                                        |
| Restoran / kafe (5–50 kursi)       | Meja + modifier + dapur + pajak PB1 + shift kasir.                                                     |
| Retail / minimarket                | Barcode, stok opname, laporan harian, hak akses karyawan.                                              |
| Franchise / multi-cabang (terbuka) | Satu dasbor, banyak gerobak — **roadmap**, jujur di depan.                                             |
| Tim yang mau app sendiri           | REST API 76 endpoint + auth bearer + kontrak tertulis (`docs/API.md`) + panduan Expo (`docs/EXPO.md`). |

---

## 5. Keunggulan yang TIDAK dimiliki kasir murah

| Aspek                 | Kasir murah / Excel                       | Aplikasi ini                                                                |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| Data & risiko hilang  | File lokal, hilang saat PC rusak          | Postgres terkelola + backup rutin + export kapan saja                       |
| Internet mati         | Transaksi menggantung / dicatat di kertas | Antrean offline, kirim ulang otomatis, **tidak pernah dobel** (idempotensi) |
| Jejak perubahan harga | Tidak ada                                 | Audit log: siapa, kapan, dari nilai apa ke nilai apa                        |
| Stok bahan            | Dihitung manual, sering meleset           | Resep (BOM): penjualan memotong stok bahan otomatis + opname tercatat       |
| Laba                  | Dirakit manual di akhir bulan             | Jurnal berimbang + laba harian real-time + ekspor CSV/Excel/PDF             |
| Pajak                 | Dihitung manual, rawan salah              | PB1 (restoran) & PPN (ritel) dihitung server sesuai pengaturan              |
| Hak akses kasir       | Satu akun untuk semua                     | 3 peran (Owner/Kasir/Member), diatur dari halaman User                      |
| Retur & selisih kas   | Dicatat manual di buku                    | Retur pembalikan stok + jurnal, shift kas dengan selisih otomatis           |
| Bahasa                | English only                              | Indonesia, English, 中文, 한국어                                            |
| Notifikasi            | Tak ada                                   | Lonceng: stok menipis, pendapatan harian, transaksi & pesanan baru          |
| Perangkat             | Desktop/laptop saja                       | Web + API REST lengkap (76 endpoint) → app mobile sendiri siap              |
| Integrasi             | Ekspor manual                             | Kontrak REST tertulis + panduan Expo + auth bearer                          |
| Mode restoran         | Tidak ada                                 | Meja, modifier (tingkat gula/topping), dapur (KDS), pesanan online, PB1     |

> Poin jualan yang jujur: kalau Bu hanya butuh "mencatat penjualan" dan tak pernah
> berbasis, Excel atau kasir gratis sudah cukup. Aplikasi ini baru berbalik di
> bisnis yang **mulai ribet**: bahan, pajak, shift, retur, langganan, dan butuh
> angka harian tanpa alatnya sendiri.

---

## 6. Angka (bisa dipertanggungjawabkan)

| Yang diukur      | Angka                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| Endpoint REST    | 76                                                                                                   |
| Halaman aplikasi | 28 (termasuk kasir, dapur, member, supplier, printer, antrean cetak, laporan, log audit, notifikasi) |
| Unit test        | 214 (41 berkas)                                                                                      |
| Tes e2e          | 45 (termasuk 20 halaman owner diuji dengan sesi login nyata)                                         |
| Bahasa antarmuka | 4 (id, en, zh, ko)                                                                                   |
| Tingkat akses    | 3 (Owner, Kasir, Member)                                                                             |
| Mode F&B         | Meja, modifier, dapur/KDS, pesanan online, PB1                                                       |
| Mode ritel       | Barcode, stok opname, supplier + hutang, PPN, mode luring                                            |

> Angka ini berasal dari repo (bukan klaim pemasaran): `docs/API.md`, `docs/DAFTAR-TUGAS.md`.
> Deploy: Vercel + Postgres terkelola (Neon) → tidak ada server yang harus dirawat sendiri.

---

## 7. Struktur harga

> **Angka di bawah adalah usulan awal** — sesuaikan dengan daya beli pasar & biaya
> hostingmu sebelum dipakai. Semua harga per outlet per bulan, **bukan per transaksi**.

| Paket                      | Harga                                                | Untuk siapa                                      | Yang didapat                                                                                                                                               |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Starter**                | Rp99.000 /bulan (Rp990.000/tahun)                    | 1 outlet, 1 owner, ≤300 produk                   | Kasir, produk & resep bahan, member & poin, stok minimum, laporan penjualan, ekspor CSV/PDF, 1 bahasa (id)                                                 |
| **Pro**                    | Rp249.000 /bulan (Rp2.490.000/tahun)                 | 1 outlet, beberapa kasir                         | Semua Starter + mode luring (antrean), shift kasir, retur, stok opname, supplier & hutang, pajak PB1/PPN, printer ESC/POS, log audit, 4 bahasa, notifikasi |
| **Enterprise / Self-host** | Rp1.500.000 /bulan per outlet, min. 1 tahun (custom) | Brand multi-outlet, butuh data di server sendiri | Semua Pro + API penuh, app mobile kustom, pendampingan onboarding, SLA & backup, ekspor data penuh, harga custom                                           |
| **Lisensi app mobile**     | Rp2.500.000 /tahun per brand                         | Pelanggan Pro/Enterprise                         | Aplikasi kasir iOS/Android dengan nama & logo sendiri (backend tetap milik kami)                                                                           |

**Catatan komersial:**

- Diskon tahunan: 2 bulan gratis (sudah terlihat di tabel).
- Biaya tambahan yang wajar: migrasi data lama (sekali bayar), printer/tablet, pelatihan onsite, hosting dedicated (dihitung terpisah).
- Jaminan trial: 14 hari penuh, tanpa kartu kredit.
- Harga awal mengunci selama 12 bulan pertama; kenaikan berikutnya diinformasikan 60 hari sebelumnya.

> Rekomendasi: jangan harga per transaksi. Harga per outlet per bulan bisa diprediksi
> pemilik dan terasa "tetap" — bukan seperti biaya silang.

---

## 8. Naskah penjualan

### 8.1 Elevator pitch 15 detik (pembuka singkat)

> "POS yang juga buku besarnya, Pak. Stok bahan kehitung sendiri dari resep."

### 8.2 Elevator pitch 30 detik

> "Bu, ini kasir yang punya buku besar. Jualannya tercatat, HPP-nya kehitung dari resep bahan, catatan kasirnya ada, dan kalau internet mati tetap jalan. Nanti kalau mau, app Android-nya pun bisa kami buat dengan nama toko Bu."

### 8.3 Versi 60 detik (grup chat/media sosial)

> "Selamat pagi. Saya tunjukkan sistem kasir untuk warung/kedai. Yang berbeda dari kasir biasa: bukan cuma jual, tapi stok bahan ikut berkurang sesuai resep, laba harian kelihatan, dan semua kasir yang akses bisa dilacak.
>
> Kalau Wi-Fi mati, kasirnya tetap jalan — nanti terkirim sendiri begitu online lagi, dan tidak akan jadi dobel.
>
> Ada 4 bahasa, jadi kalau ada karyawan dari luar, mereka bisa pakai Mandarin atau Korea.
>
> Harganya per bulan per outlet, bukan per transaksi. Mau saya kirim tautan demo-nya? [Demo 10 menit]"

### 8.4 Pertanyaan diagnosis (SEBELUM demo, 3–5 menit)

Buat calon pembeli bicara dulu, jangan langsung demo:

1. "Sekarang pencatatan penjualan Bu pakai apa — kertas, Excel, atau kasir di HP?"
2. "Kalau mau tahu laba harian, biasanya Bu cek ke mana?"
3. "Stok bahan pernah habis atau meleset? Terus detailnya dicek kapan?"
4. "Kalau ada kasir yang salah set harga, biasanya baru ketahuan kapan?"
5. "Wi-Fi di toko ini sering mati?"
6. "Kalau ada 2–3 kasir, mereka semua bisa lihat omzet harian atau per orang?"

> Kalau jawaban 1–4 "manual/kertas" → kecocokan tinggi (prioritas utama). Jawaban "tidak pernah" → jangan tawarkan HPP; tawarkan yang relevan saja.

### 8.5 Pertanyaan penutup (pilih 1)

- "Kalau butuh aplikasi di HP dengan nama toko sendiri, berapa lama kira-kira?"
- "Bisa lihat laba harian dari HP, bukan cuma dari komputer?"
- "Kalau Wi-Fi-nya mati, kasirnya masih bisa jualan?"

### 8.6 Demo 5 menit (checklist)

1. (2 menit) Kasir: cari produk → tambah → ganti metode bayar → simulasi kembalian → cetak struk.
2. (1 menit) Laporan: buka laba hari ini → ekspor PDF → tunjukkan HPP dari resep.
3. (1 menit) Luring: matikan internet → buat transaksi → nyalakan → tunjukkan antrean terkirim & stok benar.
4. (1 menit) Kontrol: ubah harga produk → buka Log Audit → tunjukkan siapa & kapan.

### 8.7 Demo 10 menit (calon pembeli serius)

Tambah: mode restoran (meja + modifier + dapur), shift kasir buka/tutup + selisih, stok opname, ekspor laporan, dan hak akses kasir. Tutup dengan janji hal konkret: "ini yang dipakai tim Bu mulai hari Senin."

### 8.8 Email (pertama)

> **Subjek:** Kasir + buku besar untuk [NAMA TOKO], siap minggu ini
>
> Halo [NAMA],
>
> Saya lihat [NAMA TOKO] melayani 80+ pelanggan sehari. Yang biasanya jadi masalah: stok bahan sering tidak akurat, dan rekap laba baru kelihatan saat tutup toko.
>
> Saya punya sistem kasir yang sudah membawa buku besar: penjualan langsung memotong stok bahan sesuai resep, laba harian kelihatan, dan tiap kasir yang akses bisa dilacak. Kalau internet mati, kasir tetap jalan dan otomatis terkirim begitu nyala lagi.
>
> Saya kirim video 3 menit yang nunjukin alurnya — mau dilihat?
>
> [Nama] · [no HP]

### 8.9 Follow-up (3 sentuhan, bukan spam)

| Hari | Isi                                                                                                                         |
| ---- | --------------------------------------------------------------------------------------------------------------------------- |
| H+1  | Kirim video 3 menit (kasir → laporan → luring). Satu kalimat ajakan: "Nanti sore saya sambung buat demo 10 menit, boleh?"   |
| H+3  | Kirim satu hasil nyata: "Ini laporan laba harian dari toko yang pakai sistem ini." (tanpa data pelanggan)                   |
| H+7  | Tutup dengan sopan: "Kalau [TOKO] belum jadi, saya tidak disturb lagi. Kalau mau, saya kirim 1 halaman ringkasan fiturnya." |

> Aturan: maksimal 3 follow-up. Setelah itu hentikan — hubungan tetap karena produknya cocok.

### 8.10 WhatsApp (personal, singkat)

> "Halo Pak/Bu [NAMA], saya [NAMA] dari [SUMBER]. Saya bikin sistem kasir + pembukuan untuk toko kuliner/ritel. Bedanya sama kasir biasa: stok bahan kehitung dari resep, laba harian kelihatan, dan tetap jalan kalau internet mati. Kalau mau, saya tunjukkan 3 menit lewat video. Boleh?"

---

## 9. Jawaban atas keraguan (objection handling)

| Keraguan                                | Jawaban (jujur & pendek)                                                                                                                                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Kan sudah ada kasir gratis."           | "Betul, dan kasir gratis cukup buat nyatet penjualan. Yang belum ada: stok bahan dari resep, buku besar, jejak audit, dan mode luring yang aman. Kalau butuh 4 hal itu, kasir gratis jadi mahal di ujung." |
| "Internet di tempat saya sering mati."  | "Karena itu mode luringnya jadi fitur inti, bukan tambahan. Antreannya disimpan di perangkat dan dikirim ulang otomatis; server memakai kunci idempotensi sehingga transaksi tidak pernah dobel."          |
| "Ribet belajar sistem baru."            | "Kasirnya mirip kasir biasa; yang beda cuma tambahan menu laporan. Kasir cukup punya 1 tingkat akses, jadi tak banyak yang harus dikuasai. Onboarding kami 1 jam."                                         |
| "Sudah pakai kasir X / GoBiz / Gapura." | "Bisa dipakai berdampingan dulu, atau data lama kami migrasikan. Yang paling sering jadi masalah di sistem lama: laporan tak nyambung dan tidak ada jejak perubahan."                                      |
| "Stok bahan masih manual."              | "Justru itu yang hilang: begitu resep diisi, penjualan otomatis memotong bahan. Tinggal opname berkala untuk cek fisik."                                                                                   |
| "Punya app sendiri, kok."               | "Bisa. Kontrak REST-nya lengkap plus panduan integrasi, jadi app Android/iOS dengan nama toko sendiri realistis, bukan proyek dadakan."                                                                    |
| "Multi-outlet belum ya?"                | "Belum — roadmap. Satu dasbor dulu, jangan menjanjikan yang belum ada."                                                                                                                                    |
| "Integrasi SRI/e-faktur sudah?"         | "Belum. Yang ada: rekap pajak (PB1/PPN) + ekspor PDF/CSV/Excel untuk diunggah atau diserahkan ke akuntan."                                                                                                 |
| "Printer saya jenis X bisa?"            | "Printer thermal 58mm ESC/POS aman, sudah ada antrean cetak per printer. Untuk printer biasa perlu adapter; kami uji dulu tipenya."                                                                        |
| "Biaya hosting-nya?"                    | "Bisa self-host di hosting Bu sendiri (Vercel + database terkelola). Kalau mau, kami yang kelola."                                                                                                         |
| "Data saya aman?"                       | "Semua mutasi sensitif tercatat di log audit, akses dibatasi per peran, backup rutin. Untuk data pribadi sensitif, bisa di-host di server sendiri."                                                        |
| "Kalau tidak dipakai, how?"             | "Tidak ada biaya berhenti mendadak: data tetap bisa diekspor kapan saja (CSV/Excel), jadi tidak terkunci."                                                                                                 |
| "Bisa refund kalau tidak cocok?"        | "Bisa, sesuai kebijakan yang kita sepakati di kontrak. Yang paling sering dikembalikan: ternyata fitur yang dipakai tak sesuai kebutuhan."                                                                 |
| "Siapa yang sokong kalau ada masalah?"  | "Ada **[nomor WhatsApp support]** pada jam kerja + akses ke log audit untuk menelusuri. Untuk paket Enterprise ada SLA."                                                                                   |
| "Bisa dilatih karyawannya?"             | "Bisa. Kasir cukup 1 jam: bikin produk, buka shift, jualan, tutup shift. Sisanya (laporan, pengaturan) ikut Bu."                                                                                           |

> Cara menjawab: acknowledge dulu, baru jawab singkat dengan fakta, lalu tawarkan demo.
> Jangan membela diri panjang — calon pembeli butuh contoh nyata, bukan argumen.

---

## 10. Apa yang BELUM ada (jangan dijanjikan)

| Belum ada                                                                | Yang bisa ditawarkan sebagai gantinya                                                                                              |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Multi-outlet / multi-cabang                                              | Satu outlet dulu dengan data rapi; roadmap sedang dikerjakan                                                                       |
| Integrasi eksternal (marketplace, food delivery, akuntansi pihak ketiga) | Ekspor CSV/Excel/PDF + REST API untuk integrasi sendiri                                                                            |
| Faktur pajak elektronik (SRI) dan e-faktur                               | Rekap PB1/PPN + ekspor PDF/CSV/Excel untuk diunggah atau diserahkan ke akuntan                                                     |
| Printer non-ESC/POS dan integrasi vendor kasir lain                      | Antrean cetak per printer ESC/POS (thermal 58mm)                                                                                   |
| Loyalty berjenjang dengan voucher dinamis                                | Tier member otomatis (Bronze/Silver/Gold) + diskon per tier + tukar poin                                                           |
| Notifikasi WhatsApp/email ke pelanggan                                   | Notifikasi di dalam aplikasi (stok menipis, pendapatan harian, pesanan baru) + lonceng                                             |
| Pembayaran otomatis (QRIS dinamis)                                       | Pencatatan semua metode (QRIS/e-wallet/kartu/transfer/tunai) + split payment; integrasi payment gateway & invoice elektronik belum |

> Aturan: kalau ditanya fitur yang belum ada, jawab jujur + tunjukkan yang paling
> mendekati. Janji yang meleset jauh lebih mahal daripada fitur yang hilang.

---

## 11. Langkah berikutnya (checklist tim)

| #   | Task                                                                              | Estimasi            | Selesai |
| --- | --------------------------------------------------------------------------------- | ------------------- | ------- |
| 1   | Finalisasi harga §7 + nama paket                                                  | 1 hari              | ☐       |
| 2   | Siapkan demo environment (≥30 produk, 3 kasir, 1 bulan transaksi) + domain & logo | 2 hari              | ☐       |
| 3   | Rekam video demo 3 menit (kasir → laporan → luring → audit)                       | 1 hari              | ☐       |
| 4   | Halaman harga & halaman "Fitur" di web (isi dari §3)                              | 1 hari              | ☐       |
| 5   | 1 FAQ publik + 1 template kontrak (PDF)                                           | 1 hari              | ☐       |
| 6   | Daftar target: 20 warung kopi + 10 kedai + 5 restoran di 1 kota                   | 2 hari              | ☐       |
| 7   | 10 demo langsung (pakai checklist demo §8)                                        | 2 minggu            | ☐       |
| 8   | Ukur konversi demo → trial → aktif bulanan; target setup ≤ 30 menit               | ongoing             | ☐       |
| 9   | Isi FAQ: garansi, dukungan, jam operasional, refund                               | 1 hari              | ☐       |
| 10  | Siapkan 1 kasus sukses & 1 testimonial (dengan izin)                              | setelah 3 pelanggan | ☐       |

---

## 12. Ringkasan positioning (3 versi siap tempel)

**Versi panjang (untuk proposal PDF):**

> Untuk warung, kedai, dan restoran yang sudah jalan dan mulai ribet dengan pembukuan:
> POS + buku besar dalam satu sistem. Stok bahan mengikuti resep, laba harian kelihatan,
> kas tetap jalan saat internet mati, dan setiap kasir yang akses bisa dilacak.
> Multi-bahasa, aplikasi mobile sendiri, tanpa biaya per transaksi.

**Versi pendek (untuk bio, proposal email, footer web):**

> Kasir + buku besar dalam satu sistem. Stok bahan ikut berkurang sesuai resep, laba
> harian kelihatan, dan tetap jalan saat internet mati.

**Versi satu kalimat (untuk Kenal-kenalan, kartu nama, voice note):**

> POS yang bawa buku besarnya, dan tetap jalan saat internet mati.

---

## 13. Pesan siap tempel per kanal

| Kanal                       | Teks                                                                                                                                                                                                                        |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Judul landing page          | "Kasir yang bawa buku besarnya"                                                                                                                                                                                             |
| Sub-judul                   | "Stok bahan mengikuti resep, laba harian kelihatan, dan tetap jalan saat internet mati. Multi-bahasa, siap jadi aplikasi mobile sendiri."                                                                                   |
| Meta description            | "POS + buku besar untuk warung, kedai, dan restoran. Stok bahan otomatis dari resep, laporan laba harian, mode luring aman, 4 bahasa."                                                                                      |
| Caption IG/TikTok (versi 1) | "Punya warung kopi? Stok bahan manual itu bikin dua kerugian: salah pesan, dan bahan yang sebenarnya tidak ketemu. Di sistem ini penjualan otomatis memotong stok bahan sesuai resep, jadi laba harian langsung kelihatan." |
| Caption IG/TikTok (versi 2) | "Internet mati bukan alasan berhenti jualan. Antrean transaksi tersimpan di perangkat, dikirim ulang begitu online lagi, dan tidak pernah jadi dobel."                                                                      |
| Headline iklan              | "Berhenti menghitung stok di kepala"                                                                                                                                                                                        |
| Sub-headline iklan          | "Mulai Rp99.000/bulan per outlet. Kasir + buku besar + mode luring."                                                                                                                                                        |
