import type { Page } from '@playwright/test'

/**
 * Dados de mentira para as telas terem conteúdo de verdade.
 *
 * A receita não é inventada à toa: ela carrega justamente as formas que o
 * interpretador precisa acertar — contagem entre parênteses, trecho de
 * repetição entre asteriscos, e um bloco "Trabalhar as carr 3 e 4 - 18 vezes"
 * que tem de virar 18 passadas navegáveis.
 */
export const RECEITA = [
  'Amostra: 18 pontos e 24 carreiras em 10 cm.',
  'Monte 120 correntinhas.',
  'Carr 1: 1 pa em cada corrente. (120 pa)',
  'Carr 2: 1 pa em cada ponto. (120 pa)',
  'Carr 3: *3 pa, 1 aum, 3 pa*, repita ate o fim. (135 pa)',
  'Carr 4: 1 pa em cada ponto. (135 pa)',
  'Trabalhar as carr 3 e 4 - 18 vezes.',
  'Carr 5: arremate e esconda as pontas.',
].join('\n')

export const NOME_DO_TRABALHO = 'Manta da Sofia'
export const NOME_DA_LINHA = 'Círculo Anne'

/**
 * Escreve a semente direto no IndexedDB.
 *
 * Cada teste ganha um contexto novo do Playwright, então cada um começa com o
 * banco vazio e semeia o seu — nenhum teste depende do que outro deixou.
 */
export async function semear(pagina: Page, opcoes: { comTrabalho?: boolean } = {}) {
  const { comTrabalho = true } = opcoes
  await pagina.goto('/')

  /*
   * Esperar o app criar o banco antes de semear.
   *
   * Quem cria as tabelas é o próprio app, ao montar. Semear antes disso abria
   * um banco vazio e a transação estourava — o que só aparecia com os testes
   * rodando em paralelo, quando o servidor demora mais a responder. Era
   * instabilidade de teste de verdade, e não do produto.
   */
  await pagina.waitForFunction(
    async () =>
      new Promise<boolean>((ok) => {
        const pedido = indexedDB.open('novelo')
        pedido.onerror = () => ok(false)
        pedido.onsuccess = () => {
          const banco = pedido.result
          const pronto = ['linhas', 'agulhas', 'receitas', 'projetos', 'amostras'].every((tabela) =>
            banco.objectStoreNames.contains(tabela),
          )
          banco.close()
          ok(pronto)
        }
      }),
    null,
    { timeout: 30_000 },
  )

  await pagina.evaluate(
    async ({ receita, nomeDoTrabalho, comTrabalho }) => {
      const banco = await new Promise<IDBDatabase>((ok, erro) => {
        const pedido = indexedDB.open('novelo')
        pedido.onsuccess = () => ok(pedido.result)
        pedido.onerror = () => erro(pedido.error)
      })
      const agora = new Date().toISOString()
      const base = (extra: Record<string, unknown>) => ({
        id: crypto.randomUUID(),
        donoId: 'local',
        criadoEm: agora,
        atualizadoEm: agora,
        ...extra,
      })

      const linha = base({
        marca: 'Círculo', nome: 'Anne', cor: 'vermelho', corHex: '#9c3b4a',
        composicao: '100% algodão', quantidade: 3, espessura: 'média',
      })
      const agulha = base({ tipo: 'croche', numero: 4, quantidade: 1 })
      const guardada = base({ titulo: 'Manta de ondas', tipo: 'croche', texto: receita })

      const tabelas = ['linhas', 'agulhas', 'receitas', 'projetos']
      const tx = banco.transaction(tabelas, 'readwrite')
      tx.objectStore('linhas').put(linha)
      tx.objectStore('agulhas').put(agulha)
      tx.objectStore('receitas').put(guardada)
      if (comTrabalho) {
        tx.objectStore('projetos').put(
          base({
            nome: nomeDoTrabalho, receitaId: (guardada as { id: string }).id, status: 'andamento',
            carreiraAtual: 4, contadores: [], lembretes: [], segundosTotais: 8130, sessoes: [],
            linhaIds: [(linha as { id: string }).id], agulhaIds: [(agulha as { id: string }).id],
            travado: false,
          }),
        )
      }
      await new Promise((ok) => (tx.oncomplete = ok))
      banco.close()
    },
    { receita: RECEITA, nomeDoTrabalho: NOME_DO_TRABALHO, comTrabalho },
  )
  await pagina.reload()
}
