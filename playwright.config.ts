import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de ponta a ponta do Novelo.
 *
 * WebKit não é enfeite aqui: a Camila usa iPhone, e os dois problemas mais
 * caros da história deste app — o PDF que não abria e a página que recarregava
 * sozinha — só apareceram no Safari. Chromium roda junto porque é o navegador
 * de quem abre no Android e no computador.
 *
 * As larguras são de aparelho de verdade, não de janela de desenvolvimento: o
 * app é usado no celular apoiado ao lado do trabalho.
 */
export default defineConfig({
  testDir: 'testes/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: process.env.NOVELO_URL ?? 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'pt-BR',
  },

  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'] } },
    { name: 'android', use: { ...devices['Pixel 7'] } },
  ],

  /*
    Roda contra o pacote construído, não contra o servidor de desenvolvimento.
    Dois motivos: é o arquivo que a Camila de fato baixa — com as fontes
    versionadas, o service worker e o `base` relativo do GitHub Pages — e é
    rápido. Em desenvolvimento cada contexto novo fazia o Vite transformar
    módulo por módulo, e um único teste levava 40 segundos.
  */
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
    /*
      Nunca reaproveitar um servidor que já esteja de pé. Reaproveitar parece
      economia e é armadilha: um `vite preview` esquecido na porta serve um
      pacote antigo, e a suíte inteira reprova apontando defeitos que já foram
      corrigidos. Perdi uma rodada de 26 minutos exatamente assim.
    */
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
