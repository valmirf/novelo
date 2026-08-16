import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Build para o artefato: um arquivo só, sem service worker.
// O artefato roda numa página hospedada que bloqueia pedidos a outros endereços,
// então tudo — CSS e JavaScript — precisa acabar embutido no HTML.
//
// O leitor de PDF (pdf.js + o worker dele, quase 2 MB) NÃO pode virar parte do
// script principal: um WebView com pouca memória — como o do iPhone — trava ao
// tentar interpretar esse tanto de código de uma vez só, mesmo que ninguém
// jamais escolha um PDF. Por isso ele fica como pedaço separado
// (chunkFileNames), e scripts/gerar-artefato.mjs embute esse pedaço como texto
// inerte, que só vira código de verdade quando alguém realmente escolhe um
// arquivo. Ver esse script para a montagem final.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-artefato',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    rollupOptions: {
      output: {
        entryFileNames: 'app.js',
        chunkFileNames: 'preguicoso-[name].js',
        assetFileNames: 'app.[ext]',
      },
    },
  },
})
