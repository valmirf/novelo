/**
 * Dados de mentira para as telas terem conteúdo de verdade.
 *
 * Fica fora dos testes para que a captura de tela e a suíte usem exatamente a
 * mesma cozinha: tela conferida com um dado e testada com outro é tela não
 * conferida.
 */
export const SEMENTE = {
  linha: {
    marca: 'Círculo', nome: 'Anne', cor: 'vermelho', corHex: '#9c3b4a',
    lote: '4021', composicao: '100% algodão', gramatura: 100, metragem: 130,
    quantidade: 3, espessura: 'média',
  },
  agulha: { tipo: 'croche', numero: 4, material: 'alumínio', quantidade: 1 },
  receita: {
    titulo: 'Manta de ondas', tipo: 'croche',
    texto: [
      'Amostra: 18 pontos e 24 carreiras em 10 cm.',
      'Monte 120 correntinhas.',
      'Carr 1: 1 pa em cada corrente. (120 pa)',
      'Carr 2: 1 pa em cada ponto. (120 pa)',
      'Carr 3: *3 pa, 1 aum, 3 pa*, repita ate o fim. (135 pa)',
      'Carr 4: 1 pa em cada ponto. (135 pa)',
      'Trabalhar as carr 3 e 4 - 18 vezes.',
      'Carr 5: arremate e esconda as pontas.',
    ].join('\n'),
  },
  projeto: {
    nome: 'Manta da Sofia', status: 'andamento', carreiraAtual: 4,
    contadores: [], lembretes: [], segundosTotais: 8130, sessoes: [], travado: false,
  },
  amostra: {
    nome: 'Anne com agulha 4', tipo: 'croche', ponto: 'ponto alto',
    pontos: 18, carreiras: 24, blocada: true,
    pontosBlocada: 16, carreirasBlocada: 22, larguraBlocada: 12.5, alturaBlocada: 11,
  },
}

/** Escreve a semente direto no IndexedDB, antes do app ler qualquer coisa. */
export async function semear(page) {
  await page.evaluate(async (s) => {
    const db = await new Promise((ok, err) => {
      const r = indexedDB.open('novelo')
      r.onsuccess = () => ok(r.result)
      r.onerror = () => err(r.error)
    })
    const agora = new Date().toISOString()
    const base = (x) => ({ id: crypto.randomUUID(), donoId: 'local', criadoEm: agora, atualizadoEm: agora, ...x })

    const linha = base(s.linha)
    const agulha = base(s.agulha)
    const receita = base(s.receita)
    const projeto = base({ ...s.projeto, receitaId: receita.id, linhaIds: [linha.id], agulhaIds: [agulha.id] })
    const amostra = base({ ...s.amostra, linhaId: linha.id, agulhaId: agulha.id })

    const tx = db.transaction(['linhas', 'agulhas', 'receitas', 'projetos', 'amostras'], 'readwrite')
    tx.objectStore('linhas').put(linha)
    tx.objectStore('agulhas').put(agulha)
    tx.objectStore('receitas').put(receita)
    tx.objectStore('projetos').put(projeto)
    tx.objectStore('amostras').put(amostra)
    await new Promise((ok) => (tx.oncomplete = ok))
    db.close()
  }, SEMENTE)
}
