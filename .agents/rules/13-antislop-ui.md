# WAJIB: Antislop UI

> Layar aplikasi dibangun untuk keputusan pengguna, bukan dari template.
> Checklist penuh: skill `antislop-ui`. Semua jawaban harus YA sebelum merge UI.

## Aturan

- **DILARANG** gradient biru-ungu/cyan/pink sebagai identitas, glass di mana-mana,
  semua-pill, shadow di semua elemen, glow massal, grid background, dark-mode
  tanpa alasan, dot status dekoratif, badge pil di atas H1.
- Palet maks 2–3 warna inti + 1 aksen; aksen hanya di momen kunci.
- **DILARANG** emoji dekoratif di teks UI; ikon harus relevan (lucide, lihat `06-ui.md`).
- Setiap nav & kontrol WAJIB punya tujuan nyata atau label "segera hadir" —
  tanpa link mati, tanpa tombol pajangan.
- Tabel: kolom dipilih dari keputusan pengguna di layar itu, bukan
  Nama/Status/Tanggal/Aksi generik; angka & baris WAJIB data asli atau
  placeholder jujur (tanpa metrik karangan, tanpa `John Doe`).
- Empty/loading/error WAJIB menyebut sebab + aksi berikutnya
  ("Keranjang kosong — pilih produk di atas", bukan "No data").
- Tanpa motion loop tanpa henti; animasi hanya dengan tujuan tertulis.
- Layar app disusun dari **satu pekerjaan + satu keputusan** di layar itu —
  bukan shell sidebar + 4 kartu stat + chart + tabel secara default.
