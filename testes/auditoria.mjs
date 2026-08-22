/**
 * Auditoria técnica medida, não estimada.
 *
 * Percorre as telas em três larguras e três tamanhos de letra e devolve número
 * para contraste, alvo de toque, transbordo, rótulo acessível e ordem de
 * cabeçalho. O que não der para medir não entra no relatório.
 */
import { chromium } from 'playwright'
import { semear } from './semente.mjs'

const ENDERECO = process.env.NOVELO_URL ?? 'http://localhost:5173'

const SONDA = `(() => {
  const luz = (c) => {
    const [r, g, b] = c
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const razao = (a, b) => {
    const [x, y] = [luz(a), luz(b)]
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
  }
  const cor = (s) => {
    const m = s.match(/[\\d.]+/g)
    return m ? [+m[0], +m[1], +m[2], m[3] === undefined ? 1 : +m[3]] : null
  }
  const fundoDe = (el) => {
    let no = el
    while (no && no !== document.documentElement) {
      const c = cor(getComputedStyle(no).backgroundColor)
      if (c && c[3] > 0.85) return c
      no = no.parentElement
    }
    return [36, 26, 18]
  }

  const contraste = []
  const alvos = []
  const semRotulo = []
  const semAlt = []
  const camposSemRotulo = []
  const cabecalhos = []

  for (const el of document.querySelectorAll('body *')) {
    const cx = el.getBoundingClientRect()
    if (cx.width === 0 || cx.height === 0) continue
    const e = getComputedStyle(el)
    if (e.visibility === 'hidden' || e.display === 'none') continue

    const texto = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ')
    if (texto) {
      const fg = cor(e.color)
      const bg = fundoDe(el)
      if (fg && bg) {
        const r = razao(fg, bg)
        const px = parseFloat(e.fontSize)
        const grande = px >= 24 || (px >= 18.66 && parseInt(e.fontWeight) >= 700)
        const piso = grande ? 3 : 4.5
        if (r < piso) contraste.push({ texto: texto.slice(0, 44), razao: +r.toFixed(2), piso, px: +px.toFixed(1), seletor: el.tagName.toLowerCase() + '.' + (el.className || '-') })
      }
    }

    const clicavel = el.matches('button, a, [role="button"], [role="switch"], input, select, textarea')
    if (clicavel) {
      if (cx.width < 44 || cx.height < 44) alvos.push({ o: (el.innerText || el.getAttribute('aria-label') || el.type || el.tagName).slice(0, 34), w: Math.round(cx.width), h: Math.round(cx.height) })
      const nome = (el.innerText || '').trim() || el.getAttribute('aria-label') || el.getAttribute('title') ||
        (el.labels && el.labels.length ? [...el.labels].map((l) => l.innerText).join(' ').trim() : '')
      if (!nome) {
        if (el.matches('input, select, textarea')) camposSemRotulo.push(el.outerHTML.slice(0, 90))
        else semRotulo.push(el.outerHTML.slice(0, 90))
      }
    }
    if (el.tagName === 'IMG' && !el.hasAttribute('alt')) semAlt.push(el.src.slice(0, 60))
    if (/^H[1-6]$/.test(el.tagName)) cabecalhos.push(+el.tagName[1])
  }

  let saltos = []
  for (let i = 1; i < cabecalhos.length; i++) {
    if (cabecalhos[i] - cabecalhos[i - 1] > 1) saltos.push(cabecalhos[i - 1] + '->' + cabecalhos[i])
  }

  return {
    contraste, alvos, semRotulo, semAlt, camposSemRotulo,
    ordemDeCabecalhos: cabecalhos.join(','), saltosDeCabecalho: saltos,
    transbordoHorizontal: document.documentElement.scrollWidth > window.innerWidth + 1,
    larguraDoDocumento: document.documentElement.scrollWidth,
  }
})()`

const navegador = await chromium.launch()
const relatorio = {}

for (const largura of [320, 390, 768]) {
  for (const escala of [1, 1.35]) {
    const ctx = await navegador.newContext({ viewport: { width: largura, height: 780 } })
    const pg = await ctx.newPage()
    await pg.goto(ENDERECO)
    await semear(pg)
    await pg.reload()
    await pg.waitForSelector('.aba')
    await pg.evaluate((e) => document.documentElement.style.setProperty('--escala', String(e)), escala)
    await pg.waitForFunction(() => document.fonts.status === 'loaded')

    const telas = {
      inicio: async () => {},
      receitas: async () => pg.getByRole('button', { name: /Receitas/ }).click(),
      materiais: async () => pg.getByRole('button', { name: /Materiais/ }).click(),
      amostras: async () => { await pg.getByRole('button', { name: /Materiais/ }).click(); await pg.getByRole('button', { name: /Amostras/ }).click() },
      ajustes: async () => pg.getByRole('button', { name: /Ajustes/ }).click(),
      'amostra-editor': async () => {
        await pg.getByRole('button', { name: /Materiais/ }).click()
        await pg.getByRole('button', { name: /Amostras/ }).click()
        await pg.getByRole('button', { name: /Guardar uma amostra/ }).click()
      },
      trabalho: async () => {
        await pg.getByRole('button', { name: /Trabalhos/ }).click()
        await pg.getByRole('button', { name: /^Continuar$/ }).first().click()
        await pg.waitForSelector('.carreira-atual')
      },
    }

    for (const [nome, ir] of Object.entries(telas)) {
      try {
        await pg.goto(ENDERECO)
        await pg.waitForSelector('.aba')
        await pg.evaluate((e) => document.documentElement.style.setProperty('--escala', String(e)), escala)
        await ir()
        await pg.waitForTimeout(280)
        relatorio[`${nome} ${largura}px escala${escala}`] = await pg.evaluate(SONDA)
      } catch (erro) {
        relatorio[`${nome} ${largura}px escala${escala}`] = { erroDeNavegacao: String(erro).slice(0, 120) }
      }
    }
    await ctx.close()
  }
}

// Resumo
const juntar = (campo) => {
  const vistos = new Map()
  for (const [onde, r] of Object.entries(relatorio)) {
    for (const item of r[campo] ?? []) {
      const chave = JSON.stringify(item)
      if (!vistos.has(chave)) vistos.set(chave, { item, onde: [] })
      vistos.get(chave).onde.push(onde)
    }
  }
  return [...vistos.values()].map((v) => ({ ...v.item, telas: v.onde.length, exemplo: v.onde[0] }))
}

console.log(JSON.stringify({
  contrasteReprovado: juntar('contraste'),
  alvosPequenos: juntar('alvos'),
  botoesSemNome: juntar('semRotulo'),
  camposSemRotulo: juntar('camposSemRotulo'),
  imagensSemAlt: juntar('semAlt'),
  transbordo: Object.entries(relatorio).filter(([, r]) => r.transbordoHorizontal).map(([k, r]) => `${k} (doc ${r.larguraDoDocumento}px)`),
  saltosDeCabecalho: Object.entries(relatorio).filter(([, r]) => (r.saltosDeCabecalho ?? []).length).map(([k, r]) => `${k}: ${r.saltosDeCabecalho.join(' ')}`),
  errosDeNavegacao: Object.entries(relatorio).filter(([, r]) => r.erroDeNavegacao).map(([k, r]) => `${k}: ${r.erroDeNavegacao}`),
}, null, 1))

await navegador.close()
