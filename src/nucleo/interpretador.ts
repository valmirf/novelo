// Interpretador de receitas de tricô e crochê escritas em português.
//
// Recebe o texto solto que a pessoa copiou de um PDF, blog ou caderno e devolve
// a receita quebrada carreira por carreira, com as repetições já expandidas e a
// contagem de pontos conferida. É o coração do app: nenhum contador de carreiras
// do mercado faz isso.

import { AVULSOS, extrairPonto, mascarar, semAcento } from './lexico'

export type Repeticoes = number | 'ateOFim'

/** Árvore crua, logo depois da leitura do texto. */
export type Instrucao =
  | {
      tipo: 'ponto'
      quantidade: number | 'restante'
      sigla: string
      nome: string
      consomeUnidade: number
      produzUnidade: number
      detalhe?: string
      textoOriginal: string
    }
  | { tipo: 'grupo'; repeticoes: Repeticoes; filhos: Instrucao[]; textoOriginal: string }
  | { tipo: 'nota'; textoOriginal: string }

/** Árvore já resolvida, com todos os números concretos, pronta para a tela. */
export type Item =
  | {
      tipo: 'ponto'
      quantidade: number
      sigla: string
      nome: string
      detalhe?: string
      rotulo: string
    }
  | { tipo: 'grupo'; repeticoes: number; filhos: Item[]; rotulo: string }
  | { tipo: 'nota'; rotulo: string }

export interface Carreira {
  /** Posição na lista, começando em 0. */
  indice: number
  /** Números que essa entrada cobre. "Carr 4-6" vira [4, 5, 6]. */
  numeros: number[]
  rotulo: string
  /** Parte da receita a que pertence: "Aula 02", "Decote", "Mangas". */
  secao?: string
  /** "LD" (lado direito) ou "LA" (lado avesso), quando a receita diz. */
  lado?: string
  /** A linha como a receita escreveu. É o que vale quando não entendi o resto. */
  textoOriginal: string
  itens: Item[]
  /** Frase única com tudo expandido, para leitura rápida. */
  resumo: string
  consome: number
  produz: number
  totalDeclarado?: number
  /**
   * Só é verdadeiro quando a contagem foi mesmo apurada: todos os pontos
   * reconhecidos e nenhuma instrução em aberto. Receita de tricô costuma dizer
   * "M até o Marc 1", que não tem número nenhum — e aí a conta é um chute.
   * Mostrar número inventado é pior do que não mostrar número.
   */
  contagemConfiavel: boolean
  /** Preenchido quando a conta não bate com o total que a receita declara. */
  divergencia?: string
  avisos: string[]
}

export interface Receita {
  carreiras: Carreira[]
  preambulo: string[]
  /** Texto entre as carreiras: explicações, repetições de bloco, observações. */
  recados: { depoisDaCarreira: number; texto: string }[]
  /** Partes encontradas, na ordem: "Decote", "Cavas", "Mangas". */
  secoes: string[]
  avisos: string[]
}

// --------------------------------------------------------------------------
// Leitura das linhas

// Aceita "Carr 3", "Carreiras 4 a 6", "Carr decote 1" e o "(LD)"/"(LA)" que as
// receitas de tricô põem para dizer de que lado do trabalho a carreira é feita.
const CABECALHO_NOMEADO =
  /^\s*(?:carr?(?:eiras?)?|voltas?|fileiras?|rodadas?|rod)\s*\.?\s*([a-zà-ÿ]+\s+)?(\d+)\s*(?:(?:[-–—]|\s+a\s+|\s+ate\s+)\s*(\d+))?\s*(?:\(([^)]{1,24})\))?\s*[:.)\-–—]?\s*(.*)$/i

// Número solto só vira carreira com dois-pontos ou ponto final. Sem isso,
// "218) pts" no meio de um parágrafo virava a "carreira 218".
const CABECALHO_NUMERICO = /^\s*(\d+)\s*(?:(?:[-–—]|\s+a\s+|\s+ate\s+)\s*(\d+))?\s*[:.]\s*(.+)$/

