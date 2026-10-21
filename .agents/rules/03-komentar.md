# WAJIB: Komentar & Dokumentasi Kode

> Setiap kode yang ditulis wajib bisa dipahami programmer lain tanpa harus bertanya ke penulisnya.

## Aturan

- **WAJIB** memberi docstring/komentar pada setiap fungsi, struct/tipe, dan modul baru: tujuan, parameter penting, nilai kembalian, dan konteks logika bisnisnya.
- **WAJIB** mengomentari blok non-trivial: aturan bisnis (pasal, rumus, ambang batas), _workaround_, dan alasan memilih pendekatan tertentu. Cantumkan referensi pasalnya bila ada
- Komentar menjelaskan **mengapa**, bukan mengulang **apa** yang sudah jelas dari kode. Komentar yang hanya memparafrasekan baris kode dilarang.
- Komentar usang = bug: saat mengubah logika, **WAJIB** memperbarui komentarnya di diff yang sama.
