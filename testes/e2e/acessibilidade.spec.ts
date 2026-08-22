import { expect, test } from '@playwright/test'
import { semear } from './apoio/semente'
import { Armario } from './apoio/paginas'

/**
 * O piso de acessibilidade do produto, verificado no navegador em vez de
 * prometido no documento.
 *
 * O tamanho de letra "Maior" tem teste próprio porque é o ajuste que o público
 * deste app de fato usa — e foi exatamente nele que a barra de abas, o selo de
 * status e o título do cabeçalho estouraram a tela.
 */
const TELAS = ['Trabalhos', 'Receitas', 'Materiais', 'Ajustes'] as const

test.describe('Piso de acessibilidade', () => {
  test.beforeEach(async ({ page }) => {
    await semear(page)
  })

  for (const escala of [1, 1.35]) {
    test(`nada transborda a tela no tamanho de letra ${escala === 1 ? 'normal' : 'maior'}`, async ({ page }) => {
      await page.evaluate((e) => document.documentElement.style.setProperty('--escala', String(e)), escala)
      const armario = new Armario(page)

      for (const tela of TELAS) {
        await armario.irPara(tela)
        await expect(armario.aba(tela)).toHaveAttribute('aria-current', 'page')
        const transborda = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        )
        expect(transborda, `${tela} transbordou na horizontal`).toBe(false)
      }
    })
  }

  test('todo botão diz uma palavra: nenhum é só desenho', async ({ page }) => {
    const armario = new Armario(page)
    for (const tela of TELAS) {
      await armario.irPara(tela)
      const mudos = await page.evaluate(() =>
        [...document.querySelectorAll('button')]
          .filter((b) => b.getBoundingClientRect().width > 0)
          .filter((b) => !(b.innerText || '').trim() && !b.getAttribute('aria-label'))
          .map((b) => b.outerHTML.slice(0, 80)),
      )
      expect(mudos, `${tela} tem botão sem palavra`).toEqual([])
    }
  })

  test('nenhum alvo de toque fica abaixo de 44px', async ({ page }) => {
    const armario = new Armario(page)
    for (const tela of TELAS) {
      await armario.irPara(tela)
      const pequenos = await page.evaluate(() =>
        [...document.querySelectorAll('button, a, input, select, textarea, [role="switch"]')]
          .map((e) => ({ e, r: e.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 0 && (r.width < 44 || r.height < 44))
          .map(({ e, r }) => `${(e as HTMLElement).innerText?.slice(0, 20)} ${Math.round(r.width)}x${Math.round(r.height)}`),
      )
      expect(pequenos, `${tela} tem alvo pequeno`).toEqual([])
    }
  })

  test('movimento reduzido troca o deslize por um aviso, sem apagá-lo', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.getByRole('button', { name: /^Continuar / }).click()
    await expect(page.locator('.carreira-atual')).toBeVisible()

    const animacao = await page.evaluate(
      () => getComputedStyle(document.querySelector('.carreira-atual')!).animationName,
    )
    // Nem o deslize da gaveta, nem nada: um esmaecer que ainda avisa.
    expect(animacao).not.toBe('carreira-entra')
    expect(animacao).not.toBe('none')
  })
})
