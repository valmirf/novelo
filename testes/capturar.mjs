/**
 * Fotografa as telas principais para eu conseguir olhar o que construí.
 *
 * Uso: node testes/capturar.mjs [escala]
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { semear } from './semente.mjs'

const ENDERECO = process.env.NOVELO_URL ?? 'http://localhost:5173'
const escala = Number(process.argv[2] ?? 1)
const pasta = 'capturas'

const navegador = await chromium.launch()
const contexto = await navegador.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
})
const pagina = await contexto.newPage()
await mkdir(pasta, { recursive: true })

await pagina.goto(ENDERECO)
await semear(pagina)
await pagina.reload()
await pagina.waitForSelector('.aba')
await pagina.evaluate((e) => document.documentElement.style.setProperty('--escala', String(e)), escala)
await pagina.waitForFunction(() => document.fonts.status === 'loaded')

const sufixo = escala === 1 ? '' : `-${String(escala).replace('.', '_')}`
const tirar = async (nome) => {
  await pagina.waitForTimeout(350)
  await pagina.screenshot({ path: `${pasta}/${nome}${sufixo}.png` })
  console.log(`${pasta}/${nome}${sufixo}.png`)
}

await tirar('inicio')

await pagina.getByRole('button', { name: /Materiais/ }).click()
await pagina.getByRole('button', { name: /Amostras/ }).click()
await tirar('amostras')

await pagina.getByRole('button', { name: /Trabalhos/ }).click()
await pagina.getByRole('button', { name: /^Continuar$/ }).first().click()
await pagina.waitForSelector('.carreira-atual')
await tirar('trabalho')

await navegador.close()
