import { describe, expect, it } from 'vitest'
import { converterAmostra } from './amostra'

describe('conversão de amostra', () => {
  it('não muda nada quando a amostra bate', () => {
    const conta = converterAmostra(20, 20, 100)
    expect(conta?.pontosParaMontar).toBe(100)
    expect(conta?.aperto).toBe('igual')
  })

  it('quem faz o ponto mais frouxo monta menos pontos', () => {
    // 18 pontos em 10 cm significa ponto maior: 90 pontos já dão a mesma largura.
    const conta = converterAmostra(20, 18, 100)
    expect(conta?.pontosParaMontar).toBe(90)
    expect(conta?.diferenca).toBe(-10)
    expect(conta?.aperto).toBe('mais frouxo')
  })

  it('quem faz o ponto mais apertado monta mais pontos', () => {
    const conta = converterAmostra(20, 25, 100)
    expect(conta?.pontosParaMontar).toBe(125)
    expect(conta?.diferenca).toBe(25)
    expect(conta?.aperto).toBe('mais apertado')
  })

  it('não calcula com campo vazio ou zerado', () => {
    expect(converterAmostra(0, 18, 100)).toBeUndefined()
    expect(converterAmostra(20, 0, 100)).toBeUndefined()
    expect(converterAmostra(20, 18, 0)).toBeUndefined()
  })
})
