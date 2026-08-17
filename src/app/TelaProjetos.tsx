import { useState } from 'react'
import type { Navegacao } from './App'
import {
  repositorio,
  useAgulhas,
  useLinhas,
  useProjeto,
  useProjetos,
  useReceita,
  useReceitas,
} from '../dados/repositorio'
import { novoId, type Projeto, type StatusProjeto } from '../nucleo/tipos'
import { contarTamanhos, nomesDeTamanhos } from '../nucleo/tamanhos'
import { IconeGrande, IconeMais, IconeTrabalhos } from './icones'
import { formatarDuracao } from './ganchos'
import { Aviso, Cabecalho, Campo, Confirmacao, Escolha, Miniatura, SeletorFoto, Vazio } from './ui'

const NOMES_STATUS: Record<StatusProjeto, string> = {
  andamento: 'Fazendo agora',
  pausado: 'Parado',
  finalizado: 'Pronto',
}

export function TelaProjetos({ navegacao }: { navegacao: Navegacao }) {
  const projetos = useProjetos()

  return (
    <>
      <Cabecalho titulo="Novelo" marca />

      <button className="botao principal largo gigante" onClick={() => navegacao.ir({ tela: 'projeto' })}>
        <IconeMais /> Começar um trabalho novo
      </button>

      <div style={{ marginTop: '1.2rem' }}>
        {projetos.length === 0 ? (
          <Vazio
            desenho={<IconeGrande><IconeTrabalhos /></IconeGrande>}
            titulo="Nenhum trabalho começado"
            texto="Um trabalho é a peça que você está fazendo agora. Ele guarda em que carreira você parou, quanto tempo já levou e qual linha está usando."
          />
        ) : (
          <>
          <h2 className="rotulo-lista">Meus trabalhos</h2>
          {projetos.map((projeto) => (
            <div key={projeto.id} className="cartao">
              <div className="cartao-linha">
                <Miniatura fotoId={projeto.fotoId} alt={`Foto de ${projeto.nome}`} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="cartao-titulo">{projeto.nome}</div>
                  <div>
                    <span className={`selo ${projeto.status === 'finalizado' ? 'certo' : ''}`}>
                      {NOMES_STATUS[projeto.status]}
                    </span>
                  </div>
                  <div className="suave" style={{ marginTop: '0.3rem' }}>
                    Carreira {projeto.carreiraAtual + 1} · {formatarDuracao(projeto.segundosTotais)}
                  </div>
                </div>
              </div>

              <div className="linha-botoes" style={{ marginTop: '0.9rem' }}>
                <button
                  className="botao principal"
                  onClick={() => navegacao.ir({ tela: 'trabalho', id: projeto.id })}
                >
                  Continuar
                </button>
                <button
                  className="botao contorno"
                  onClick={() => navegacao.ir({ tela: 'projeto', id: projeto.id })}
                >
                  Detalhes
                </button>
              </div>
            </div>
          ))}
          </>
        )}
      </div>
    </>
  )
}

