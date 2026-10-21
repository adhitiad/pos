# WAJIB: Layout Mobile (reflow, bukan diperkecil)

> Mobile adalah layout berbeda, bukan desktop yang disempitkan.
> Checklist penuh: skill `antislop-layoutmobile`. Verifikasi dengan
> e2e viewport 390px (lihat `12-testing.md`).

## Aturan

- Setiap layar WAJIB punya status mobile yang dirancang: kolom menumpuk,
  ukuran mengecil, urutan berubah bila perlu. DILARANG hanya mengandalkan
  `md:` dua-status untuk rentang tablet (600–1024px) tanpa memeriksa.
- Skala mobile: padding halaman `p-4` (naik ke `sm:p-6`), heading tidak raksasa,
  gap lebih rapat. Target sentuh **min 44×44px** dengan jarak antar target.
- Grid multi-kolom WAJIB collapse di sempit; tabel panjang dibungkus
  `overflow-x-auto` (bukan scroll horizontal halaman); gambar `max-w-full`.
- Navigasi WAJIB reflow (wrap/menu/nav bawah), bukan bar desktop yang berdesakan.
- Hover-only DILARANG tanpa padanan tap; tidak ada `overflow:hidden` yang
  memotong konten; hormati safe-area bila ada bar fixed.
