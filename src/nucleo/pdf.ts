// Leitura de receitas em PDF.
//
// A maioria das receitas circula em PDF, então digitar tudo à mão é o maior
// atrito do app. Aqui o arquivo vira texto — e com as quebras de linha certas,
// que é o que mais importa: o interpretador é feito de uma carreira por linha,
// então juntar tudo num parágrafo só destruiria a receita.

/** Sobra da mesma linha: itens com altura parecida pertencem à mesma carreira. */
const TOLERANCIA_LINHA = 3

export interface LeituraPdf {
  texto: string
  paginas: number
  /**
   * PDF feito de imagem escaneada não tem texto para extrair. Vale avisar em vez
   * de devolver um texto vazio sem explicação.
   */
  pareceDigitalizado: boolean
}

interface ItemDeTexto {
  str: string
  transform: number[]
  hasEOL?: boolean
}

/**
 * O pdf.js é grande e quase ninguém abre um PDF na primeira visita, então ele só
 * é baixado quando alguém escolhe um arquivo de verdade. A importação fica
 * guardada para o segundo PDF não pagar o download de novo.
 */
let pdfjsCarregado:
  | Promise<{
      biblioteca: typeof import('pdfjs-dist')
      Trabalhador: new () => Worker
    }>
  | undefined

function carregarPdfjs() {
  pdfjsCarregado ??= Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?worker&inline'),
  ]).then(([biblioteca, modulo]) => ({ biblioteca, Trabalhador: modulo.default }))
  return pdfjsCarregado
}

export async function lerPdf(arquivo: File | Blob): Promise<LeituraPdf> {
  const { biblioteca, Trabalhador } = await carregarPdfjs()

  // Porta em vez de endereço: o trabalhador vai embutido no pacote, então
  // funciona igual no site hospedado e no arquivo único do artefato. Uma porta
  // nova a cada leitura, porque encerrar a tarefa encerra o trabalhador junto.
  biblioteca.GlobalWorkerOptions.workerPort = new Trabalhador()

  const tarefa = biblioteca.getDocument({ data: await arquivo.arrayBuffer() })

  try {
    const documento = await tarefa.promise
    const quantasPaginas = documento.numPages

    const paginas: string[] = []
    for (let numero = 1; numero <= quantasPaginas; numero++) {
      const pagina = await documento.getPage(numero)
      const conteudo = await pagina.getTextContent()
      paginas.push(montarLinhas(conteudo.items as ItemDeTexto[]))
    }

    const texto = paginas.join('\n').replace(/\n{3,}/g, '\n\n').trim()

    return {
      texto,
      paginas: quantasPaginas,
      // Umas poucas letras num documento inteiro quer dizer PDF de imagem.
      pareceDigitalizado: texto.replace(/\s/g, '').length < 20 * quantasPaginas,
    }
  } finally {
    await tarefa.destroy()
  }
}

/**
 * Reconstrói as linhas a partir da posição de cada pedaço de texto na página.
 * O PDF não guarda linhas, guarda pedaços soltos com coordenadas.
 */
function montarLinhas(itens: ItemDeTexto[]): string {
  const linhas: { altura: number; pedacos: { x: number; texto: string }[] }[] = []

  for (const item of itens) {
    if (!item.str) continue
    const x = item.transform[4]
    const altura = item.transform[5]

    const existente = linhas.find((linha) => Math.abs(linha.altura - altura) <= TOLERANCIA_LINHA)
    if (existente) existente.pedacos.push({ x, texto: item.str })
    else linhas.push({ altura, pedacos: [{ x, texto: item.str }] })
  }

  return linhas
    // De cima para baixo: no PDF, altura maior é mais acima na página.
    .sort((a, b) => b.altura - a.altura)
    .map((linha) =>
      linha.pedacos
        .sort((a, b) => a.x - b.x)
        .map((pedaco) => pedaco.texto)
        .join('')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter((linha) => linha.length > 0)
    .join('\n')
}
