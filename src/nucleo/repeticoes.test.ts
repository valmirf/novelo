import { describe, expect, it } from 'vitest'
import { marcarRepeticoes } from './repeticoes'

describe('marcarRepeticoes', () => {
  it('separa o trecho entre asteriscos do resto da carreira', () => {
    expect(marcarRepeticoes('*3 pa, 1 aum, 3 pa*, repita ate o fim. (135 pa)')).toEqual([
      { texto: '3 pa, 1 aum, 3 pa', repete: true },
      { texto: ', repita ate o fim. (135 pa)', repete: false },
    ])
  })

  it('guarda o texto que vem antes do trecho que repete', () => {
    expect(marcarRepeticoes('1 pb, depois *2 pa, 1 aum* ate o fim')).toEqual([
      { texto: '1 pb, depois ', repete: false },
      { texto: '2 pa, 1 aum', repete: true },
      { texto: ' ate o fim', repete: false },
    ])
  })

  it('marca mais de um trecho na mesma carreira', () => {
    const pedacos = marcarRepeticoes('*2 pa* e depois *3 pb*')
    expect(pedacos.filter((p) => p.repete).map((p) => p.texto)).toEqual(['2 pa', '3 pb'])
  })

  it('não marca nada quando o asterisco está sozinho', () => {
    const texto = '*3 pa, 1 aum ate o fim'
    expect(marcarRepeticoes(texto)).toEqual([{ texto, repete: false }])
  })

  it('deixa passar a carreira sem asterisco nenhum', () => {
    const texto = '1 pa em cada ponto. (120 pa)'
    expect(marcarRepeticoes(texto)).toEqual([{ texto, repete: false }])
  })

  it('não marca asterisco sem conteúdo entre eles', () => {
    expect(marcarRepeticoes('1 pa ** 2 pb')).toEqual([{ texto: '1 pa ** 2 pb', repete: false }])
  })

  it('não confunde a contagem entre parênteses com repetição', () => {
    const pedacos = marcarRepeticoes('*1 pb, 1 aum*, repita. (24 pb)')
    expect(pedacos.filter((p) => p.repete).map((p) => p.texto)).toEqual(['1 pb, 1 aum'])
  })
})
