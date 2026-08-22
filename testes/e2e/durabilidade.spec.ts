import { expect, test } from '@playwright/test'
import { NOME_DO_TRABALHO, semear } from './apoio/semente'
import { TelaInicio } from './apoio/paginas'

/**
 * Princípio 4 do produto: nada se perde.
 *
 * Uma peça leva semanas. Se um toque rápido some, ou se fechar o app perde a
 * última carreira, ela descobre isso tarde demais — com a peça já errada.
 */
test.describe('Nada se perde', () => {
  test.beforeEach(async ({ page }) => {
    await semear(page)
  })

  test('toques rápidos seguidos contam todos', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    const { atual: comecou } = await trabalho.posicao()

    /*
      Cinco toques encostados, disparados no mesmo quadro.
      `click()` do Playwright espera a interface entre um toque e outro e por
      isso não alcança a corrida; aqui os toques chegam antes de o banco
      responder ao primeiro, que é onde a carreira sumia.
    */
    await trabalho.proxima.evaluate((botao: HTMLElement) => {
      for (let i = 0; i < 5; i++) botao.click()
    })

    await expect(trabalho.barraDeProgresso).toHaveAttribute(
      'aria-valuenow',
      String(comecou + 5),
    )
  })

  test('cinco toques rápidos sobrevivem a fechar o app', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    const { atual: comecou } = await trabalho.posicao()

    await trabalho.proxima.evaluate((botao: HTMLElement) => {
      for (let i = 0; i < 5; i++) botao.click()
    })
    await expect(trabalho.barraDeProgresso).toHaveAttribute('aria-valuenow', String(comecou + 5))

    await page.reload()
    const reaberto = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)

    expect((await reaberto.posicao()).atual).toBe(comecou + 5)
  })

  test('avançar e voltar depressa volta ao mesmo lugar', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    const { atual: comecou } = await trabalho.posicao()

    await trabalho.proxima.evaluate((b: HTMLElement) => { for (let i = 0; i < 3; i++) b.click() })
    await expect(trabalho.barraDeProgresso).toHaveAttribute('aria-valuenow', String(comecou + 3))
    await trabalho.voltarUma.evaluate((b: HTMLElement) => { for (let i = 0; i < 3; i++) b.click() })

    await expect(trabalho.barraDeProgresso).toHaveAttribute('aria-valuenow', String(comecou))
  })
})
