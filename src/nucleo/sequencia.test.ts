import { describe, expect, it } from 'vitest'
import { interpretar } from './interpretador'
import { lerRepeticaoDeBloco, montarSequencia } from './sequencia'
import { aplicarTamanho, contarTamanhos } from './tamanhos'

describe('ler a instrução de repetir bloco', () => {
  it('entende as formas que aparecem na receita dela', () => {
    expect(lerRepeticaoDeBloco('Trabalhar as carr 3 e 4 - 18 vezes')).toMatchObject({
      de: 3,
      ate: 4,
      vezes: 18,
      adicional: false,
    })
    expect(lerRepeticaoDeBloco('Trabalhar as carr 1 e 2 - 15 vezes')).toMatchObject({
      de: 1,
      ate: 2,
      vezes: 15,
    })
    expect(lerRepeticaoDeBloco('Repetir as carr 1 e 2 - 5 vezes')).toMatchObject({ vezes: 5 })
  })

  it('tolera o texto que vem no meio', () => {
    expect(
      lerRepeticaoDeBloco('Trabalhar as carreiras 1 e 2 do decote - 7 vezes - 162 pts'),
    ).toMatchObject({ de: 1, ate: 2, vezes: 7 })
    expect(
      lerRepeticaoDeBloco('Trabalhar as carr 3 e 4 - 23 vezes - 9 pts.'),
    ).toMatchObject({ de: 3, ate: 4, vezes: 23 })
  })

  it('separa "mais N vezes" de "N vezes"', () => {
    expect(lerRepeticaoDeBloco('Repetir as carr 1 e 2 mais 3 vezes')?.adicional).toBe(true)
    expect(lerRepeticaoDeBloco('Trabalhar as carr 1 e 2 - 3 vezes')?.adicional).toBe(false)
  })

  it('não confunde outras frases com instrução de repetir', () => {
    expect(lerRepeticaoDeBloco('Trabalhar 46 carr em M.')).toBeUndefined()
    expect(lerRepeticaoDeBloco('Carr 3: 3m, Mft, M até faltar 4 pts')).toBeUndefined()
    expect(lerRepeticaoDeBloco('Cristiane Bertoluci. Todos direitos reservados.')).toBeUndefined()
  })
})

describe('montar a sequência de trabalho', () => {
  const receita = interpretar(`
Carr 1: Meia
Carr 2: PptFF 3 pts, M até faltar 3 pts
Carr 3: 3m, Mft, M até faltar 4 pts
Carr 4: PptFF 3 pts, M até faltar 3 pts
Trabalhar as carr 3 e 4 - 18 vezes
Trabalhar as carr 1 e 2 - 15 vezes
`)

  it('expande os blocos repetidos em carreiras de verdade', () => {
    const passos = montarSequencia(receita)
    // 1 e 2 escritas (2) + 3 e 4 escritas (2) + 17 repetições de 3 e 4 (34)
    // + 14 repetições de 1 e 2 (28) = 66
    expect(passos).toHaveLength(66)
  })

  it('numera as repetições para ela saber onde está', () => {
    const passos = montarSequencia(receita)
    const carreira3 = passos.filter((p) => p.numero === 3)
    expect(carreira3).toHaveLength(18)
    expect(carreira3[0].repeticao).toBe(1)
    expect(carreira3[0].totalRepeticoes).toBe(18)
    expect(carreira3.at(-1)?.repeticao).toBe(18)
  })

  it('mantém a ordem: o bloco repetido vem antes do bloco seguinte', () => {
    const passos = montarSequencia(receita)
    const ultimoTres = passos.map((p) => p.numero).lastIndexOf(3)
    const primeiroUmRepetido = passos.findIndex((p) => p.numero === 1 && p.repeticao === 2)
    expect(primeiroUmRepetido).toBeGreaterThan(ultimoTres)
  })

  it('não deixa a instrução aparecer também como recado solto', () => {
    const passos = montarSequencia(receita)
    const recados = passos.flatMap((p) => p.recados).join(' ')
    expect(recados).not.toContain('Trabalhar as carr')
  })
})

describe('repetição que muda com o tamanho', () => {
  const receita = interpretar(`
Carr 1: Meia
Carr 2: PptFF 3 pts, M
Carr 3: 3m, Mft, M
Carr 4: PptFF 3 pts, M
Trabalhar as carr 3 e 4 - 18, 20, 22 (24, 26, 28) vezes
`)

  it('usa o número do tamanho escolhido, não o primeiro da lista', () => {
    const quantos = contarTamanhos(
      'Trabalhar as carr 3 e 4 - 18, 20, 22 (24, 26, 28) vezes\nCarr 1: 84, 92, 100 (110, 120, 130) M',
    )
    expect(quantos).toBe(6)

    const paraOTerceiro = montarSequencia(receita, (t) => aplicarTamanho(t, 2, 6))
    expect(paraOTerceiro.filter((p) => p.numero === 3)).toHaveLength(22)

    const paraOSexto = montarSequencia(receita, (t) => aplicarTamanho(t, 5, 6))
    expect(paraOSexto.filter((p) => p.numero === 3)).toHaveLength(28)
  })
})

describe('receita sem repetição de bloco', () => {
  it('devolve exatamente as carreiras escritas', () => {
    const receita = interpretar('Carr 1: 6 pb no anel mágico\nCarr 2: 1 aum em cada ponto')
    expect(montarSequencia(receita)).toHaveLength(2)
  })

  it('continua expandindo intervalo escrito como "Carr 4-6"', () => {
    const receita = interpretar('Carr 1: 6 pb no anel mágico\nCarr 4-6: 1 pb em cada ponto')
    const passos = montarSequencia(receita)
    expect(passos).toHaveLength(4)
    expect(passos.map((p) => p.numero)).toEqual([1, 4, 5, 6])
  })
})
