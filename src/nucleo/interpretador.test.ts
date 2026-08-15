import { describe, expect, it } from 'vitest'
import { interpretar } from './interpretador'

describe('crochê — amigurumi', () => {
  const receita = interpretar(`
Carr 1: 6 pb no anel mágico = 6
Carr 2: 1 aum em cada ponto = 12
Carr 3: (1 pb, 1 aum) x6 = 18
Carr 4-6: 1 pb em cada ponto = 18
Carr 7: *2 pb, 1 aum* repetir 6 vezes = 24
`)

  it('acha todas as carreiras', () => {
    expect(receita.carreiras).toHaveLength(5)
  })

  it('conta os pontos carreira por carreira', () => {
    expect(receita.carreiras.map((c) => c.produz)).toEqual([6, 12, 18, 18, 24])
  })

  it('não consome pontos no anel mágico', () => {
    expect(receita.carreiras[0].consome).toBe(0)
  })

  it('mantém os acentos do complemento na hora de mostrar', () => {
    expect(receita.carreiras[0].resumo).toBe('6 pontos baixos no anel mágico')
  })

  it('expande "em cada ponto" usando a carreira anterior', () => {
    expect(receita.carreiras[1].resumo).toBe('6 aumentos')
  })

  it('expande um intervalo de carreiras', () => {
    expect(receita.carreiras[3].numeros).toEqual([4, 5, 6])
    expect(receita.carreiras[3].rotulo).toBe('Carreiras 4 a 6')
  })

  it('lê repetição com parênteses e com asterisco do mesmo jeito', () => {
    const comParenteses = receita.carreiras[2].itens[0]
    const comAsterisco = receita.carreiras[4].itens[0]
    expect(comParenteses.tipo).toBe('grupo')
    expect(comAsterisco.tipo).toBe('grupo')
    if (comParenteses.tipo === 'grupo') expect(comParenteses.repeticoes).toBe(6)
    if (comAsterisco.tipo === 'grupo') expect(comAsterisco.repeticoes).toBe(6)
  })

  it('confere o total declarado e não reclama quando bate', () => {
    expect(receita.carreiras.every((c) => c.divergencia === undefined)).toBe(true)
  })
})

describe('conferência de contagem', () => {
  it('avisa quando o total declarado não bate com a conta', () => {
    const receita = interpretar('Carr 1: 6 pb no anel mágico = 6\nCarr 2: (1 pb, 1 aum) x3 = 20')
    expect(receita.carreiras[1].produz).toBe(9)
    expect(receita.carreiras[1].divergencia).toContain('20')
    expect(receita.carreiras[1].divergencia).toContain('9')
  })

  it('avisa quando a carreira pede mais pontos do que existem', () => {
    const receita = interpretar('Carr 1: 6 pb no anel mágico\nCarr 2: 20 pb')
    expect(receita.carreiras[1].avisos.join(' ')).toContain('deixou só 6')
  })

  it('avisa sobre asterisco sem par', () => {
    const receita = interpretar('Carr 1: *2 pb, 1 aum')
    expect(receita.carreiras[0].avisos.join(' ')).toContain('asterisco sozinho')
  })
})

describe('tricô', () => {
  it('entende montagem, juntos e laçada', () => {
    const receita = interpretar(`
Carreira 1: montar 20 pontos
Carreira 2: 1 m em cada ponto
Carreira 3: 1 m, 2 m juntos, 1 laçada, 17 m
`)
    expect(receita.carreiras[0].produz).toBe(20)
    expect(receita.carreiras[1].produz).toBe(20)
    expect(receita.carreiras[2].consome).toBe(20)
    expect(receita.carreiras[2].produz).toBe(20)
  })

  it('trata "2 m juntos" como uma diminuição só', () => {
    const receita = interpretar('Carreira 1: montar 10 pontos\nCarreira 2: 2 m juntos, 8 m')
    expect(receita.carreiras[1].consome).toBe(10)
    expect(receita.carreiras[1].produz).toBe(9)
  })
})

