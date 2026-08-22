import { expect, test } from '@playwright/test'
import { NOME_DO_TRABALHO, semear } from './apoio/semente'
import { TelaInicio } from './apoio/paginas'

/**
 * O diferencial do app: ler a receita, não só contar. Se algum destes quebrar,
 * o Novelo virou mais um contador de carreiras.
 */
test.describe('Interpretar a receita', () => {
  test.beforeEach(async ({ page }) => {
    await semear(page)
  })

  test('expande "Trabalhar as carr 3 e 4 - 18 vezes" em passadas de verdade', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    const { total } = await trabalho.posicao()

    // 4 carreiras soltas + 18 repetições do par (3 e 4) + o arremate.
    expect(total).toBeGreaterThan(30)
    await expect(trabalho.rotuloDaCarreira).toContainText(/\d+ª de 18/)
  })

  test('conta a repetição para cima ao avançar dentro do bloco', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)
    const antes = await trabalho.rotuloDaCarreira.innerText()
    const repeticaoAntes = Number(antes.match(/(\d+)ª de 18/)?.[1])

    // Duas carreiras adiante é a mesma dupla de novo, uma repetição acima.
    await trabalho.proxima.click()
    await trabalho.proxima.click()

    await expect
      .poll(async () => Number((await trabalho.rotuloDaCarreira.innerText()).match(/(\d+)ª de 18/)?.[1]))
      .toBe(repeticaoAntes + 1)
  })

  test('desenha o trecho que repete em vez de mostrar o asterisco', async ({ page }) => {
    const trabalho = await new TelaInicio(page).abrir(NOME_DO_TRABALHO)

    await expect(trabalho.instrucao).toContainText('3 pa, 1 aum, 3 pa')
    // O asterisco é notação de quem escreve receita; ela nunca deve vê-lo.
    await expect(trabalho.instrucao).not.toContainText('*')
  })
})
