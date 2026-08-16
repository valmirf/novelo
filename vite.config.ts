import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Carimbo da versão publicada. Serve para saber, olhando a tela do aparelho da
// pessoa, se ela está mesmo na versão nova ou numa cópia velha presa no cache —
// pergunta que já custou vários dias de investigação às cegas.
const versao = new Date().toISOString().slice(0, 16).replace('T', ' ')

export default defineConfig({
  define: {
    __VERSAO_DO_APP__: JSON.stringify(versao),
  },
  // Endereços relativos: assim o app funciona tanto na raiz do domínio quanto
  // numa subpasta, que é como o GitHub Pages publica.
  base: './',
  plugins: [
    react(),
    VitePWA({
      // 'prompt': a versão nova baixa e fica esperando; quem decide a hora de
      // trocar é a pessoa, tocando em "Atualizar agora" (AvisoAtualizacao.tsx).
      // 'autoUpdate' recarregaria a tela sozinho, o que apagaria o que ela
      // estivesse digitando numa receita sem avisar.
      registerType: 'prompt',
      includeAssets: ['icone.svg'],
      manifest: {
        name: 'Novelo — tricô e crochê',
        short_name: 'Novelo',
        description: 'Receitas, contadores, cronômetro e inventário de linhas e agulhas.',
        lang: 'pt-BR',
        theme_color: '#7c4a3a',
        background_color: '#fdfaf6',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icone-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Sem skipWaiting: a versão nova baixa e fica esperando o toque em
        // "Atualizar agora" — é o botão que manda o aviso pra ela assumir.
        // clientsClaim garante que, assim que ela assumir, controla a aba na
        // hora, sem precisar de um segundo recarregamento.
        clientsClaim: true,
      },
    }),
  ],
})
