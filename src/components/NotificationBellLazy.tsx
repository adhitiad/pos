import { lazy, Suspense } from 'react'

// Notifikasi (dropdown + polling) tidak dibutuhkan untuk render pertama.
// Pisahkan chunk-nya agar bundle awal lebih kecil; fallback kosong supaya
// header tidak bergeser (tinggi tombol sudah disediakan header).
const NotificationBell = lazy(() => import('./NotificationBell'))

export default function NotificationBellLazy() {
  return (
    <Suspense fallback={null}>
      <NotificationBell />
    </Suspense>
  )
}
