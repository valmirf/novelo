// Monta a sequência de carreiras que ela vai realmente tricotar.
//
// A receita não lista tudo: ela escreve quatro carreiras e depois manda
// "Trabalhar as carr 3 e 4 - 18 vezes". Quem tricota expande isso de cabeça,
// carreira após carreira, e é aí que se perde a conta. Aqui a expansão é feita
// pelo app — era o pedido original: "interpretar a receita carreira por
// carreira levando em conta as repetições".

import type { Carreira, Receita } from './interpretador'

export interface PassoDeTrabalho {
  carreira: Carreira
  /** Número da carreira como a receita a chama. */
  numero: number
  /** Qual passada desta carreira, começando em 1. */
  repeticao: number
  /** Quantas passadas ao todo. 1 quer dizer "não se repete". */
  totalRepeticoes: number
  /** Parágrafos que aparecem depois deste passo. */
  recados: string[]
}

export interface RepeticaoDeBloco {
  de: number
  ate: number
  vezes: number
  /** "mais 3 vezes" soma; "3 vezes" (ou "3 vezes no total") é o total. */
  adicional: boolean
}

// "Trabalhar as carr 3 e 4 - 18 vezes", "Repetir as carr 1 e 2 - 5 vezes",
// "Trabalhar as carreiras 1 e 2 do decote - 7 vezes". O que vem entre os
// números das carreiras e o "N vezes" varia demais para valer a pena descrever;
// por isso a leitura é em duas etapas.
const INICIO_DE_REPETICAO =
  /^\s*(?:trabalhar|repetir|repita|fazer|faça)\s+(?:as\s+|a\s+|os\s+)?carr?(?:eiras?)?\s*\.?\s*(\d+)\s*(?:e|a|,|até|-|–)\s*(\d+)?/i

const QUANTAS_VEZES = /(\d+)\s*(?:x\b|vezes?\b|vez\b)/i

/**
 * Lê uma instrução de repetir bloco de carreiras, se a linha for uma.
 *
 * A linha já deve vir com o tamanho aplicado: "18, 20, 22 (24, 26, 28) vezes"
 * precisa ter virado "20 vezes" antes, senão o primeiro número venceria e a
 * peça sairia com o comprimento de outro tamanho.
 */
export function lerRepeticaoDeBloco(linha: string): RepeticaoDeBloco | undefined {
  const inicio = INICIO_DE_REPETICAO.exec(linha)
  if (!inicio) return undefined

  const de = Number(inicio[1])
  const ate = inicio[2] ? Number(inicio[2]) : de
  if (ate < de) return undefined

  const resto = linha.slice(inicio[0].length)
  const vezes = QUANTAS_VEZES.exec(resto)
  if (!vezes) return undefined

  const quantas = Number(vezes[1])
  if (quantas < 1 || quantas > 500) return undefined

  return {
    de,
    ate,
    vezes: quantas,
    adicional: /\bmais\b/i.test(linha.slice(0, inicio[0].length + (vezes.index ?? 0) + 10)),
  }
}

/** Acha, de trás para frente, a última sequência de carreiras de..até. */
function acharBloco(passos: PassoDeTrabalho[], de: number, ate: number): PassoDeTrabalho[] {
  let fim = -1
  for (let i = passos.length - 1; i >= 0; i--) {
    if (passos[i].numero === ate) {
      fim = i
      break
    }
  }
  if (fim === -1) return []

  const bloco: PassoDeTrabalho[] = []
  for (let i = fim; i >= 0; i--) {
    bloco.unshift(passos[i])
    if (passos[i].numero === de) return bloco
    // Se a numeração pular ou voltar, não é um bloco contíguo: melhor desistir
    // do que repetir carreira errada.
    if (bloco.length > ate - de + 1) return []
  }
  return []
}

/**
 * @param aplicarTamanho resolve "18, 20 (22, 24) vezes" para o tamanho dela.
 */
export function montarSequencia(
  receita: Receita,
  aplicarTamanho: (texto: string) => string = (t) => t,
): PassoDeTrabalho[] {
  const passos: PassoDeTrabalho[] = []

  const recadosPorCarreira = new Map<number, string[]>()
  for (const recado of receita.recados) {
    const lista = recadosPorCarreira.get(recado.depoisDaCarreira) ?? []
    lista.push(recado.texto)
    recadosPorCarreira.set(recado.depoisDaCarreira, lista)
  }

  receita.carreiras.forEach((carreira, indice) => {
    carreira.numeros.forEach((numero, posicao) => {
      passos.push({
        carreira,
        numero,
        repeticao: posicao + 1,
        totalRepeticoes: carreira.numeros.length,
        recados: [],
      })
    })

    const naoConsumidos: string[] = []

    for (const texto of recadosPorCarreira.get(indice) ?? []) {
      const repeticao = lerRepeticaoDeBloco(aplicarTamanho(texto))
      if (!repeticao) {
        naoConsumidos.push(texto)
        continue
      }

      // A receita já escreveu uma passada; "18 vezes no total" pede mais 17.
      const extras = repeticao.adicional ? repeticao.vezes : repeticao.vezes - 1
      const bloco = acharBloco(passos, repeticao.de, repeticao.ate)

      if (extras <= 0 || bloco.length === 0) {
        naoConsumidos.push(texto)
        continue
      }

      const total = extras + 1
      for (const passo of bloco) passo.totalRepeticoes = total

      for (let volta = 0; volta < extras; volta++) {
        for (const passo of bloco) {
          passos.push({
            carreira: passo.carreira,
            numero: passo.numero,
            repeticao: volta + 2,
            totalRepeticoes: total,
            recados: [],
          })
        }
      }
    }

    if (passos.length > 0) passos[passos.length - 1].recados.push(...naoConsumidos)
  })

  return passos
}
