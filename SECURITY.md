# Kebijakan Keamanan

## Versi yang didukung

Perbaikan keamanan diterapkan ke branch `main` dan deployment produksi terbaru.
Tidak ada dukungan untuk versi lama atau deployment yang sudah digantikan.

## Melaporkan kerentanan

**Jangan membuka issue publik untuk kerentanan keamanan.**

Private Vulnerability Reporting GitHub saat ini belum tersedia/terkonfirmasi
untuk repo ini (endpoint pengaturan mengembalikan `404` pada 2026-10-22).
Sebelum mengirim laporan, pastikan tombol **Report a vulnerability** memang
tersedia di tab **Security**. Jika tidak, hubungi maintainer melalui kanal
pribadi yang sudah diketahui dan minta kanal pelaporan aman; jangan mengirim
detail eksploitasi melalui issue, diskusi, atau kanal publik.

Sertakan:

- deskripsi dampak dan komponen yang terdampak;
- langkah reproduksi atau proof-of-concept yang aman;
- versi/commit dan lingkungan (lokal, preview, produksi);
- saran perbaikan bila ada.

Jangan menyertakan data pelanggan, kredensial, atau token asli. Gunakan data uji.

## Cakupan

Contoh yang termasuk: bypass autentikasi/otorisasi, IDOR, eskalasi peran,
injeksi SQL/perintah, XSS, SSRF, kebocoran secret, manipulasi transaksi atau
stok, dan akses tidak sah ke data member.

Kami meninjau laporan secara best effort dan akan memberi tahu statusnya.
Tidak ada SLA atau bounty yang dijanjikan dalam kebijakan ini.

## Setelah perbaikan

Perbaikan biasanya disertai tes regresi. Kredit pelapor diberikan bila diminta
dan tidak menimbulkan risiko tambahan.
