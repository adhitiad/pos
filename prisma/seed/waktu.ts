export const hariLalu = (jumlah: number, jam: number, menit = 0) => {
  const tanggal = new Date()
  tanggal.setDate(tanggal.getDate() - jumlah)
  tanggal.setHours(jam, menit, 0, 0)
  return tanggal
}

export const hariIni = (jam: number, menit = 0) => {
  const tanggal = new Date()
  tanggal.setHours(jam, menit, 0, 0)
  return tanggal
}