export function TelaProjetoEditor({
  id,
  receitaId,
  navegacao,
}: {
  id?: string
  receitaId?: string
  navegacao: Navegacao
}) {
  const salvo = useProjeto(id)
  const receitas = useReceitas()
  const linhas = useLinhas()
  const agulhas = useAgulhas()
  const receitaBase = useReceita(receitaId)
  const receitaLigada = useReceita(salvo?.receitaId ?? receitaId)
  const [rascunho, setRascunho] = useState<Partial<Projeto> | null>(null)
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)

  const inicial: Partial<Projeto> = salvo ?? {
    nome: receitaBase?.titulo ?? '',
    receitaId,
    status: 'andamento',
    carreiraAtual: 0,
    contadores: [],
    lembretes: [],
    segundosTotais: 0,
    sessoes: [],
    linhaIds: [],
    agulhaIds: [],
    travado: false,
  }
  const projeto = rascunho ?? inicial

  const mudar = (mudancas: Partial<Projeto>) => setRascunho({ ...projeto, ...mudancas })

  const quantosTamanhos = contarTamanhos(receitaLigada?.texto ?? '')
  const nomesTamanhos = nomesDeTamanhos(receitaLigada?.texto ?? '', quantosTamanhos)

  const alternar = (campo: 'linhaIds' | 'agulhaIds', valor: string) => {
    const atual = projeto[campo] ?? []
    mudar({
      [campo]: atual.includes(valor) ? atual.filter((item) => item !== valor) : [...atual, valor],
    } as Partial<Projeto>)
  }

  const salvar = async () => {
    const nome = (projeto.nome ?? '').trim()
    if (!nome) return
    const gravado = await repositorio.projetos.salvar({
      ...projeto,
      id,
      nome,
      status: projeto.status ?? 'andamento',
      carreiraAtual: projeto.carreiraAtual ?? 0,
      contadores: projeto.contadores ?? [],
      lembretes: projeto.lembretes ?? [],
      segundosTotais: projeto.segundosTotais ?? 0,
      sessoes: projeto.sessoes ?? [],
      linhaIds: projeto.linhaIds ?? [],
      agulhaIds: projeto.agulhaIds ?? [],
      travado: projeto.travado ?? false,
    } as Projeto)

    if (id) navegacao.voltar()
    else navegacao.ir({ tela: 'trabalho', id: gravado.id })
  }

  const apagar = async () => {
    if (id) await repositorio.projetos.apagar(id)
    setConfirmandoApagar(false)
    navegacao.voltar()
  }

  return (
    <>
      <Cabecalho titulo={id ? 'Detalhes do trabalho' : 'Trabalho novo'} aoVoltar={navegacao.voltar} />

      <Campo rotulo="Nome do trabalho" ajuda="Por exemplo: Manta da Sofia">
        <input
          type="text"
          value={projeto.nome ?? ''}
          onChange={(evento) => mudar({ nome: evento.target.value })}
        />
      </Campo>

      <Campo rotulo="Receita" ajuda="Escolha a receita para o app ir lendo carreira por carreira">
        <select
          value={projeto.receitaId ?? ''}
          onChange={(evento) => mudar({ receitaId: evento.target.value || undefined })}
        >
          <option value="">Sem receita — só contar carreiras</option>
          {receitas.map((receita) => (
            <option key={receita.id} value={receita.id}>
              {receita.titulo}
            </option>
          ))}
        </select>
      </Campo>

      {receitas.length === 0 && (
        <Aviso>
          Você ainda não guardou nenhuma receita. Dá para começar assim mesmo e usar só os contadores.
        </Aviso>
      )}

      <Escolha
        rotulo="Como está esse trabalho?"
        valor={projeto.status ?? 'andamento'}
        opcoes={[
          { valor: 'andamento' as StatusProjeto, texto: 'Fazendo' },
          { valor: 'pausado' as StatusProjeto, texto: 'Parado' },
          { valor: 'finalizado' as StatusProjeto, texto: 'Pronto' },
        ]}
        aoMudar={(status) => mudar({ status })}
      />

      {/* O nome da foto acompanha o andamento: no começo não existe peça pronta. */}
      {quantosTamanhos >= 2 && (
        <Escolha
          rotulo="Tamanho que você está fazendo"
          ajuda="A receita traz vários tamanhos juntos; o app mostra só os números do seu"
          valor={projeto.tamanho ?? -1}
          opcoes={[
            { valor: -1, texto: 'Ainda não escolhi' },
            ...nomesTamanhos.map((nome, indice) => ({ valor: indice, texto: nome })),
          ]}
          aoMudar={(tamanho) => mudar({ tamanho: tamanho < 0 ? undefined : tamanho })}
        />
      )}

      <SeletorFoto
        rotulo={projeto.status === 'finalizado' ? 'Foto da peça pronta' : 'Foto de como está ficando'}
        ajuda={
          projeto.status === 'finalizado'
            ? 'O registro da peça terminada.'
            : 'Vale fotografar durante o trabalho. No fim, troque pela foto da peça pronta.'
        }
        fotoId={projeto.fotoId}
        aoTrocar={(fotoId) => mudar({ fotoId })}
      />

      {/*
        Antes estas duas seções simplesmente não apareciam quando o inventário
        estava vazio — e aí não havia como descobrir que dava para marcar linha
        e agulha no trabalho. Agora a seção aparece sempre, e quando não há o
        que marcar ela diz onde cadastrar e leva até lá.
      */}
      <div className="campo">
        <span>
          Linhas usadas
          <br />
          <span className="ajuda">
            {linhas.length > 0
              ? 'Toque para marcar as que estão nesse trabalho'
              : 'Você ainda não guardou nenhuma linha'}
          </span>
        </span>
        {linhas.length > 0 ? (
          <div className="opcoes" style={{ flexDirection: 'column' }}>
            {linhas.map((linha) => (
              <button
                key={linha.id}
                type="button"
                className="opcao"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                aria-pressed={(projeto.linhaIds ?? []).includes(linha.id)}
                onClick={() => alternar('linhaIds', linha.id)}
              >
                {linha.marca} {linha.nome} — {linha.cor}
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="botao contorno largo"
            onClick={() => navegacao.ir({ tela: 'linha' })}
          >
            Guardar uma linha
          </button>
        )}
      </div>

      <div className="campo">
        <span>
          Agulhas usadas
          <br />
          <span className="ajuda">
            {agulhas.length > 0
              ? 'Toque para marcar as que estão nesse trabalho'
              : 'Você ainda não guardou nenhuma agulha'}
          </span>
        </span>
        {agulhas.length > 0 ? (
          <div className="opcoes" style={{ flexDirection: 'column' }}>
            {agulhas.map((agulha) => (
              <button
                key={agulha.id}
                type="button"
                className="opcao"
                style={{ width: '100%', justifyContent: 'flex-start' }}
                aria-pressed={(projeto.agulhaIds ?? []).includes(agulha.id)}
                onClick={() => alternar('agulhaIds', agulha.id)}
              >
                {agulha.tipo} {agulha.numero.toString().replace('.', ',')} mm
              </button>
            ))}
          </div>
        ) : (
          <button
            type="button"
            className="botao contorno largo"
            onClick={() => navegacao.ir({ tela: 'agulha' })}
          >
            Guardar uma agulha
          </button>
        )}
      </div>

      <div className="campo-duplo">
        <Campo rotulo="Minha amostra: pontos em 10 cm">
          <input
            type="number"
            inputMode="numeric"
            value={projeto.amostraReal?.pontos ?? ''}
            onChange={(evento) =>
              mudar({
                amostraReal: {
                  pontos: Number(evento.target.value),
                  carreiras: projeto.amostraReal?.carreiras ?? 0,
                },
              })
            }
          />
        </Campo>
        <Campo rotulo="Carreiras em 10 cm">
          <input
            type="number"
            inputMode="numeric"
            value={projeto.amostraReal?.carreiras ?? ''}
            onChange={(evento) =>
              mudar({
                amostraReal: {
                  pontos: projeto.amostraReal?.pontos ?? 0,
                  carreiras: Number(evento.target.value),
                },
              })
            }
          />
        </Campo>
      </div>

      <Campo rotulo="Anotações">
        <textarea
          style={{ minHeight: '6rem' }}
          value={projeto.notas ?? ''}
          onChange={(evento) => mudar({ notas: evento.target.value })}
        />
      </Campo>

      {id && (projeto.sessoes?.length ?? 0) > 0 && (
        <div className="cartao">
          <h2>Tempo de trabalho</h2>
          <p style={{ fontSize: '1.3rem', fontWeight: 700 }}>
            {formatarDuracao(projeto.segundosTotais ?? 0)} no total
          </p>
          {projeto.status === 'finalizado' && (
            <p className="suave">
              Marcar como pronto não apaga nada: o tempo, as carreiras, a linha e a agulha ficam
              guardados aqui como registro da peça.
            </p>
          )}
          {(projeto.sessoes ?? [])
            .slice(-6)
            .reverse()
            .map((sessao, indice) => (
              <div key={indice} className="suave">
                {new Date(sessao.inicio).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })}{' '}
                — {formatarDuracao(sessao.segundos)}
              </div>
            ))}
        </div>
      )}

      <button
        className="botao principal largo gigante"
        disabled={!(projeto.nome ?? '').trim()}
        onClick={() => void salvar()}
      >
        {id ? 'Salvar' : 'Começar a trabalhar'}
      </button>

      {id && (
        <button
          className="botao perigo largo"
          style={{ marginTop: '0.7rem' }}
          onClick={() => setConfirmandoApagar(true)}
        >
          Apagar este trabalho
        </button>
      )}

      {confirmandoApagar && (
        <Confirmacao
          titulo="Apagar o trabalho?"
          texto={`"${projeto.nome}" sai da lista, junto com a contagem de carreiras e o tempo registrado. A receita continua guardada.`}
          confirmar="Sim, apagar"
          perigo
          aoConfirmar={() => void apagar()}
          aoCancelar={() => setConfirmandoApagar(false)}
        />
      )}
    </>
  )
}

/** Contador extra já pronto, do jeito que a Row Counter faz: vinculado e com volta. */
export function contadorNovo(nome: string, reiniciaEm?: number) {
  return {
    id: novoId(),
    nome,
    valor: 0,
    cor: '#7c4a3a',
    reiniciaEm,
    voltas: 0,
    vinculado: true,
  }
}
