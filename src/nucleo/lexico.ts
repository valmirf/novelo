// Léxico de pontos de crochê e tricô em português do Brasil.
//
// Cada ponto declara quantos pontos da carreira anterior ele CONSOME e quantos
// pontos ele PRODUZ na carreira nova. É desse par que sai a contagem automática:
// um aumento consome 1 e produz 2, uma diminuição consome 2 e produz 1, uma
// correntinha não consome nada e produz 1.

export type Familia = 'croche' | 'trico'

export interface DefinicaoPonto {
  sigla: string
  nome: string
  familia: Familia | 'ambos'
  consome: number
  produz: number
  /** Todas as grafias aceitas, já normalizadas (minúsculas, sem acento). */
  variantes: string[]
}

/** Minúsculas, sem acento, espaços colapsados, sem pontuação de borda. */
export function normalizar(texto: string): string {
  return semAcento(texto).replace(/[.]/g, '').replace(/\s+/g, ' ').trim()
}

/**
 * Minúsculas e sem acento, mas com o mesmo comprimento do original.
 * Manter o comprimento é o que permite achar um ponto no texto sem acento e
 * recortar o pedaço correspondente no texto original, com os acentos no lugar.
 */
export function semAcento(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Troca os trechos que casam pela mesma quantidade de espaços, preservando as posições. */
export function mascarar(texto: string, regex: RegExp): string {
  return texto.replace(regex, (achado) => ' '.repeat(achado.length))
}

export const PONTOS: DefinicaoPonto[] = [
  // ---------------------------------------------------------------- crochê
  {
    sigla: 'corr',
    nome: 'correntinha',
    familia: 'croche',
    consome: 0,
    produz: 1,
    variantes: ['corr', 'corrente', 'correntinha', 'correntinhas', 'correntes', 'ch'],
  },
  {
    sigla: 'pbx',
    nome: 'ponto baixíssimo',
    familia: 'croche',
    consome: 1,
    produz: 1,
    variantes: ['pbx', 'pbxs', 'ponto baixissimo', 'pontos baixissimos', 'baixissimo', 'sl st'],
  },
  {
    sigla: 'pb',
    nome: 'ponto baixo',
    familia: 'croche',
    consome: 1,
    produz: 1,
    variantes: ['pb', 'pbs', 'ponto baixo', 'pontos baixos', 'baixo', 'sc'],
  },
  {
    sigla: 'pma',
    nome: 'ponto meio alto',
    familia: 'croche',
    consome: 1,
    produz: 1,
    variantes: ['pma', 'pmas', 'pmb', 'ponto meio alto', 'pontos meio altos', 'meio alto', 'hdc'],
  },
  {
    sigla: 'pa',
    nome: 'ponto alto',
    familia: 'croche',
    consome: 1,
    produz: 1,
    variantes: ['pa', 'pas', 'ponto alto', 'pontos altos', 'alto', 'dc'],
  },
  {
    sigla: 'pad',
    nome: 'ponto alto duplo',
    familia: 'croche',
    consome: 1,
    produz: 1,
    variantes: ['pad', 'pads', 'ponto alto duplo', 'pontos altos duplos', 'alto duplo', 'tr'],
  },
  {
    sigla: 'pat',
    nome: 'ponto alto triplo',
    familia: 'croche',
    consome: 1,
    produz: 1,
    variantes: ['pat', 'pats', 'ponto alto triplo', 'pontos altos triplos', 'alto triplo', 'dtr'],
  },
  {
    sigla: 'pic',
    nome: 'picô',
    familia: 'croche',
    consome: 0,
    produz: 0,
    variantes: ['pic', 'pico', 'picos'],
  },

  // ----------------------------------------------------------------- tricô
  {
    sigla: 'm',
    nome: 'ponto meia',
    familia: 'trico',
    consome: 1,
    produz: 1,
    variantes: ['m', 'ms', 'meia', 'ponto meia', 'pontos meia', 'trico', 'ponto trico', 'k'],
  },
  {
    sigla: 'tr',
    nome: 'ponto tricô',
    familia: 'trico',
    consome: 1,
    produz: 1,
    variantes: ['pt', 'pts', 'ponto', 'pontos'],
  },
  {
    sigla: 'pr',
    nome: 'ponto pérola',
    familia: 'trico',
    consome: 1,
    produz: 1,
    variantes: ['pr', 'perola', 'ponto perola', 'pontos perola', 'purl', 'p'],
  },
  {
    sigla: 'lac',
    nome: 'laçada',
    familia: 'trico',
    consome: 0,
    produz: 1,
    variantes: ['lac', 'lacada', 'lacadas', 'lc', 'yo'],
  },
  {
    sigla: 'desl',
    nome: 'ponto deslizado',
    familia: 'trico',
    consome: 1,
    produz: 1,
    variantes: ['desl', 'deslizado', 'deslizar', 'passar sem tricotar', 'sl'],
  },

  // ----------------------------------------------------------------- ambos
  {
    sigla: 'aum',
    nome: 'aumento',
    familia: 'ambos',
    consome: 1,
    produz: 2,
    variantes: ['aum', 'aums', 'aumento', 'aumentos', 'aumentar', 'inc'],
  },
  {
    sigla: 'dim',
    nome: 'diminuição',
    familia: 'ambos',
    consome: 2,
    produz: 1,
    variantes: ['dim', 'dims', 'diminuicao', 'diminuicoes', 'diminuir', 'dec', '2j', '2 j'],
  },
]

/** Instruções que não mexem na contagem, mas valem ser mostradas em destaque. */
export const AVULSOS = [
  'virar',
  'vire o trabalho',
  'virar o trabalho',
  'nao virar',
  'fechar com pbx',
  'fechar a carreira',
  'cortar o fio',
  'arrematar',
  'trocar de cor',
  'marcar o ponto',
  'colocar marcador',
]

const PONTOS_POR_VARIANTE = new Map<string, DefinicaoPonto>()
for (const ponto of PONTOS) {
  for (const variante of ponto.variantes) {
    // A primeira definição registrada vence, então a ordem de PONTOS importa:
    // "pb" precisa ser achado antes de qualquer variante mais genérica.
    if (!PONTOS_POR_VARIANTE.has(variante)) PONTOS_POR_VARIANTE.set(variante, ponto)
  }
}

/** Variantes ordenadas da mais longa para a mais curta, para casar "ponto alto duplo" antes de "ponto alto". */
const VARIANTES_ORDENADAS = [...PONTOS_POR_VARIANTE.keys()].sort((a, b) => b.length - a.length)

/** Acha a definição para um texto já normalizado, exato. */
export function buscarPonto(textoNormalizado: string): DefinicaoPonto | undefined {
  return PONTOS_POR_VARIANTE.get(textoNormalizado)
}

/**
 * Acha a definição de ponto contida num trecho, junto do que sobrou antes e
 * depois dela. Usado para ler coisas como "pb no anel mágico" ou "pa na alça de trás".
 */
export function extrairPonto(
  textoNormalizado: string,
): { ponto: DefinicaoPonto; antes: string; depois: string; inicio: number; fim: number } | undefined {
  for (const variante of VARIANTES_ORDENADAS) {
    const regex = new RegExp(`(^|\\s)${escaparRegex(variante)}($|\\s)`)
    const achado = regex.exec(textoNormalizado)
    if (!achado) continue
    const inicio = achado.index + achado[1].length
    const fim = inicio + variante.length
    return {
      ponto: PONTOS_POR_VARIANTE.get(variante)!,
      antes: textoNormalizado.slice(0, inicio).trim(),
      depois: textoNormalizado.slice(fim).trim(),
      inicio,
      fim,
    }
  }
  return undefined
}

function escaparRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