describe('repetir até o fim', () => {
  it('calcula quantas voltas cabem no que sobrou', () => {
    const receita = interpretar('Carr 1: 6 pb no anel mágico\nCarr 2: 1 aum em cada ponto\nCarr 3: 1 pb, *1 aum, 2 pb* até o fim')
    const grupo = receita.carreiras[2].itens[1]
    expect(grupo.tipo).toBe('grupo')
    if (grupo.tipo === 'grupo') expect(grupo.repeticoes).toBe(3)
  })
})

// Receita de tricô profissional funciona de outro jeito: instrução relativa a
// marcador, numeração que recomeça a cada parte, parágrafos de explicação no
// meio. Nada disso tem contagem para apurar — e o app não pode fingir que tem.
describe('receita de tricô com marcadores', () => {
  const receita = interpretar(`
Listras em Alto Relevo
Carr 1 (LD): Desl 1 T, M
Carr 2 (LA): Desl 1 T, M
Carr 3 (LD): Desl 1 T, M até o Marc 1, T até o Marc 4, M até o fim da carr
Trabalhar as Carr 1 e 2 mais 3 vezes no total.
Decote
Carr 1 (LD): M até faltar 3 pts, 2jm, 1 M
`)

  it('não inventa contagem quando a instrução não tem número', () => {
    expect(receita.carreiras.every((c) => c.contagemConfiavel === false)).toBe(true)
  })

  it('guarda o texto da receita para mostrar no lugar da paráfrase', () => {
    expect(receita.carreiras[2].textoOriginal).toBe(
      'Desl 1 T, M até o Marc 1, T até o Marc 4, M até o fim da carr',
    )
  })

  it('separa as partes e deixa a numeração recomeçar', () => {
    expect(receita.secoes).toEqual(['Listras em Alto Relevo', 'Decote'])
    expect(receita.carreiras.at(-1)?.secao).toBe('Decote')
    expect(receita.carreiras.at(-1)?.numeros).toEqual([1])
  })

  it('lê o lado do trabalho', () => {
    expect(receita.carreiras[0].lado).toBe('LD')
    expect(receita.carreiras[1].lado).toBe('LA')
  })

  it('põe parágrafo de explicação como recado, não dentro da carreira', () => {
    expect(receita.recados.map((r) => r.texto)).toContain(
      'Trabalhar as Carr 1 e 2 mais 3 vezes no total.',
    )
    expect(receita.carreiras[2].textoOriginal).not.toContain('Trabalhar')
  })
})

describe('não confunde número solto com carreira', () => {
  it('ignora contagem de pontos escrita como "218) pts"', () => {
    const receita = interpretar('Montagem\n218) pts\nCarr 1: Meia')
    expect(receita.carreiras).toHaveLength(1)
    expect(receita.carreiras[0].numeros).toEqual([1])
  })
})

describe('tolerância a texto solto', () => {
  it('guarda o que vem antes da primeira carreira', () => {
    const receita = interpretar('Touca de bebê\nUse agulha 3,5mm\nCarr 1: 6 pb no anel mágico')
    expect(receita.preambulo).toEqual(['Touca de bebê', 'Use agulha 3,5mm'])
  })

  it('junta linha quebrada na carreira anterior', () => {
    const receita = interpretar('Carr 1: 6 pb no anel mágico,\n1 pbx para fechar')
    expect(receita.carreiras).toHaveLength(1)
    expect(receita.carreiras[0].itens).toHaveLength(2)
  })

  it('não perde instrução que não é ponto', () => {
    const receita = interpretar('Carr 1: 10 pb, virar o trabalho')
    const nota = receita.carreiras[0].itens[1]
    expect(nota.tipo).toBe('nota')
    if (nota.tipo === 'nota') expect(nota.rotulo).toBe('virar o trabalho')
  })

  it('avisa quando não acha carreira nenhuma', () => {
    const receita = interpretar('só um texto qualquer sem estrutura')
    expect(receita.avisos.join(' ')).toContain('Não encontrei nenhuma carreira')
  })
})
