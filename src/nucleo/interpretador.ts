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
  textoOriginal: string
  itens: Item[]
  /** Frase única com tudo expandido, para leitura rápida. */
  resumo: string
  consome: number
  produz: number
  totalDeclarado?: number
  /** Preenchido quando a conta não bate com o total que a receita declara. */
  divergencia?: string
  avisos: string[]
}

export interface Receita {
  carreiras: Carreira[]
  preambulo: string[]
  avisos: string[]
}

// --------------------------------------------------------------------------
// Leitura das linhas

const CABECALHO_NOMEADO =
  /^\s*(?:carr?(?:eiras?)?|voltas?|fileiras?|rodadas?|rod)\s*\.?\s*(\d+)\s*(?:(?:[-–—]|\s+a\s+|\s+ate\s+)\s*(\d+))?\s*[:.)\-–—]?\s*(.*)$/i

const CABECALHO_NUMERICO = /^\s*(\d+)\s*(?:(?:[-–—]|\s+a\s+|\s+ate\s+)\s*(\d+))?\s*[:.)]\s*(.+)$/

const TOTAIS = [
  /=\s*(\d+)\s*(?:pontos?|pts?|p|m|malhas?)?\s*$/i,
  /\(\s*(\d+)\s*(?:pontos?|pts?|malhas?)\s*\)\s*$/i,
  /[—–]\s*(\d+)\s*(?:pontos?|pts?|malhas?)\s*$/i,
]

export function interpretar(texto: string): Receita {
  const linhas = texto.split(/\r?\n/)
  const carreiras: Carreira[] = []
  const preambulo: string[] = []
  const avisos: string[] = []

  interface Bruta {
    numeros: number[]
    rotulo: string
    corpo: string
  }
  const brutas: Bruta[] = []

  for (const linha of linhas) {
    const limpa = linha.trim()
    if (!limpa) continue

    const semAcento = limpa.normalize('NFD').replace(/[̀-ͯ]/g, '')
    const achado = CABECALHO_NOMEADO.exec(semAcento) ?? CABECALHO_NUMERICO.exec(semAcento)

    if (achado) {
      const inicio = Number(achado[1])
      const fim = achado[2] ? Number(achado[2]) : inicio
      const numeros: number[] = []
      if (fim >= inicio && fim - inicio < 500) {
        for (let n = inicio; n <= fim; n++) numeros.push(n)
      } else {
        numeros.push(inicio)
        avisos.push(`Intervalo estranho na linha "${limpa}". Considerei só a carreira ${inicio}.`)
      }
      // O corpo vem do texto original (com acentos), recortado no mesmo ponto.
      const corpo = limpa.slice(limpa.length - achado[3].length)
      brutas.push({
        numeros,
        rotulo: numeros.length > 1 ? `Carreiras ${inicio} a ${fim}` : `Carreira ${inicio}`,
        corpo,
      })
    } else if (brutas.length === 0) {
      preambulo.push(limpa)
    } else {
      // Continuação da carreira anterior (receita quebrada em várias linhas).
      brutas[brutas.length - 1].corpo += ' ' + limpa
    }
  }

  let disponiveis = 0
  brutas.forEach((bruta, indice) => {
    const carreira = montarCarreira(bruta.numeros, bruta.rotulo, bruta.corpo, indice, disponiveis)
    carreiras.push(carreira)
    // Carreiras repetidas ("Carr 4-6") mantêm a contagem estável a cada volta,
    // então o que alimenta a próxima é sempre o que a última volta produziu.
    disponiveis = carreira.produz
  })

  if (carreiras.length === 0 && texto.trim()) {
    avisos.push(
      'Não encontrei nenhuma carreira. Escreva cada carreira em uma linha, começando por "Carreira 1:".',
    )
  }

  return { carreiras, preambulo, avisos }
}

function montarCarreira(
  numeros: number[],
  rotulo: string,
  corpoBruto: string,
  indice: number,
  disponiveis: number,
): Carreira {
  const avisos: string[] = []
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

  let divergencia: string | undefined
  if (totalDeclarado !== undefined && totalDeclarado !== produz) {
    divergencia =
      `A receita diz ${totalDeclarado} pontos, mas a conta dá ${produz}. ` +
      'Confira essa carreira antes de seguir.'
  }

  if (disponiveis > 0 && consome > disponiveis) {
    avisos.push(
      `Essa carreira usa ${consome} pontos, mas a anterior deixou só ${disponiveis}.`,
    )
  }

  return {
    indice,
    numeros,
    rotulo,
    textoOriginal: corpoBruto.trim(),
    itens,
    resumo: resumir(itens),
    consome,
    produz,
    totalDeclarado,
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
