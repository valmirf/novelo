// Receitas de peça de vestir trazem todos os tamanhos na mesma linha.
//
//   Carr 3: 84 (92, 100, 110) M, 2jm, 3m
//   Trabalhar as Carr 1 e 2 - 18, 20, 22 (24, 26, 28) vezes
//
// A convenção é: os primeiros números, fora dos parênteses, são os tamanhos
// menores; os de dentro são os maiores. Quem tricota lê tudo e escolhe o seu de
// cabeça, carreira após carreira — é onde mais se erra, e o erro só aparece com
// a peça pronta. Aqui a receita é reescrita com o tamanho escolhido apenas.

export interface GrupoDeTamanhos {
  /** Posição do grupo inteiro no texto, incluindo os parênteses. */
  inicio: number
  fim: number
  /** Um valor por tamanho, na ordem: menores primeiro. */
  valores: string[]
}

// Números separados por vírgula, seguidos de mais números entre parênteses.
// A vírgula solta antes do fecha-parêntese aparece em receita mal formatada.
const GRUPO = /(\d+(?:\s*,\s*\d+)*)\s*\(\s*(\d+(?:\s*,\s*\d+)*)\s*,?\s*\)/g

export function acharGrupos(texto: string): GrupoDeTamanhos[] {
  const grupos: GrupoDeTamanhos[] = []
  for (const achado of texto.matchAll(GRUPO)) {
    const fora = achado[1].split(',').map((n) => n.trim())
    const dentro = achado[2].split(',').map((n) => n.trim())
    grupos.push({
      inicio: achado.index,
      fim: achado.index + achado[0].length,
      valores: [...fora, ...dentro],
    })
  }
  return grupos
}

/**
 * Quantos tamanhos a receita oferece.
 *
 * Vale o número que mais se repete, não o primeiro que aparece: uma linha solta
 * escrita de outro jeito não pode decidir isso pela receita inteira.
 */
export function contarTamanhos(texto: string): number {
  const contagens = new Map<number, number>()
  for (const grupo of acharGrupos(texto)) {
    if (grupo.valores.length < 2) continue
    contagens.set(grupo.valores.length, (contagens.get(grupo.valores.length) ?? 0) + 1)
  }

  let melhor = 0
  let vezes = 0
  for (const [quantos, repeticoes] of contagens) {
    // Empate fica com o maior número de tamanhos, que é o mais informativo.
    if (repeticoes > vezes || (repeticoes === vezes && quantos > melhor)) {
      melhor = quantos
      vezes = repeticoes
    }
  }
  // Um grupo só pode ser coincidência; dois já formam padrão.
  return vezes >= 2 ? melhor : 0
}

/**
 * Reescreve a linha deixando só o número do tamanho escolhido.
 *
 * Grupos com outra quantidade de valores ficam intactos: se não é a mesma
 * escala, mexer seria chute — e chute aqui estraga peça.
 */
export function aplicarTamanho(linha: string, indice: number, quantosTamanhos: number): string {
  if (quantosTamanhos < 2) return linha

  const grupos = acharGrupos(linha).filter((g) => g.valores.length === quantosTamanhos)
  if (grupos.length === 0) return linha

  let saida = ''
  let cursor = 0
  for (const grupo of grupos) {
    saida += linha.slice(cursor, grupo.inicio) + grupo.valores[indice]
    cursor = grupo.fim
  }
  return saida + linha.slice(cursor)
}

/** Verdadeiro quando a linha muda de acordo com o tamanho. */
export function dependeDoTamanho(linha: string, quantosTamanhos: number): boolean {
  if (quantosTamanhos < 2) return false
  return acharGrupos(linha).some((g) => g.valores.length === quantosTamanhos)
}

const LINHA_DE_TABELA = /^\s*tam(?:anho)?\s*\.?\s*([ivx]+|\d+)\s*[-–—:]\s*(\d+)\s*(cm|m)\b/i

/**
 * Nomes dos tamanhos, quando a receita traz a tabela.
 * "Tam I - 78 cm" vira "I — 78 cm", que é como ela reconhece o seu.
 */
export function nomesDeTamanhos(texto: string, quantosTamanhos: number): string[] {
  const achados: string[] = []
  for (const linha of texto.split(/\r?\n/)) {
    const achado = LINHA_DE_TABELA.exec(linha)
    if (achado) achados.push(`${achado[1].toUpperCase()} — ${achado[2]} ${achado[3]}`)
  }

  if (achados.length === quantosTamanhos) return achados
  return Array.from({ length: quantosTamanhos }, (_, i) => `Tamanho ${i + 1}`)
}
