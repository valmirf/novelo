import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build para o artefato: um arquivo só, sem service worker.
// O artefato roda numa página hospedada que bloqueia pedidos a outros endereços,
// então tudo — CSS e JavaScript — precisa acabar embutido no HTML.
// Ver scripts/gerar-artefato.mjs, que faz a costura final.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-artefato',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'app.js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})
