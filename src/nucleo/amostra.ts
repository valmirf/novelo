// Conversão de amostra.
//
// A amostra é quantos pontos cabem em 10 cm. Quem faz o ponto mais frouxo cabe
// MENOS pontos em 10 cm e precisa montar MENOS pontos para chegar na mesma
// largura; quem faz o ponto mais apertado precisa montar mais. Inverter isso faz
// a peça sair do tamanho errado, então a conta vive aqui e tem teste.

export type Aperto = 'igual' | 'mais frouxo' | 'mais apertado'

export interface ConversaoAmostra {
  pontosParaMontar: number
  diferenca: number
  aperto: Aperto
}

export function converterAmostra(
  pontosDaReceitaEm10cm: number,
  meusPontosEm10cm: number,
  pontosQueAReceitaMandaMontar: number,
): ConversaoAmostra | undefined {
  if (
    pontosDaReceitaEm10cm <= 0 ||
    meusPontosEm10cm <= 0 ||
    pontosQueAReceitaMandaMontar <= 0
  ) {
    return undefined
  }

  const pontosParaMontar = Math.round(
    (pontosQueAReceitaMandaMontar * meusPontosEm10cm) / pontosDaReceitaEm10cm,
  )
  const diferenca = pontosParaMontar - pontosQueAReceitaMandaMontar

  return {
    pontosParaMontar,
    diferenca,
    aperto:
      meusPontosEm10cm === pontosDaReceitaEm10cm
        ? 'igual'
        : meusPontosEm10cm < pontosDaReceitaEm10cm
          ? 'mais frouxo'
          : 'mais apertado',
  }
}
