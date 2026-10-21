# WAJIB: State Management & TanStack Store

> Gunakan TanStack Store untuk state klien global/lintas-komponen; simpan state yang dapat dibagikan di URL.

## Aturan

- **Pemisahan State**: Gunakan `@tanstack/store` hanya untuk state ephemeral klien (dialog modal global, panel drawer, preferensi lokal UI sementara). State yang harus bisa dibookmark, di-refresh, atau dibagikan link-nya (pencarian, filter, tab aktif, paginasi) **WAJIB** memakai TanStack Router Search Params (`validateSearch`).
- **Tipe Eksplisit**: **WAJIB** mendeklarasikan tipe state TypeScript secara eksplisit saat membuat store (`new Store<T>(initialState)`).
- **Selector Terfokus**: Saat mengonsumsi store di komponen React, **WAJIB** menggunakan selector terfokus (`useStore(store, (state) => state.propertiTertentu)`) untuk meminimalkan re-render komponen yang tidak perlu.
- **Mutasi Terkendali**: Pembaruan state **WAJIB** dilakukan melalui `store.setState((prev) => ({ ...prev, ... }))` atau helper mutator terisolasi, **DILARANG** melakukan mutasi objek state secara langsung (in-place mutation).
- **Lokasi Modul**: Letakkan store global di `src/lib/<domain>/store.ts` atau di folder komponen fitur terkait (`src/components/<domain>/store.ts`) jika cakupannya terbatas pada satu modul.
