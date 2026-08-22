// Leitura da blocagem.
//
// Blocar é molhar a amostra e deixar secar esticada. O tecido quase sempre
// muda: se o ponto abre, cabem MENOS pontos em 10 cm; se fecha, cabem mais.
// Depois de blocar, é o número de depois que vale para calcular a peça — usar o
// de antes faz a peça sair do tamanho errado.
//
// A conta é curta mas o sentido inverte fácil, então mora aqui e tem teste.

import type { Amostra } from './tipos'

export type MudancaBlocagem = 'igual' | 'abriu' | 'fechou'

export interface LeituraBlocagem {
  /** Depois menos antes. Negativo quer dizer que cabem menos pontos em 10 cm. */
  diferencaPontos: number
  diferencaCarreiras: number
  mudanca: MudancaBlocagem
  /** Frase pronta para a tela, já em português. */
  resumo: string
}

const plural = (n: number, um: string, muitos: string) => (n === 1 ? um : muitos)

export function lerBlocagem(antes: Amostra, depois: Amostra): LeituraBlocagem | undefined {
  if (antes.pontos <= 0 || antes.carreiras <= 0 || depois.pontos <= 0 || depois.carreiras <= 0) {
    return undefined
  }

  const diferencaPontos = depois.pontos - antes.pontos
  const diferencaCarreiras = depois.carreiras - antes.carreiras

  // O ponto manda na largura, então é ele que define se o tecido abriu ou
  // fechou. Só quando ele não mudou é que a carreira decide.
  const referencia = diferencaPontos !== 0 ? diferencaPontos : diferencaCarreiras
  const mudanca: MudancaBlocagem =
    referencia === 0 ? 'igual' : referencia < 0 ? 'abriu' : 'fechou'

  const partes: string[] = []
  if (diferencaPontos !== 0) {
    const n = Math.abs(diferencaPontos)
    partes.push(`${n} ${plural(n, 'ponto', 'pontos')} a ${diferencaPontos < 0 ? 'menos' : 'mais'}`)
  }
  if (diferencaCarreiras !== 0) {
    const n = Math.abs(diferencaCarreiras)
    partes.push(
      `${n} ${plural(n, 'carreira', 'carreiras')} a ${diferencaCarreiras < 0 ? 'menos' : 'mais'}`,
    )
  }

  const resumo =
    partes.length === 0
      ? 'A blocagem não mudou a amostra: os números continuam os mesmos.'
      : `Depois de blocar cabem ${partes.join(' e ')} em 10 cm — o tecido ${
          mudanca === 'abriu' ? 'abriu' : 'fechou'
        }. Use os números de depois de blocar para calcular a peça.`

  return { diferencaPontos, diferencaCarreiras, mudanca, resumo }
}
