import { useCallback, useEffect, useState } from 'react'
import { useAjustes } from '../dados/repositorio'
import { TelaProjetos, TelaProjetoEditor } from './TelaProjetos'
import { TelaReceitas, TelaReceitaEditor } from './TelaReceitas'
import { TelaMateriais, TelaLinhaEditor, TelaAgulhaEditor } from './TelaMateriais'
import { TelaTrabalho } from './TelaTrabalho'
import { TelaAjustes } from './TelaAjustes'
import { AvisoAtualizacao, useAtualizacaoDisponivel } from './AvisoAtualizacao'
import { IconeAjustes, IconeMateriais, IconeReceitas, IconeTrabalhos } from './icones'

export type Rota =
  | { tela: 'projetos' }
  | { tela: 'receitas' }
  | { tela: 'materiais' }
  | { tela: 'ajustes' }
  | { tela: 'trabalho'; id: string }
  | { tela: 'projeto'; id?: string; receitaId?: string }
  | { tela: 'receita'; id?: string }
  | { tela: 'linha'; id?: string }
  | { tela: 'agulha'; id?: string }

export interface Navegacao {
  ir: (rota: Rota) => void
  voltar: () => void
}

const ABAS = [
  { tela: 'projetos', Icone: IconeTrabalhos, texto: 'Trabalhos' },
  { tela: 'receitas', Icone: IconeReceitas, texto: 'Receitas' },
  { tela: 'materiais', Icone: IconeMateriais, texto: 'Materiais' },
  { tela: 'ajustes', Icone: IconeAjustes, texto: 'Ajustes' },
] as const

export function App() {
  const [pilha, setPilha] = useState<Rota[]>([{ tela: 'projetos' }])
  const ajustes = useAjustes()
  const atual = pilha[pilha.length - 1]

  // Deixa o botão "voltar" do celular funcionar como a pessoa espera.
  useEffect(() => {
    const aoVoltar = () => setPilha((anterior) => (anterior.length > 1 ? anterior.slice(0, -1) : anterior))
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--escala', String(ajustes.tamanhoLetra))
  }, [ajustes.tamanhoLetra])

  const ir = useCallback((rota: Rota) => {
    history.pushState({}, '')
    setPilha((anterior) => [...anterior, rota])
  }, [])

  const voltar = useCallback(() => {
    if (pilha.length > 1) history.back()
  }, [pilha.length])

  const trocarAba = useCallback((tela: Rota['tela']) => {
    setPilha([{ tela } as Rota])
  }, [])

  const navegacao: Navegacao = { ir, voltar }
  const atualizacao = useAtualizacaoDisponivel()

  // O modo trabalho toma a tela inteira: nada de aba embaixo tirando espaço.
  if (atual.tela === 'trabalho') {
    return (
      <>
        <TelaTrabalho projetoId={atual.id} navegacao={navegacao} />
        {atualizacao.disponivel && <AvisoAtualizacao atualizar={atualizacao.atualizar} />}
      </>
    )
  }

  return (
    <div className="aplicativo">
      {atualizacao.disponivel && <AvisoAtualizacao atualizar={atualizacao.atualizar} />}
      <main className="conteudo">
        {atual.tela === 'projetos' && <TelaProjetos navegacao={navegacao} />}
        {atual.tela === 'receitas' && <TelaReceitas navegacao={navegacao} />}
        {atual.tela === 'materiais' && <TelaMateriais navegacao={navegacao} />}
        {atual.tela === 'ajustes' && <TelaAjustes />}
        {atual.tela === 'projeto' && (
          <TelaProjetoEditor id={atual.id} receitaId={atual.receitaId} navegacao={navegacao} />
        )}
        {atual.tela === 'receita' && <TelaReceitaEditor id={atual.id} navegacao={navegacao} />}
        {atual.tela === 'linha' && <TelaLinhaEditor id={atual.id} navegacao={navegacao} />}
        {atual.tela === 'agulha' && <TelaAgulhaEditor id={atual.id} navegacao={navegacao} />}
      </main>

      <nav className="abas" aria-label="Seções do aplicativo">
        {ABAS.map((aba) => (
          <button
            key={aba.tela}
            className="aba"
            aria-current={atual.tela === aba.tela ? 'page' : undefined}
            onClick={() => trocarAba(aba.tela)}
          >
            <span className="simbolo">
              <aba.Icone />
            </span>
            {aba.texto}
          </button>
        ))}
      </nav>
    </div>
  )
}