/** Corpo que é só uma unidade de medida não é carreira, é sobra de parágrafo. */
const SO_UNIDADE = /^(?:pts?|pontos?|sts?|malhas?|carr?s?|cm|m)\b\s*[).]?\s*$/i

/** Títulos de parte: a numeração das carreiras recomeça a cada um deles. */
const TITULO_DE_SECAO =
  /^(?:aula|parte|etapa|passo|bloco)\s*\d*\s*[-–—:]?\s*$|^(?:decote|cavas?|mangas?|gola|punhos?|corpo|costas|frente(?:\s+\w+)?|separa[cç][aã]o(?:\s+de\s+partes)?|acabamento|montagem|barra|capuz|bolsos?|listras em alto relevo|carreiras encurtadas)\b/i

const TOTAIS = [
  /=\s*(\d+)\s*(?:pontos?|pts?|p|m|malhas?)?\s*$/i,
  /\(\s*(\d+)\s*(?:pontos?|pts?|malhas?)\s*\)\s*$/i,
  /[—–]\s*(\d+)\s*(?:pontos?|pts?|malhas?)\s*$/i,
]

export function interpretar(texto: string): Receita {
  const linhas = texto.split(/\r?\n/)
  const carreiras: Carreira[] = []
  const preambulo: string[] = []
  const recados: { depoisDaCarreira: number; texto: string }[] = []
  const avisos: string[] = []

  interface Bruta {
    numeros: number[]
    rotulo: string
    /** "LD" (lado direito) ou "LA" (lado avesso), quando a receita diz. */
    lado?: string
    secao?: string
    corpo: string
  }
  const brutas: Bruta[] = []
  let secaoAtual: string | undefined

  for (const linha of linhas) {
    const limpa = linha.trim()
    if (!limpa) continue

    const semAcento = limpa.normalize('NFD').replace(/[̀-ͯ]/g, '')

    // Título de parte precisa ser testado antes: "Decote" não é carreira.
    if (limpa.length <= 60 && TITULO_DE_SECAO.test(semAcento)) {
      secaoAtual = limpa.replace(/[:\-–—\s]+$/, '')
      continue
    }

    const nomeado = CABECALHO_NOMEADO.exec(semAcento)
    const numerico = nomeado ? null : CABECALHO_NUMERICO.exec(semAcento)

    // Os dois formatos têm grupos diferentes; aqui viram um formato só.
    const cabecalho = nomeado
      ? { qualificador: nomeado[1], inicio: nomeado[2], fim: nomeado[3], lado: nomeado[4], corpo: nomeado[5] }
      : numerico
        ? { qualificador: undefined, inicio: numerico[1], fim: numerico[2], lado: undefined, corpo: numerico[3] }
        : null

    if (cabecalho && !SO_UNIDADE.test(cabecalho.corpo)) {
      const inicio = Number(cabecalho.inicio)
      const fim = cabecalho.fim ? Number(cabecalho.fim) : inicio
      const numeros: number[] = []
      if (fim >= inicio && fim - inicio < 500) {
        for (let n = inicio; n <= fim; n++) numeros.push(n)
      } else {
        numeros.push(inicio)
        avisos.push(`Intervalo estranho na linha "${limpa}". Considerei só a carreira ${inicio}.`)
      }

      const qualificador = cabecalho.qualificador?.trim()
      const nomeBase = numeros.length > 1 ? `Carreiras ${inicio} a ${fim}` : `Carreira ${inicio}`

      // O corpo vem do texto original (com acentos), recortado no mesmo ponto.
      const corpo = limpa.slice(limpa.length - cabecalho.corpo.length)
      brutas.push({
        numeros,
        rotulo: qualificador ? `${nomeBase} do ${qualificador}` : nomeBase,
        lado: cabecalho.lado?.trim().toUpperCase(),
        secao: secaoAtual,
        corpo,
      })
    } else if (brutas.length === 0) {
      preambulo.push(limpa)
    } else if (ehContinuacao(brutas[brutas.length - 1].corpo, limpa)) {
      brutas[brutas.length - 1].corpo += ' ' + limpa
    } else {
      // Parágrafo entre carreiras: explicação, repetição de bloco, aviso de
      // direitos autorais. Vira recado à parte — antes ia parar dentro da
      // carreira anterior e virava instrução falsa.
      recados.push({ depoisDaCarreira: brutas.length - 1, texto: limpa })
    }
  }

  let disponiveis = 0
  brutas.forEach((bruta, indice) => {
    const carreira = montarCarreira(bruta, indice, disponiveis)
    carreiras.push(carreira)
    // Carreiras repetidas ("Carr 4-6") mantêm a contagem estável a cada volta,
    // então o que alimenta a próxima é sempre o que a última volta produziu.
    // Se a contagem não é confiável, a corrente se perde e recomeça do zero.
    disponiveis = carreira.contagemConfiavel ? carreira.produz : 0
  })

  if (carreiras.length === 0 && texto.trim()) {
    avisos.push(
      'Não encontrei nenhuma carreira. Escreva cada carreira em uma linha, começando por "Carreira 1:".',
    )
  }

  const secoes = [...new Set(carreiras.map((c) => c.secao).filter((s): s is string => !!s))]

  return { carreiras, preambulo, recados, secoes, avisos }
}

