/**
 * Impressão digital do layout: a caixa de cada elemento visível, em número.
 *
 * Serve para provar que uma mudança de sistema (tokens, escala de espaço) não
 * mexeu no que já estava certo. Comparar dois arquivos destes é mais preciso do
 * que comparar duas capturas de tela a olho.
 */
import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'
import { semear } from './semente.mjs'

const saida = process.argv[2] ?? 'impressao.json'
const navegador = await chromium.launch()
const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } })
const pagina = await contexto.newPage()

await pagina.goto(process.env.NOVELO_URL ?? 'http://localhost:5173')
await semear(pagina)
await pagina.reload()
await pagina.waitForSelector('.aba')
await pagina.waitForFunction(() => document.fonts.status === 'loaded')

const medir = () =>
  pagina.evaluate(() =>
    [...document.querySelectorAll('body *')]
      .filter((e) => e.getBoundingClientRect().width > 0)
      .map((e) => {
        const r = e.getBoundingClientRect()
        const marca = `${e.tagName.toLowerCase()}.${e.className || '-'}`.slice(0, 60)
        return `${marca} ${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)}`
      }),
  )

const telas = {}
telas.inicio = await medir()

await pagina.getByRole('button', { name: /Materiais/ }).click()
await pagina.getByRole('button', { name: /Amostras/ }).click()
await pagina.waitForTimeout(200)
telas.amostras = await medir()

await pagina.getByRole('button', { name: /Trabalhos/ }).click()
await pagina.getByRole('button', { name: /^Continuar$/ }).first().click()
await pagina.waitForSelector('.carreira-atual')
await pagina.waitForTimeout(200)
telas.trabalho = await medir()

await writeFile(saida, JSON.stringify(telas, null, 1))
console.log(`${saida}: ${Object.values(telas).flat().length} caixas`)
await navegador.close()
