import { describe, expect, it } from 'vitest'
import {
  aplicarTamanho,
  contarTamanhos,
  dependeDoTamanho,
  nomesDeTamanhos,
} from './tamanhos'

const RECEITA = `Tam I - 78 cm
Tam II - 100 cm
Tam III - 122 cm
Tam IV - 144 cm
Carr 1: 84 (92, 100, 110) M, 2jm, 3m
Carr 2: 3m, mate, M até faltar 5 pts, 2jm, 3m
Trabalhar as Carr 1 e 2 - 2, 3 (3, 4) vezes
Fios: 300, 330 (360, 390) metros`

describe('quantos tamanhos a receita tem', () => {
  it('conta pelo padrão que mais se repete', () => {
    expect(contarTamanhos(RECEITA)).toBe(4)
  })

  it('reconhece receita de seis tamanhos', () => {
    expect(contarTamanhos('Carr 1: 18, 20, 22 (24, 26, 28) M\nCarr 2: 176, 194, 210 (228, 250, 274) pts')).toBe(6)
  })

  it('não vê tamanhos onde não há', () => {
    expect(contarTamanhos('Carr 1: 6 pb no anel mágico = 6\nCarr 2: (1 pb, 1 aum) x6 = 18')).toBe(0)
  })

  it('não confunde parêntese de explicação com tamanho', () => {
    const texto = 'Carr 3: 64 M (ou seja, 5 pts antes do pt virado)\nCarr 4: montar 5 pontos (130 pts no total)'
    expect(contarTamanhos(texto)).toBe(0)
  })
})

describe('aplicar o tamanho escolhido', () => {
  it('deixa só o número do tamanho na linha', () => {
    expect(aplicarTamanho('84 (92, 100, 110) M, 2jm, 3m', 0, 4)).toBe('84 M, 2jm, 3m')
    expect(aplicarTamanho('84 (92, 100, 110) M, 2jm, 3m', 1, 4)).toBe('92 M, 2jm, 3m')
    expect(aplicarTamanho('84 (92, 100, 110) M, 2jm, 3m', 3, 4)).toBe('110 M, 2jm, 3m')
  })

  it('resolve dois grupos na mesma linha', () => {
    expect(aplicarTamanho('montar 2, 3 (3, 4) e depois 84 (92, 100, 110) M', 2, 4)).toBe(
      'montar 3 e depois 100 M',
    )
  })

  it('não mexe em grupo de outra escala', () => {
    // Três valores numa receita de quatro tamanhos: não é a mesma coisa.
    expect(aplicarTamanho('1, 2 (3) vezes, e 84 (92, 100, 110) M', 1, 4)).toBe(
      '1, 2 (3) vezes, e 92 M',
    )
  })

  it('deixa a linha em paz quando não há tamanho nenhum', () => {
    expect(aplicarTamanho('3m, mate, M até faltar 5 pts', 1, 4)).toBe('3m, mate, M até faltar 5 pts')
  })
})

describe('quais linhas mudam com o tamanho', () => {
  it('aponta só as que têm grupo na escala certa', () => {
    expect(dependeDoTamanho('84 (92, 100, 110) M', 4)).toBe(true)
    expect(dependeDoTamanho('3m, mate, M até faltar 5 pts', 4)).toBe(false)
  })
})

describe('nomes dos tamanhos', () => {
  it('usa a tabela da receita quando ela existe', () => {
    expect(nomesDeTamanhos(RECEITA, 4)).toEqual([
      'I — 78 cm',
      'II — 100 cm',
      'III — 122 cm',
      'IV — 144 cm',
    ])
  })

  it('cai para nomes genéricos quando a tabela não bate', () => {
    expect(nomesDeTamanhos('sem tabela aqui', 3)).toEqual(['Tamanho 1', 'Tamanho 2', 'Tamanho 3'])
  })
})
