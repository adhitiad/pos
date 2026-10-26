import { useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { unggahGambar } from '#/lib/cloudinary'
import { setIdentitasCache } from '#/hooks/identitas'
import { setLogoUrlCache } from '#/hooks/logo'
import { parsePersenPengaturan } from '#/lib/persen'
import { m } from '#/paraglide/messages'
import { setPengaturanFn } from '#/server/pengaturanFn'
import type { IdUkuranKertasTermal } from '#/types/printer'
import type { PengaturanAwal } from '#/types/pengaturan'
import type { StrukOtomatis } from '#/validations/pengaturan'

// State + aksi form pengaturan owner. Dipisah dari rute agar komponen kartu
// hanya mengurus tampilan dan file rute tetap kecil.
export function usePengaturanForm(awal: PengaturanAwal) {
  const [namaToko, setNamaToko] = useState(awal.namaToko)
  const [judulApp, setJudulApp] = useState(awal.judulApp)
  const [logoUrl, setLogoUrl] = useState(awal.logoUrl)
  const [fileLogo, setFileLogo] = useState<File | null>(null)
  const inputLogo = useRef<HTMLInputElement>(null)
  const [ikonUrl, setIkonUrl] = useState(awal.ikonUrl)
  const [fileIkon, setFileIkon] = useState<File | null>(null)
  const [berkasIkon, setBerkasIkon] = useState<File | null>(null)
  const [cropTerbuka, setCropTerbuka] = useState(false)
  const [ikonDireset, setIkonDireset] = useState(false)
  const [versiIkon, setVersiIkon] = useState(0)
  const inputIkon = useRef<HTMLInputElement>(null)
  const [deskripsiApp, setDeskripsiApp] = useState(awal.deskripsiApp)
  const [pajakRestoPersen, setPajakRestoPersen] = useState(
    String(awal.pajakRestoPersen),
  )
  const [pajakRetailPersen, setPajakRetailPersen] = useState(
    String(awal.pajakRetailPersen),
  )
  const [modeFnb, setModeFnb] = useState(awal.modeFnb)
  const [riwayatBelanja, setRiwayatBelanja] = useState(awal.riwayatBelanja)
  const printerEscposAwal = awal.semua.printer_escpos === 'true'
  const [printerEscpos, setPrinterEscpos] = useState(printerEscposAwal)
  const [ukuranKertas, setUkuranKertas] = useState<IdUkuranKertasTermal>(
    awal.ukuranKertasTermal as IdUkuranKertasTermal,
  )
  const [strukOtomatis, setStrukOtomatis] = useState<StrukOtomatis>(
    awal.strukOtomatis,
  )
  const [tokoAktif, setTokoAktif] = useState(awal.tokoAktif)
  const [jamBuka, setJamBuka] = useState(awal.jamBuka ?? '')
  const [jamTutup, setJamTutup] = useState(awal.jamTutup ?? '')
  const [simpan, setSimpan] = useState(false)

  const pratinjauIkon = useMemo(() => {
    if (fileIkon) return URL.createObjectURL(fileIkon)
    if (ikonDireset) return ''
    return `/api/v1/app-icon?v=${versiIkon}`
  }, [fileIkon, versiIkon, ikonDireset])

  const resetIkon = () => {
    setFileIkon(null)
    setBerkasIkon(null)
    setCropTerbuka(false)
    setIkonUrl('')
    setIkonDireset(true)
    setVersiIkon((v) => v + 1)
    if (inputIkon.current) inputIkon.current.value = ''
  }

  const onSubmit = async () => {
    const pajakResto = parsePersenPengaturan(pajakRestoPersen)
    const pajakRetail = parsePersenPengaturan(pajakRetailPersen)
    if (pajakResto === null || pajakRetail === null) {
      toast.error(m.pengaturan_pajak_invalid())
      return
    }
    const nolBaru =
      (pajakResto === 0 && awal.pajakRestoPersen !== 0) ||
      (pajakRetail === 0 && awal.pajakRetailPersen !== 0)
    if (nolBaru && !window.confirm(m.pengaturan_pajak_nol_konfirmasi())) return

    setSimpan(true)
    let logoBaru = logoUrl
    let ikonBaru = ikonUrl
    try {
      if (namaToko !== awal.namaToko)
        await setPengaturanFn({ data: { kunci: 'nama_toko', nilai: namaToko } })
      if (judulApp !== awal.judulApp)
        await setPengaturanFn({ data: { kunci: 'judul_app', nilai: judulApp } })
      if (fileLogo || logoUrl !== awal.logoUrl) {
        const nilai = fileLogo ? await unggahGambar(fileLogo) : logoUrl
        await setPengaturanFn({ data: { kunci: 'logo_url', nilai } })
        logoBaru = nilai
        setLogoUrl(nilai)
        setLogoUrlCache(nilai)
        setFileLogo(null)
        if (inputLogo.current) inputLogo.current.value = ''
      }
      if (fileIkon || ikonUrl !== awal.ikonUrl) {
        const nilai = fileIkon ? await unggahGambar(fileIkon) : ikonUrl
        await setPengaturanFn({ data: { kunci: 'ikon_url', nilai } })
        ikonBaru = nilai
        setIkonUrl(nilai)
        setFileIkon(null)
        setBerkasIkon(null)
        setCropTerbuka(false)
        setIkonDireset(false)
        setVersiIkon((v) => v + 1)
        if (inputIkon.current) inputIkon.current.value = ''
      }
      if (deskripsiApp !== awal.deskripsiApp)
        await setPengaturanFn({
          data: { kunci: 'deskripsi_app', nilai: deskripsiApp },
        })
      if (pajakResto !== awal.pajakRestoPersen)
        await setPengaturanFn({
          data: {
            kunci: 'pajak_resto_persen',
            nilai: String(pajakResto),
          },
        })
      if (pajakRetail !== awal.pajakRetailPersen)
        await setPengaturanFn({
          data: {
            kunci: 'pajak_retail_persen',
            nilai: String(pajakRetail),
          },
        })
      if (modeFnb !== awal.modeFnb)
        await setPengaturanFn({
          data: { kunci: 'mode_fnb', nilai: modeFnb ? 'true' : 'false' },
        })
      if (riwayatBelanja !== awal.riwayatBelanja)
        await setPengaturanFn({
          data: {
            kunci: 'riwayat_belanja_aktif',
            nilai: riwayatBelanja ? 'true' : 'false',
          },
        })
      if (printerEscpos !== printerEscposAwal)
        await setPengaturanFn({
          data: {
            kunci: 'printer_escpos',
            nilai: printerEscpos ? 'true' : 'false',
          },
        })
      if (ukuranKertas !== awal.ukuranKertasTermal)
        await setPengaturanFn({
          data: {
            kunci: 'ukuran_kertas_termal',
            nilai: ukuranKertas,
          },
        })
      if (strukOtomatis !== awal.strukOtomatis)
        await setPengaturanFn({
          data: { kunci: 'struk_otomatis', nilai: strukOtomatis },
        })
      if (tokoAktif !== awal.tokoAktif)
        await setPengaturanFn({
          data: { kunci: 'toko_aktif', nilai: tokoAktif ? 'true' : 'false' },
        })
      if (jamBuka !== (awal.jamBuka ?? ''))
        await setPengaturanFn({
          data: { kunci: 'jam_buka', nilai: jamBuka },
        })
      if (jamTutup !== (awal.jamTutup ?? ''))
        await setPengaturanFn({
          data: { kunci: 'jam_tutup', nilai: jamTutup },
        })
      setIdentitasCache({
        judul: judulApp.trim() || namaToko.trim() || 'POS',
        ikonUrl: ikonBaru || logoBaru,
        logoUrl: logoBaru,
        deskripsi: deskripsiApp,
      })
      toast.success(m.pengaturan_tersimpan())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : m.toast_error_umum())
    } finally {
      setSimpan(false)
    }
  }

  return {
    awal,
    namaToko,
    setNamaToko,
    judulApp,
    setJudulApp,
    logoUrl,
    fileLogo,
    setFileLogo,
    inputLogo,
    ikonUrl,
    fileIkon,
    berkasIkon,
    setBerkasIkon,
    cropTerbuka,
    setCropTerbuka,
    setFileIkon,
    setIkonDireset,
    inputIkon,
    versiIkon,
    setVersiIkon,
    pratinjauIkon,
    resetIkon,
    deskripsiApp,
    setDeskripsiApp,
    pajakRestoPersen,
    setPajakRestoPersen,
    pajakRetailPersen,
    setPajakRetailPersen,
    modeFnb,
    setModeFnb,
    riwayatBelanja,
    setRiwayatBelanja,
    printerEscpos,
    setPrinterEscpos,
    ukuranKertas,
    setUkuranKertas,
    strukOtomatis,
    setStrukOtomatis,
    tokoAktif,
    setTokoAktif,
    jamBuka,
    setJamBuka,
    jamTutup,
    setJamTutup,
    simpan,
    onSubmit,
  }
}

export type PengaturanForm = ReturnType<typeof usePengaturanForm>
