# WAJIB: HTTP Client & Axios

> Gunakan instance HTTP terpusat dan tangani galat jaringan secara aman.

## Aturan

- **WAJIB** memakai instance `http` atau `httpSoap` dari `#/lib/http` untuk setiap pemanggilan HTTP.
- **DILARANG** menginisialisasi `axios.create()` baru atau memanggil fungsi `axios.get`/`axios.post` langsung secara sporadis di komponen, rute, atau server function tanpa alasan arsitektur terpusat.
- **WAJIB** menangani galat HTTP menggunakan `pesanGalatAxios` dari `#/lib/http` agar tidak membocorkan detail teknis, URL internal, atau kredensial ke antarmuka pengguna.
- **DILARANG** menggunakan `fetch` mentah jika endpoint memerlukan interceptor, batas waktu (timeout 10 detik bawaan), atau penanganan galat terstandar.
- **Batas Server vs Klien**: Pemanggilan HTTP ke API pihak ketiga yang membutuhkan rahasia (token privat, API key vendor absensi, dsb.) **WAJIB** berada di lingkungan server (`src/server/**`), bukan di komponen klien.
