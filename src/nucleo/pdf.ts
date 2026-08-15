// Leitura de receitas em PDF.
//
// A maioria das receitas circula em PDF, então digitar tudo à mão é o maior
// atrito do app. Aqui o arquivo vira texto — e com as quebras de linha certas,
// que é o que mais importa: o interpretador é feito de uma carreira por linha,
// então juntar tudo num parágrafo só destruiria a receita.

// Só tipo: some na compilação, então não puxa o pdf.js para o pacote principal.
import type { PDFDocumentProxy } from 'pdfjs-dist'

// A build "moderna" do pdf.js usa a leitura por stream (ReadableStream.values),
// que o Safari não suporta direito — quebra com "undefined is not a function"
// bem no meio da leitura, e é exatamente onde o iPhone da Camila trava, porque
// lá só existe Safari. A build "legacy" evita essa API e funciona em todo lugar.

/**
 * Descobre o que é o arquivo olhando o conteúdo, não o nome.
 *
 * O iPhone às vezes entrega o arquivo sem tipo e sem extensão — vindo do app
 * Arquivos, do WhatsApp ou de um anexo de e-mail. Aí só os primeiros bytes
 * dizem a verdade. Todo PDF começa com "%PDF-".
 */
export async function descobrirTipo(arquivo: File | Blob): Promise<'pdf' | 'imagem' | 'texto'> {
  const inicio = new Uint8Array(await arquivo.slice(0, 12).arrayBuffer())
  const assinatura = (bytes: number[]) => bytes.every((b, i) => inicio[i] === b)

  if (assinatura([0x25, 0x50, 0x44, 0x46])) return 'pdf' // %PDF
  if (assinatura([0xff, 0xd8, 0xff])) return 'imagem' // JPEG
  if (assinatura([0x89, 0x50, 0x4e, 0x47])) return 'imagem' // PNG
  if (assinatura([0x47, 0x49, 0x46])) return 'imagem' // GIF
  // HEIC e WebP guardam o tipo depois do tamanho, na posição 4.
  const marca = String.fromCharCode(...inicio.slice(4, 12))
  if (/^ftyp(heic|heif|hevc|mif1|msf1)/.test(marca)) return 'imagem'
  if (/^WEBP/.test(String.fromCharCode(...inicio.slice(8, 12)))) return 'imagem'

  const nome = 'name' in arquivo ? arquivo.name.toLowerCase() : ''
  if (arquivo.type.startsWith('image/') || /\.(jpe?g|png|gif|heic|heif|webp|bmp)$/.test(nome)) {
    return 'imagem'
  }
  return 'texto'
}

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
      biblioteca: typeof import('pdfjs-dist/legacy/build/pdf.mjs')
      Trabalhador: new () => Worker
    }>
  | undefined

function carregarPdfjs() {
  pdfjsCarregado ??= Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker&inline'),
  ]).then(([biblioteca, modulo]) => ({ biblioteca, Trabalhador: modulo.default }))
  return pdfjsCarregado
}

/**
 * Uma leitura por vez.
 *
 * O pdf.js escolhe o trabalhador por uma variável global, e encerrar uma leitura
 * encerra o trabalhador junto. Duas leituras ao mesmo tempo acabam dividindo o
 * mesmo trabalhador, e a primeira a terminar deixa a outra pendurada para sempre.
 */
let fila: Promise<unknown> = Promise.resolve()

function enfileirar<T>(trabalho: () => Promise<T>): Promise<T> {
  const proxima = fila.then(trabalho, trabalho)
  fila = proxima.catch(() => undefined)
  return proxima
}

async function comDocumento<T>(
  arquivo: File | Blob,
  usar: (documento: PDFDocumentProxy) => Promise<T>,
): Promise<T> {
  // O arquivo é lido ANTES da fila: nenhuma espera pode acontecer entre
  // apontar o trabalhador e abrir o documento, senão outra leitura se mete
  // no meio e as duas passam a usar o mesmo trabalhador.
  const dados = await arquivo.arrayBuffer()
  const { biblioteca, Trabalhador } = await carregarPdfjs()

  return enfileirar(async () => {
    biblioteca.GlobalWorkerOptions.workerPort = new Trabalhador()
    const tarefa = biblioteca.getDocument({ data: dados })
    try {
      return await usar(await tarefa.promise)
    } finally {
      await tarefa.destroy()
    }
  })
}

export async function lerPdf(arquivo: File | Blob): Promise<LeituraPdf> {
  return comDocumento(arquivo, async (documento) => {
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
  })
}

/**
 * Desenha uma página do PDF como imagem.
 *
 * Serve para o caso do PDF escaneado, que não tem texto para extrair. Em vez de
 * embutir um reconhecedor de imagem de vários megabytes — que ainda erra número,
 * justo o que mais importa numa receita — a página vira imagem e quem lê é o
 * próprio celular: no iPhone, segurar o dedo na imagem oferece copiar o texto.
 */
export async function desenharPagina(
  arquivo: File | Blob,
  numero: number,
  larguraAlvo = 1400,
): Promise<Blob> {
  return comDocumento(arquivo, async (documento) => {
    const pagina = await documento.getPage(numero)

    const tamanhoNatural = pagina.getViewport({ scale: 1 })
    // Escala generosa: reconhecimento de texto erra muito em imagem pequena.
    const escala = Math.min(3, Math.max(1, larguraAlvo / tamanhoNatural.width))
    const viewport = pagina.getViewport({ scale: escala })

    const tela = document.createElement('canvas')
    tela.width = Math.round(viewport.width)
    tela.height = Math.round(viewport.height)
    const contexto = tela.getContext('2d')
    if (!contexto) throw new Error('Não consegui desenhar a página.')

    // Fundo branco: PDF sem fundo vira imagem transparente, e aí o texto some.
    contexto.fillStyle = '#ffffff'
    contexto.fillRect(0, 0, tela.width, tela.height)

    // "print" em vez de "display" de propósito: no modo de tela, o pdf.js avança
    // o desenho por quadro de animação, que o navegador congela quando o app sai
    // da frente. Como aqui a tela nem é mostrada — vira imagem — o modo de
    // impressão termina o trabalho mesmo se ela trocar de app no meio.
    await pagina.render({ canvas: tela, canvasContext: contexto, viewport, intent: 'print' })
      .promise

    return await new Promise<Blob>((resolve, reject) => {
      tela.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Não consegui gerar a imagem.'))),
        'image/png',
      )
    })
  })
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
