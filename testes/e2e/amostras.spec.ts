import { expect, test } from '@playwright/test'
import { semear } from './apoio/semente'
import { BibliotecaDeAmostras } from './apoio/paginas'

test.describe('Biblioteca de amostras', () => {
  test.beforeEach(async ({ page }) => {
    await semear(page, { comTrabalho: false })
  })

  test('guarda uma amostra blocada e mostra a contagem que vale', async ({ page }) => {
    const biblioteca = await BibliotecaDeAmostras.abrir(page)
    const editor = await biblioteca.novaAmostra()

    await editor.preencher({
      nome: 'Anne com agulha 4',
      ponto: 'ponto alto',
      pontos: 18,
      carreiras: 24,
      blocada: { pontos: 16, carreiras: 22, largura: 12.5, altura: 11 },
    })
    await editor.salvar.click()

    const cartao = biblioteca.cartao('Anne com agulha 4')
    await expect(cartao).toBeVisible()
    // Depois de blocar, é a contagem de depois que vale para calcular a peça.
    await expect(cartao).toContainText('16')
    await expect(cartao).toContainText('22')
    await expect(cartao).toContainText('Blocada')
    await expect(cartao).toContainText('12,5 cm por 11 cm')
  })

  test('lê o que a blocagem mudou, em português', async ({ page }) => {
    const biblioteca = await BibliotecaDeAmostras.abrir(page)
    const editor = await biblioteca.novaAmostra()

    await editor.preencher({
      nome: 'Amostra que abriu',
      pontos: 18,
      carreiras: 24,
      blocada: { pontos: 16, carreiras: 22 },
    })

    const leitura = editor.depoisDeBlocar.getByText(/o tecido/)
    await expect(leitura).toContainText('2 pontos a menos')
    await expect(leitura).toContainText('abriu')
    await expect(leitura).toContainText('Use os números de depois de blocar')
  })

  test('não inventa número quando ela blocou mas ainda não mediu', async ({ page }) => {
    const biblioteca = await BibliotecaDeAmostras.abrir(page)
    const editor = await biblioteca.novaAmostra()

    await editor.preencher({ nome: 'Ainda não medi', pontos: 18, carreiras: 24 })
    await editor.foiBlocada.click()
    await editor.salvar.click()

    const cartao = biblioteca.cartao('Ainda não medi')
    await expect(cartao).toContainText('Blocada, falta medir')
    // Mostra a contagem de antes, que é a única que ela de fato tem.
    await expect(cartao).toContainText('18')
    await expect(cartao).toContainText('24')
  })

  test('exige nome e contagem antes de deixar salvar', async ({ page }) => {
    const biblioteca = await BibliotecaDeAmostras.abrir(page)
    const editor = await biblioteca.novaAmostra()

    await expect(editor.salvar).toBeDisabled()
    await expect(page.getByText(/Falta o nome da amostra/)).toBeVisible()

    await editor.nome.fill('Só o nome')
    await expect(editor.salvar).toBeDisabled()

    await editor.pontosEm10cm.fill('18')
    await editor.carreirasEm10cm.fill('24')
    await expect(editor.salvar).toBeEnabled()
  })

  test('pede confirmação por extenso antes de apagar', async ({ page }) => {
    const biblioteca = await BibliotecaDeAmostras.abrir(page)
    const editor = await biblioteca.novaAmostra()
    await editor.preencher({ nome: 'Para apagar', pontos: 18, carreiras: 24 })
    await editor.salvar.click()

    await biblioteca.cartao('Para apagar').click()
    await page.getByRole('button', { name: 'Apagar esta amostra' }).click()

    const dialogo = page.getByRole('dialog', { name: 'Apagar a amostra?' })
    await expect(dialogo).toBeVisible()
    // O que vai acontecer está escrito, não subentendido.
    await expect(dialogo).toContainText('sai da sua biblioteca de amostras')

    await dialogo.getByRole('button', { name: 'Cancelar' }).click()
    await expect(dialogo).toBeHidden()
  })
})
