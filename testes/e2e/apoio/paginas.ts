import { type Locator, type Page, expect } from '@playwright/test'

/**
 * As telas do app como objetos.
 *
 * Tudo é alcançado por papel e por palavra visível — nunca por classe de CSS.
 * Isso não é só higiene de teste: se um botão não pode ser achado pelo nome que
 * ele mostra, quem usa leitor de tela também não o acha, e o teste que quebra
 * está apontando um defeito de verdade.
 */

export class Armario {
  constructor(private readonly pagina: Page) {}

  aba(nome: 'Trabalhos' | 'Receitas' | 'Materiais' | 'Ajustes'): Locator {
    return this.pagina.getByRole('button', { name: nome, exact: true })
  }

  async irPara(nome: 'Trabalhos' | 'Receitas' | 'Materiais' | 'Ajustes') {
    await this.aba(nome).click()
  }
}

export class TelaInicio {
  readonly armario: Armario
  constructor(private readonly pagina: Page) {
    this.armario = new Armario(pagina)
  }

  get novoTrabalho(): Locator {
    return this.pagina.getByRole('button', { name: 'Começar um trabalho novo' })
  }

  continuar(trabalho: string): Locator {
    return this.pagina.getByRole('button', { name: `Continuar ${trabalho}` })
  }

  async abrir(trabalho: string): Promise<TelaTrabalho> {
    await this.continuar(trabalho).click()
    const tela = new TelaTrabalho(this.pagina)
    await expect(tela.instrucao).toBeVisible()
    return tela
  }
}

export class TelaTrabalho {
  constructor(private readonly pagina: Page) {}

  /** O cabeçalho da etiqueta: "Carreira 3 · 2ª de 18". */
  get rotuloDaCarreira(): Locator {
    return this.pagina.getByRole('heading', { name: /Carreira \d+/ })
  }

  get instrucao(): Locator {
    return this.pagina.locator('.instrucao')
  }

  get proxima(): Locator {
    return this.pagina.getByRole('button', { name: 'Próxima carreira' })
  }

  get voltarUma(): Locator {
    return this.pagina.getByRole('button', { name: 'Voltar uma carreira' })
  }

  get tempoDaPeca(): Locator {
    return this.pagina.getByText('Tempo desta peça').locator('..')
  }

  get relogio(): Locator {
    return this.pagina.getByRole('button', { name: /Pausar|Retomar/ })
  }

  get barraDeProgresso(): Locator {
    return this.pagina.getByRole('progressbar')
  }

  /**
   * Onde ela está no caminho inteiro da peça.
   *
   * Lido dos atributos da barra de progresso, e não do texto na tela: é o mesmo
   * número que o leitor de tela anuncia, então o teste confere a informação que
   * chega a quem não enxerga.
   */
  async posicao(): Promise<{ atual: number; total: number }> {
    const barra = this.barraDeProgresso
    return {
      atual: Number(await barra.getAttribute('aria-valuenow')),
      total: Number(await barra.getAttribute('aria-valuemax')),
    }
  }
}

export class BibliotecaDeAmostras {
  constructor(private readonly pagina: Page) {}

  static async abrir(pagina: Page): Promise<BibliotecaDeAmostras> {
    await new Armario(pagina).irPara('Materiais')
    await pagina.getByRole('button', { name: /^Amostras/ }).click()
    return new BibliotecaDeAmostras(pagina)
  }

  get guardarAmostra(): Locator {
    return this.pagina.getByRole('button', { name: 'Guardar uma amostra' })
  }

  cartao(nome: string): Locator {
    return this.pagina.getByRole('button').filter({ hasText: nome })
  }

  async novaAmostra(): Promise<EditorDeAmostra> {
    await this.guardarAmostra.click()
    const editor = new EditorDeAmostra(this.pagina)
    await expect(editor.nome).toBeVisible()
    return editor
  }
}

export class EditorDeAmostra {
  constructor(private readonly pagina: Page) {}

  get nome(): Locator {
    return this.pagina.getByLabel(/^Nome da amostra/)
  }
  get ponto(): Locator {
    return this.pagina.getByLabel(/^Ponto usado/)
  }
  get pontosEm10cm(): Locator {
    return this.pagina.getByLabel('Pontos em 10 cm', { exact: true }).first()
  }
  get carreirasEm10cm(): Locator {
    return this.pagina.getByLabel('Carreiras em 10 cm', { exact: true }).first()
  }
  get foiBlocada(): Locator {
    return this.pagina.getByRole('switch', { name: /Esta amostra foi blocada/ })
  }
  get depoisDeBlocar(): Locator {
    return this.pagina.getByRole('group', { name: 'Depois de blocar' })
  }
  get salvar(): Locator {
    return this.pagina.getByRole('button', { name: 'Salvar amostra' })
  }
  get apagar(): Locator {
    return this.pagina.getByRole('button', { name: 'Apagar esta amostra' })
  }

  /** Os quatro campos que só existem depois que ela diz que blocou. */
  campoDepois(qual: 'pontos' | 'carreiras' | 'largura' | 'altura'): Locator {
    const ordem = { pontos: 0, carreiras: 1, largura: 2, altura: 3 }
    return this.depoisDeBlocar.getByRole('spinbutton').nth(ordem[qual])
  }

  async preencher(dados: {
    nome: string
    ponto?: string
    pontos: number
    carreiras: number
    blocada?: { pontos: number; carreiras: number; largura?: number; altura?: number }
  }) {
    await this.nome.fill(dados.nome)
    if (dados.ponto) await this.ponto.fill(dados.ponto)
    await this.pontosEm10cm.fill(String(dados.pontos))
    await this.carreirasEm10cm.fill(String(dados.carreiras))

    if (dados.blocada) {
      await this.foiBlocada.click()
      await expect(this.depoisDeBlocar).toBeVisible()
      await this.campoDepois('pontos').fill(String(dados.blocada.pontos))
      await this.campoDepois('carreiras').fill(String(dados.blocada.carreiras))
      if (dados.blocada.largura) await this.campoDepois('largura').fill(String(dados.blocada.largura))
      if (dados.blocada.altura) await this.campoDepois('altura').fill(String(dados.blocada.altura))
    }
  }
}
