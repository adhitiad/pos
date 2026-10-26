import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

const EKSTENSI_PRECACHE = /\.(?:js|css|woff2?|ttf|otf|svg|png|jpe?g|webp|ico)$/i

// Tulis daftar aset hasil build agar service worker bisa mem-precache seluruh
// chunk (termasuk route lazy) saat instalasi, bukan hanya yang sempat dibuka.
function precacheServiceWorker(): Plugin {
  return {
    name: 'pos-service-worker-precache',
    apply: 'build',
    generateBundle(_options, bundle) {
      // Hanya build klien yang menghasilkan aset untuk service worker.
      if (this.environment.name !== 'client') return
      const aset = Object.keys(bundle)
        .filter((nama) => EKSTENSI_PRECACHE.test(nama))
        .map((nama) => `/${nama}`)
      this.emitFile({
        type: 'asset',
        fileName: 'sw-manifest.js',
        source: `self.__POS_PRECACHE=${JSON.stringify(aset)};`,
      })
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  optimizeDeps: {
    exclude: ['node:url'],
  },
  ssr: {
    noExternal: [],
    external: ['node:url'],
  },
  plugins: [
    process.env.NODE_ENV !== 'production' && devtools(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      strategy: ['cookie', 'baseLocale'],
    }),
    nitro(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
    babel({ presets: [reactCompilerPreset()] }),
    precacheServiceWorker(),
  ],
})

export default config