/**
 * Decide se a linha é o resto da carreira anterior ou um parágrafo novo.
 *
 * Linha quebrada por largura da página continua em minúscula, ou vem logo depois
 * de uma vírgula. Parágrafo novo começa com maiúscula depois de frase fechada.
 */
function ehContinuacao(corpoAnterior: string, linha: string): boolean {
  const anterior = corpoAnterior.trimEnd()
  const terminouAberto = /[,;(\-–—]$/.test(anterior) || !/[.!?:]$/.test(anterior)
  const comecaEmMinuscula = /^[a-zà-ÿ(0-9]/.test(linha)
  return terminouAberto && comecaEmMinuscula
}

/** Frases que dizem "vá até tal ponto" sem dizer quantos pontos são. */
const ALVO_SEM_NUMERO = /\bate\s+(?:o\s+|a\s+|os\s+|as\s+)?(?:marc|marcador|faltar|o pt|o ponto|antes)/

function montarCarreira(
  bruta: { numeros: number[]; rotulo: string; lado?: string; secao?: string; corpo: string },
  indice: number,
  disponiveis: number,
): Carreira {
  const avisos: string[] = []
  const corpoBruto = bruta.corpo
  let corpo = corpoBruto.trim()
  let totalDeclarado: number | undefined

  for (const regex of TOTAIS) {
    const achado = regex.exec(corpo)
    if (achado) {
      totalDeclarado = Number(achado[1])
      corpo = corpo.slice(0, achado.index).trim().replace(/[,;]$/, '')
      break
    }
  }

  if ((corpo.match(/\*/g)?.length ?? 0) % 2 === 1) {
    avisos.push('Tem um asterisco sozinho nessa carreira. Confira se falta fechar a repetição.')
  }

  const brutas = analisar(corpo)
  const estado = { restantes: disponiveis, avisos }
  const { itens, consome, produz } = resolver(brutas, estado)

  // A contagem só vale se eu entendi a carreira inteira. Duas coisas a derrubam:
  // instrução que não reconheci, e alvo sem número ("M até o Marc 1").
  const semAcento = corpo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const temAlvoSemNumero = ALVO_SEM_NUMERO.test(semAcento)
  const temTrechoNaoLido = itens.some((item) => item.tipo === 'nota')
  const contagemConfiavel =
    itens.length > 0 && !temAlvoSemNumero && !temTrechoNaoLido && (disponiveis > 0 || consome === 0)

  let divergencia: string | undefined
  if (totalDeclarado !== undefined && contagemConfiavel && totalDeclarado !== produz) {
    divergencia =
      `A receita diz ${totalDeclarado} pontos, mas a conta dá ${produz}. ` +
      'Confira essa carreira antes de seguir.'
  }

  if (contagemConfiavel && disponiveis > 0 && consome > disponiveis) {
    avisos.push(`Essa carreira usa ${consome} pontos, mas a anterior deixou só ${disponiveis}.`)
  }

  return {
    indice,
    numeros: bruta.numeros,
    rotulo: bruta.rotulo,
    secao: bruta.secao,
    lado: bruta.lado,
    textoOriginal: corpoBruto.trim(),
    itens,
    resumo: resumir(itens),
    consome,
    produz,
    totalDeclarado,
    contagemConfiavel,
    divergencia,
    avisos,
  }
}

// --------------------------------------------------------------------------
// Leitura da sequência de instruções

const ABERTURAS: Record<string, string> = { '(': ')', '[': ']', '{': '}' }

function analisar(texto: string): Instrucao[] {
  const instrucoes: Instrucao[] = []
  let buffer = ''
  let i = 0

  const descarregar = () => {
    const trecho = buffer.trim()
    buffer = ''
    if (!trecho) return
    const instrucao = lerTrecho(trecho)
    if (instrucao) instrucoes.push(instrucao)
  }

  while (i < texto.length) {
    const ch = texto[i]

    if (ABERTURAS[ch] || ch === '*') {
      descarregar()
      const fechamento = ABERTURAS[ch] ?? '*'
      const fim = acharFechamento(texto, i, ch, fechamento)
      if (fim === -1) {
        // Delimitador sem par: trata o resto como texto comum.
        buffer += texto.slice(i)
        i = texto.length
        break
      }
      const interno = texto.slice(i + 1, fim)
      const { repeticoes, consumido } = lerSufixoRepeticao(texto.slice(fim + 1))
      instrucoes.push({
        tipo: 'grupo',
        repeticoes,
        filhos: analisar(interno),
        textoOriginal: texto.slice(i, fim + 1 + consumido).trim(),
      })
      i = fim + 1 + consumido
      continue
    }

    if (ch === ',' || ch === ';') {
      descarregar()
      i++
      continue
    }

    buffer += ch
    i++
  }

  descarregar()
  return instrucoes
}

function acharFechamento(texto: string, inicio: number, abertura: string, fechamento: string): number {
  if (abertura === '*') return texto.indexOf('*', inicio + 1)
  let profundidade = 0
  for (let i = inicio; i < texto.length; i++) {
    if (texto[i] === abertura) profundidade++
    else if (texto[i] === fechamento) {
      profundidade--
      if (profundidade === 0) return i
    }
  }
  return -1
}

const SUFIXO_REPETICAO =
  /^\s*(?:,\s*)?(?:repetir|repita|rep|fazer|faca|faça)?\s*(?:de\s*\*?\s*(?:a|ate|até)\s*\*?\s*)?(?:x\s*(\d+)|(\d+)\s*(?:x|vezes|vez)\b|(?:ate|até)\s+o\s+(?:fim|final)(?:\s+d[ao]\s+\w+)?)/i

function lerSufixoRepeticao(resto: string): { repeticoes: Repeticoes; consumido: number } {
  const achado = SUFIXO_REPETICAO.exec(resto)
  if (!achado) return { repeticoes: 1, consumido: 0 }
  const numero = achado[1] ?? achado[2]
  return {
    repeticoes: numero ? Number(numero) : 'ateOFim',
    consumido: achado[0].length,
  }
}

// --------------------------------------------------------------------------
// Leitura de um trecho solto ("3 pb", "2 pb juntos", "1 pb em cada ponto")

const RESTANTE = /\b(?:em (?:cada|todos os|todas as)\s+\w+|ate o (?:fim|final)(?: da \w+)?)\b/

const MODIFICADORES = /\bjuntos?\b|\bno mesmo (?:ponto|pt|lugar)\b/g

function lerTrecho(trechoOriginal: string): Instrucao | null {
  // `original` guarda os acentos para mostrar na tela; `busca` é a mesma frase
  // sem acento e com o MESMO comprimento, então as posições valem nas duas.
  const original = trechoOriginal.trim().replace(/\s+/g, ' ')
  if (!original) return null
  const busca = semAcento(original).replace(/\./g, ' ').trimEnd()
  if (!busca) return null

  if (AVULSOS.some((avulso) => busca.includes(avulso))) {
    return { tipo: 'nota', textoOriginal: original }
  }

  // Montagem de tricô e correntinha de base: não consomem nada.
  const montagem = /^(?:montar|monte|montagem de|fazer)\s+(\d+)\s*(?:pontos?|pts?|m|malhas?|corr\w*)?$/.exec(busca)
  if (montagem) {
    return ponto(Number(montagem[1]), 'montagem', 'ponto montado', 0, 1, original)
  }

  // Recorte que ainda vale analisar, em posições válidas nas duas versões.
  let inicio = 0
  let fim = busca.length
  let quantidade: number | 'restante' = 1

  const restante = RESTANTE.exec(busca)
  if (restante) {
    quantidade = 'restante'
    fim = Math.min(fim, restante.index)
  }

  const numeroInicial = /^(\d+)\s+/.exec(busca.slice(inicio, fim))
  if (numeroInicial) {
    if (quantidade !== 'restante') quantidade = Number(numeroInicial[1])
    inicio += numeroInicial[0].length
  }

  const regiao = busca.slice(inicio, fim)

  // "2 pb juntos" — uma diminuição que engole N pontos e devolve 1.
  const juntos = /\bjuntos?\b/.test(regiao)
  // "3 pa no mesmo ponto" — um aumento que gera N pontos a partir de 1.
  const mesmoPonto = /\bno mesmo (?:ponto|pt|lugar)\b/.test(regiao)

  // "pular 2 pontos" — some com pontos da carreira anterior sem produzir nada.
  if (/^(?:pular|pule|saltar|salte)\b/.test(regiao)) {
    const quantos = /(\d+)/.exec(regiao)
    const numero = quantos ? Number(quantos[1]) : typeof quantidade === 'number' ? quantidade : 1
    return ponto(numero, 'pular', 'ponto pulado', 1, 0, original)
  }

  const mascarada = mascarar(regiao, MODIFICADORES)
  const achado = extrairPonto(mascarada)

  if (!achado) return { tipo: 'nota', textoOriginal: original }

  const { ponto: definicao, depois } = achado
  let consomeUnidade = definicao.consome
  let produzUnidade = definicao.produz
  let quantidadeFinal = quantidade

  if (juntos && typeof quantidade === 'number' && quantidade > 1) {
    consomeUnidade = quantidade
    produzUnidade = 1
    quantidadeFinal = 1
  } else if (mesmoPonto && typeof quantidade === 'number' && quantidade > 1) {
    consomeUnidade = 1
    produzUnidade = quantidade
    quantidadeFinal = 1
  }

  // Primeira carreira de amigurumi: "6 pb no anel mágico" não consome nada.
  if (/\banel\b|\bcirculo\b/.test(depois)) consomeUnidade = 0

  // O complemento ("no anel mágico", "na alça de trás") sai do texto original,
  // com os acentos, e não da versão usada para busca.
  const detalhe = limparPelaMascara(
    original.slice(inicio + achado.fim, fim),
    mascarada.slice(achado.fim),
  )

  return ponto(
    quantidadeFinal,
    definicao.sigla,
    definicao.nome,
    consomeUnidade,
    produzUnidade,
    original,
    detalhe || undefined,
  )
}

/** Devolve o texto original sem os pedaços que a máscara apagou. */
function limparPelaMascara(original: string, mascarada: string): string {
  let saida = ''
  for (let i = 0; i < original.length; i++) {
    if (mascarada[i] !== ' ' || original[i] === ' ') saida += original[i]
  }
  return saida.replace(/\s+/g, ' ').trim()
}

function ponto(
  quantidade: number | 'restante',
  sigla: string,
  nome: string,
  consomeUnidade: number,
  produzUnidade: number,
  textoOriginal: string,
  detalhe?: string,
): Instrucao {
  return {
    tipo: 'ponto',
    quantidade,
    sigla,
    nome,
    consomeUnidade,
    produzUnidade,
    detalhe,
    textoOriginal: textoOriginal.trim(),
  }
}

// --------------------------------------------------------------------------
// Resolução: transforma "restante" e "até o fim" em números concretos

interface Estado {
  restantes: number
  avisos: string[]
}

function resolver(
  brutas: Instrucao[],
  estado: Estado,
  dentroDeGrupo = false,
): { itens: Item[]; consome: number; produz: number } {
  const itens: Item[] = []
  let consome = 0
  let produz = 0

  for (const bruta of brutas) {
    if (bruta.tipo === 'nota') {
      itens.push({ tipo: 'nota', rotulo: bruta.textoOriginal })
      continue
    }

    if (bruta.tipo === 'ponto') {
      let quantidade: number
      if (bruta.quantidade === 'restante') {
        if (dentroDeGrupo) {
          estado.avisos.push(
            `"${bruta.textoOriginal}" está dentro de uma repetição. Contei como 1 ponto.`,
          )
          quantidade = 1
        } else if (bruta.consomeUnidade > 0) {
          quantidade = Math.max(0, Math.floor(estado.restantes / bruta.consomeUnidade))
        } else {
          estado.avisos.push(`Não consegui saber quantos "${bruta.nome}" fazer aqui. Contei 1.`)
          quantidade = 1
        }
      } else {
        quantidade = bruta.quantidade
      }

      const c = quantidade * bruta.consomeUnidade
      const p = quantidade * bruta.produzUnidade
      consome += c
      produz += p
      estado.restantes -= c

      itens.push({
        tipo: 'ponto',
        quantidade,
        sigla: bruta.sigla,
        nome: bruta.nome,
        detalhe: bruta.detalhe,
        rotulo: rotularPonto(quantidade, bruta.nome, bruta.detalhe),
      })
      continue
    }

    // Grupo. Resolve os filhos uma vez para saber o custo de uma volta, e só
    // depois multiplica. Assim "(1 pb, 1 aum) x30" continua sendo três itens na
    // tela, não noventa.
    const sondagem = resolver(bruta.filhos, { restantes: estado.restantes, avisos: [] }, true)

    let repeticoes: number
    if (bruta.repeticoes === 'ateOFim') {
      if (sondagem.consome > 0) {
        repeticoes = Math.max(0, Math.floor(estado.restantes / sondagem.consome))
      } else {
        estado.avisos.push('Não consegui calcular quantas vezes repetir até o fim. Contei 1 vez.')
        repeticoes = 1
      }
    } else {
      repeticoes = bruta.repeticoes
    }

    const filhos = resolver(bruta.filhos, { restantes: estado.restantes, avisos: estado.avisos }, true)
    const c = filhos.consome * repeticoes
    const p = filhos.produz * repeticoes
    consome += c
    produz += p
    estado.restantes -= c

    itens.push({
      tipo: 'grupo',
      repeticoes,
      filhos: filhos.itens,
      rotulo:
        repeticoes === 1
          ? resumir(filhos.itens)
          : `repetir ${repeticoes} vezes: ${resumir(filhos.itens)}`,
    })
  }

  return { itens, consome, produz }
}

function rotularPonto(quantidade: number, nome: string, detalhe?: string): string {
  const plural = quantidade === 1 ? nome : pluralizar(nome)
  const base = `${quantidade} ${plural}`
  return detalhe ? `${base} ${detalhe}` : base
}

function pluralizar(nome: string): string {
  return nome
    .split(' ')
    .map((palavra) => {
      if (/[aeiou]$/.test(palavra)) return palavra + 's'
      if (/[çsz]$/.test(palavra)) return palavra
      if (/l$/.test(palavra)) return palavra.slice(0, -1) + 'is'
      if (/[mn]$/.test(palavra)) return palavra.slice(0, -1) + 'ns'
      return palavra + 's'
    })
    .join(' ')
}

/** Frase única, legível, com tudo expandido. */
export function resumir(itens: Item[]): string {
  return itens
    .map((item) => {
      if (item.tipo === 'nota') return item.rotulo
      if (item.tipo === 'ponto') return item.rotulo
      return item.rotulo
    })
    .join(', ')
}
