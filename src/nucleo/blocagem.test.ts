import { describe, expect, it } from 'vitest'
import { lerBlocagem } from './blocagem'

describe('lerBlocagem', () => {
  it('entende que menos pontos em 10 cm quer dizer tecido aberto', () => {
    const leitura = lerBlocagem({ pontos: 22, carreiras: 30 }, { pontos: 20, carreiras: 28 })
    expect(leitura?.mudanca).toBe('abriu')
    expect(leitura?.diferencaPontos).toBe(-2)
    expect(leitura?.resumo).toContain('2 pontos a menos')
    expect(leitura?.resumo).toContain('2 carreiras a menos')
    expect(leitura?.resumo).toContain('abriu')
  })

  it('entende o caminho contrário: mais pontos em 10 cm é tecido fechado', () => {
    const leitura = lerBlocagem({ pontos: 20, carreiras: 28 }, { pontos: 23, carreiras: 28 })
    expect(leitura?.mudanca).toBe('fechou')
    expect(leitura?.diferencaPontos).toBe(3)
    expect(leitura?.resumo).toContain('3 pontos a mais')
    // A carreira não mudou, então não entra na frase.
    expect(leitura?.resumo).not.toContain('carreira')
  })

  it('quando o ponto não muda, quem decide é a carreira', () => {
    const leitura = lerBlocagem({ pontos: 20, carreiras: 30 }, { pontos: 20, carreiras: 27 })
    expect(leitura?.mudanca).toBe('abriu')
    expect(leitura?.resumo).toContain('3 carreiras a menos')
  })

  it('escreve no singular quando muda só uma', () => {
    const leitura = lerBlocagem({ pontos: 20, carreiras: 30 }, { pontos: 21, carreiras: 30 })
    expect(leitura?.resumo).toContain('1 ponto a mais')
  })

  it('diz com todas as letras quando a blocagem não mudou nada', () => {
    const leitura = lerBlocagem({ pontos: 20, carreiras: 30 }, { pontos: 20, carreiras: 30 })
    expect(leitura?.mudanca).toBe('igual')
    expect(leitura?.resumo).toContain('não mudou')
  })

  it('não inventa leitura com número faltando ou zerado', () => {
    expect(lerBlocagem({ pontos: 0, carreiras: 30 }, { pontos: 20, carreiras: 30 })).toBeUndefined()
    expect(lerBlocagem({ pontos: 20, carreiras: 30 }, { pontos: 20, carreiras: 0 })).toBeUndefined()
  })
})
