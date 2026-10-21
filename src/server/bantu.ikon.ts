// Pembuat SVG ikon aplikasi. Murni (tanpa DB/env) agar bisa diuji unit.
// Ikon sumber diunggah owner ke Cloudinary; server membungkusnya dalam SVG
// 512×512 supaya favicon/manifest punya satu URL stabil dan tajam di semua
// ukuran. Tanpa gambar, SVG dibuat dari inisial judul aplikasi.

const LATAR = '#0f3d3a'
const LATAR_DALAM = '#155e57'
const TINTA = '#eaf5f1'
const AKSEN = '#d9a441'

export function escapeXml(nilai: string): string {
  return nilai
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

export function inisialJudul(judul: string): string {
  const huruf = Array.from(judul.trim()).at(0)
  return (huruf ?? 'P').toUpperCase()
}

export function svgIkon(judul: string, gambarDataUri?: string | null): string {
  const judulAman = escapeXml(judul.trim() || 'POS')
  const isi = gambarDataUri
    ? `<image href="${escapeXml(gambarDataUri)}" x="40" y="40" width="432" height="432" preserveAspectRatio="xMidYMid slice" clip-path="url(#potong)"/>`
    : `<rect x="40" y="40" width="432" height="432" rx="104" fill="${LATAR_DALAM}"/>
  <path d="M196 158h120a20 20 0 0 1 20 20v136a58 58 0 0 1-58 58h-44a58 58 0 0 1-58-58V178a20 20 0 0 1 20-20z" fill="none" stroke="${TINTA}" stroke-width="20" stroke-linejoin="round"/>
  <path d="M224 232h64M224 280h64M224 328h40" stroke="${TINTA}" stroke-width="16" stroke-linecap="round"/>
  <circle cx="340" cy="356" r="28" fill="${AKSEN}"/>
  <text x="340" y="366" text-anchor="middle" font-family="Manrope, Arial, sans-serif" font-size="30" font-weight="700" fill="${LATAR}">${escapeXml(inisialJudul(judul))}</text>`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img">
  <title>${judulAman}</title>
  <defs>
    <clipPath id="potong">
      <rect x="40" y="40" width="432" height="432" rx="104"/>
    </clipPath>
  </defs>
  <rect width="512" height="512" rx="120" fill="${LATAR}"/>
  ${isi}
</svg>`
}
