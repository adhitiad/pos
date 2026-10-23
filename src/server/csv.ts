// CSV aman untuk ekspor laporan. Sanitasi formula dilakukan SEBELUM quoting;
// bila urutannya dibalik, sel seperti `"=1+1"` tetap dieksekusi Excel karena
// apostrof berada di dalam tanda kutip. Sel yang diawali karakter kontrol/spasi
// lalu formula juga disanitasi.
function amanCsv(sel: string | number): string {
  let s = String(sel)
  // Cari karakter pertama non-spasi/kontrol tanpa regex rentang kontrol.
  let i = 0
  while (i < s.length && s.charCodeAt(i) <= 0x20) i++
  if (i < s.length && '=+-@'.includes(s[i] ?? '')) s = `'${s}`
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export function keCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(amanCsv).join(',')).join('\r\n')
}
