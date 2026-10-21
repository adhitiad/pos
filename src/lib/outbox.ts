import type { AntreanItem, PenyimpananAntrean } from '#/types/outbox'
import type { PostingTransaksiInput } from '#/validations/transaksi'

export { type AntreanItem, type PenyimpananAntrean }

// Satu transaksi yang antre dikirim saat online kembali.
// Jurnal ikut terposting di server pada saat sync (deferred).
//
// `id` item dipakai sebagai kunci idempotensi transaksi: kalau respons hilang
// saat pengiriman, antrean dikirim ulang dengan kunci sama → server
// mengembalikan transaksi yang sudah ada (tak ada stok/pendapatan dobel).
// ─── IndexedDB (browser) ───

const DB = 'pos-outbox'
const STORE = 'antrean'

function denganStore<T>(
  mode: IDBTransactionMode,
  kerja: (s: IDBObjectStore) => Promise<T>,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const buka = indexedDB.open(DB, 1)
    buka.onupgradeneeded = () => {
      buka.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    buka.onerror = () => {
      reject(buka.error)
    }
    buka.onsuccess = () => {
      const db = buka.result
      const tx = db.transaction(STORE, mode)
      tx.onerror = () => {
        db.close()
        reject(tx.error)
      }
      tx.onabort = () => {
        db.close()
        reject(tx.error)
      }
      kerja(tx.objectStore(STORE)).then(
        (nilai) => {
          tx.oncomplete = () => {
            db.close()
            resolve(nilai)
          }
        },
        (e) => {
          db.close()
          reject(e)
        },
      )
    }
  })
}

const janji = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result)
    }
    req.onerror = () => {
      reject(req.error)
    }
  })

export function antreanBaru(payload: PostingTransaksiInput): AntreanItem {
  const id = buatId()
  const dibuat = new Date().toISOString()
  return {
    id,
    dibuat,
    payload: {
      ...payload,
      idempotencyKey: id,
      dibuatOffline: true,
      waktuKlien: dibuat,
    },
    galat: null,
  }
}

const buatId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.floor(Math.random() * 1e9)}`

export function penyimpananIndexedDB(): PenyimpananAntrean {
  const urut = (daftar: AntreanItem[]) =>
    daftar.sort((a, b) => (a.dibuat < b.dibuat ? -1 : 1))
  return {
    tambah: (item) =>
      denganStore('readwrite', (s) => janji(s.add(item))).then(() => undefined),
    daftar: () => denganStore('readonly', (s) => janji(s.getAll())).then(urut),
    hapus: (id) =>
      denganStore('readwrite', (s) => janji(s.delete(id))).then(
        () => undefined,
      ),
    tandai: (id, galat) =>
      denganStore('readwrite', async (s) => {
        const item = await janji(s.get(id))
        if (item) await janji(s.put({ ...item, galat }))
      }).then(() => undefined),
  }
}

// ─── Memori (unit test) ───

export function penyimpananMemory(): PenyimpananAntrean {
  const peta = new Map<string, AntreanItem>()
  return {
    tambah: async (item) => {
      peta.set(item.id, item)
    },
    daftar: async () =>
      [...peta.values()].sort((a, b) => (a.dibuat < b.dibuat ? -1 : 1)),
    hapus: async (id) => {
      peta.delete(id)
    },
    tandai: async (id, galat) => {
      const item = peta.get(id)
      if (item) peta.set(id, { ...item, galat })
    },
  }
}
