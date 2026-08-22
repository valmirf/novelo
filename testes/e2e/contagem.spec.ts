import { expect, test } from '@playwright/test'
import { NOME_DO_TRABALHO, semear } from './apoio/semente'
import { TelaInicio } from './apoio/paginas'

/**
 * A conta é o produto. Se ela perder a carreira, perde a peça — por isso estes
 * testes cobrem o princípio "nada se perde" e não só o clique.
 */
test.describe('Contar carreiras', () => {
  test.beforeEach(async ({ page }) => {
    await semear(page)
  })

  test('avança uma carreira e a posição sobe junto', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    const antes = await trabalho.posicao()

    await trabalho.proxima.click()

    await expect
      .poll(async () => (await trabalho.posicao()).atual)
      .toBe(antes.atual + 1)
    expect((await trabalho.posicao()).total).toBe(antes.total)
  })

  test('voltar uma carreira desfaz o avanço', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    const inicio = await trabalho.posicao()
    const instrucaoInicial = await trabalho.instrucao.innerText()

    await trabalho.proxima.click()
    await expect.poll(async () => (await trabalho.posicao()).atual).toBe(inicio.atual + 1)

    await trabalho.voltarUma.click()

    await expect.poll(async () => (await trabalho.posicao()).atual).toBe(inicio.atual)
    await expect(trabalho.instrucao).toHaveText(instrucaoInicial)
  })

  test('a carreira sobrevive a fechar e abrir o app', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    await trabalho.proxima.click()
    await trabalho.proxima.click()
    const depoisDeContar = await trabalho.posicao()

    // Fechar o app é isto: a página some e volta do zero, lendo o aparelho.
    await page.reload()

    const reaberto = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    expect(await reaberto.posicao()).toEqual(depoisDeContar)
  })

  test('o relógio da peça começa correndo e pausa quando ela pede', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)

    await expect(trabalho.relogio).toHaveText(/Pausar/)
    await trabalho.relogio.click()
    await expect(trabalho.relogio).toHaveText(/Retomar/)
    await trabalho.relogio.click()
    await expect(trabalho.relogio).toHaveText(/Pausar/)
  })
})
