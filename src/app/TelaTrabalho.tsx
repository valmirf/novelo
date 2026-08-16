import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Navegacao } from './App'
import { repositorio, useAjustes, useProjeto, useReceita } from '../dados/repositorio'
import { interpretar } from '../nucleo/interpretador'
import { montarSequencia } from '../nucleo/sequencia'
import { aplicarTamanho, contarTamanhos, dependeDoTamanho, nomesDeTamanhos } from '../nucleo/tamanhos'
import { novoId, type Contador, type Lembrete, type Projeto } from '../nucleo/tipos'
import { formatarDuracao, useComandoPorVoz, useCronometro, useSom, useTelaAcesa } from './ganchos'
import { Aviso, Campo, Confirmacao } from './ui'

export function TelaTrabalho({ projetoId, navegacao }: { projetoId: string; navegacao: Navegacao }) {
  const projeto = useProjeto(projetoId)
  const receita = useReceita(projeto?.receitaId)
  const ajustes = useAjustes()
  const cronometro = useCronometro()
  const tocar = useSom(ajustes.somAoContar)

  const [criandoContador, setCriandoContador] = useState(false)
  const [criandoLembrete, setCriandoLembrete] = useState(false)
  const [confirmandoZerar, setConfirmandoZerar] = useState(false)

  useTelaAcesa(ajustes.telaSempreAcesa)

  const leitura = useMemo(() => interpretar(receita?.texto ?? ''), [receita?.texto])

  const quantosTamanhos = useMemo(() => contarTamanhos(receita?.texto ?? ''), [receita?.texto])
  const nomesTamanhos = useMemo(
    () => nomesDeTamanhos(receita?.texto ?? '', quantosTamanhos),
    [receita?.texto, quantosTamanhos],
  )
  const [verTodosOsTamanhos, setVerTodosOsTamanhos] = useState(false)

  /** Deixa na linha só o número do tamanho que ela está fazendo. */
  const paraOTamanho = useCallback(
    (texto: string) =>
      verTodosOsTamanhos || projeto?.tamanho === undefined
        ? texto
        : aplicarTamanho(texto, projeto.tamanho, quantosTamanhos),
    [verTodosOsTamanhos, projeto?.tamanho, quantosTamanhos],
  )

  // A sequência já vem com os blocos repetidos expandidos: "Trabalhar as carr
  // 3 e 4 - 18 vezes" vira 18 passadas de verdade, para ela só tocar "próxima".
  // O tamanho é aplicado ANTES de ler o número de repetições — senão "18, 20
  // (22, 24) vezes" viraria sempre 18, e a peça sairia do comprimento errado.
  const linhas = useMemo(
    () =>
      montarSequencia(leitura, (texto) =>
        projeto?.tamanho === undefined
          ? texto
          : aplicarTamanho(texto, projeto.tamanho, quantosTamanhos),
      ),
    [leitura, projeto?.tamanho, quantosTamanhos],
  )

  const posicao = projeto?.carreiraAtual ?? 0
  const atual = linhas[posicao]
  const proxima = linhas[posicao + 1]

  // Guarda o projeto numa referência para os atalhos de voz não ficarem presos
  // a um valor velho.
  const projetoRef = useRef<Projeto | undefined>(projeto)
  projetoRef.current = projeto

  const gravar = useCallback(async (mudancas: Partial<Projeto>) => {
    const base = projetoRef.current
    if (!base) return
    await repositorio.projetos.salvar({ ...base, ...mudancas })
  }, [])

  /** Fecha a sessão de cronômetro em aberto e soma no total do trabalho. */
  const registrarSessao = useCallback(
    async (segundos: number) => {
      const base = projetoRef.current
      if (!base || segundos < 5) return
      const fim = new Date()
      const inicio = new Date(fim.getTime() - segundos * 1000)
      await repositorio.projetos.salvar({
        ...base,
        segundosTotais: base.segundosTotais + segundos,
        sessoes: [
          ...base.sessoes,
          { inicio: inicio.toISOString(), fim: fim.toISOString(), segundos },
        ],
      })
    },
    [],
  )

  // As funções do cronômetro trocam de identidade a cada segundo; guardar em
  // referência evita que os efeitos abaixo re-disparem sem parar.
  const comandos = useRef(cronometro)
  comandos.current = cronometro

  /** Pausa feita no botão não deve ser desfeita ao voltar para o app. */
  const pausadoPeloUsuario = useRef(false)

  // O cronômetro começa sozinho: ela abriu a tela para trabalhar.
  useEffect(() => {
    comandos.current.comecar()
  }, [])

  // Sai da frente, pausa e guarda o tempo; volta para a frente, retoma sozinho.
  // Sem isso o celular no bolso contaria horas que ninguém trabalhou, e uma pausa
  // silenciosa faria a sessão seguinte não contar nada.
  useEffect(() => {
    const aoTrocarVisibilidade = () => {
      if (document.visibilityState === 'hidden') {
        const segundos = comandos.current.parar()
        void registrarSessao(segundos)
        comandos.current.zerar()
      } else if (!pausadoPeloUsuario.current) {
        comandos.current.comecar()
      }
    }
    document.addEventListener('visibilitychange', aoTrocarVisibilidade)
    return () => {
      document.removeEventListener('visibilitychange', aoTrocarVisibilidade)
      const segundos = comandos.current.parar()
      void registrarSessao(segundos)
    }
  }, [registrarSessao])

  const mover = useCallback(
    (passo: 1 | -1) => {
      const base = projetoRef.current
      if (!base || base.travado) return

      const limite = Math.max(linhas.length - 1, 0)
      const destino = Math.min(Math.max(base.carreiraAtual + passo, 0), limite)
      if (destino === base.carreiraAtual && passo === 1 && linhas.length > 0) return

      const numeroDestino = linhas[destino]?.numero ?? destino + 1
      const contadores = base.contadores.map((contador) =>
        contador.vinculado && dentroDoIntervalo(contador, numeroDestino)
          ? andar(contador, passo)
          : contador,
      )

      tocar()
      navigator.vibrate?.(passo === 1 ? 30 : [15, 40, 15])
      void repositorio.projetos.salvar({ ...base, carreiraAtual: destino, contadores })
    },
    [linhas, tocar],
  )

  useComandoPorVoz(ajustes.comandoPorVoz, (comando) => mover(comando === 'avancar' ? 1 : -1))

  const sair = async () => {
    const segundos = cronometro.parar()
    await registrarSessao(segundos)
    cronometro.zerar()
    navegacao.voltar()
  }

  if (!projeto) {
    return (
      <div className="trabalho">
        <div className="trabalho-corpo">
          <p>Carregando…</p>
        </div>
      </div>
    )
  }

  const semReceita = linhas.length === 0
  const lembretesAgora = projeto.lembretes.filter(
    (lembrete) => !lembrete.visto && lembrete.carreira === (atual?.numero ?? posicao + 1),
  )

  const marcarLembreteVisto = (id: string) => {
    void gravar({
      lembretes: projeto.lembretes.map((lembrete) =>
        lembrete.id === id ? { ...lembrete, visto: true } : lembrete,
      ),
    })
  }

  const grupoDaCarreira = atual?.carreira.itens.find((item) => item.tipo === 'grupo')

  // Os recados já vêm presos ao passo certo pela montagem da sequência, e as
  // instruções de repetir bloco não aparecem aqui: viraram carreiras de verdade.
  const recadosAqui = atual?.recados ?? []

  return (
    <div className="trabalho">
      <header className="cabecalho">
        <button className="botao contorno" onClick={() => void sair()}>
          <span aria-hidden="true">←</span> Sair
        </button>
        <h1 style={{ fontSize: '1.1rem' }}>{projeto.nome}</h1>
      </header>

      <div className="trabalho-corpo">
        {lembretesAgora.map((lembrete) => (
          <div key={lembrete.id} className="aviso atencao" style={{ display: 'block' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              ⚠ Lembrete desta carreira
            </div>
            <div style={{ marginBottom: '0.7rem' }}>{lembrete.texto}</div>
            <button className="botao contorno largo" onClick={() => marcarLembreteVisto(lembrete.id)}>
              Entendi
            </button>
          </div>
        ))}

        {projeto.travado && (
          <div className="travado-aviso">🔒 Contagem travada — destrave para contar</div>
        )}

        {/*
          Receita de roupa traz todos os tamanhos na mesma linha. Perguntar uma
          vez e mostrar só o número dela evita o erro mais caro desse tipo de
          receita: ler o número do tamanho errado no meio do trabalho.
        */}
        {quantosTamanhos >= 2 && projeto.tamanho === undefined && (
          <div className="cartao">
            <h2>Qual é o seu tamanho?</h2>
            <p className="suave">
              Esta receita traz {quantosTamanhos} tamanhos juntos. Escolha o seu e eu mostro só os
              seus números — dá para trocar depois.
            </p>
            <div className="opcoes" style={{ flexDirection: 'column' }}>
              {nomesTamanhos.map((nome, indice) => (
                <button
                  key={nome}
                  type="button"
                  className="opcao"
                  style={{ width: '100%' }}
                  onClick={() => void gravar({ tamanho: indice })}
                >
                  {nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {semReceita ? (
          <div className="carreira-atual">
            <div className="rotulo">Carreira</div>
            <div style={{ fontSize: '4rem', fontWeight: 800, lineHeight: 1 }}>{posicao + 1}</div>
            <p className="suave" style={{ marginTop: '0.6rem' }}>
              {projeto.receitaId
                ? 'Não consegui ler as carreiras dessa receita. Confira o texto dela em Receitas.'
                : 'Esse trabalho não tem receita — o app está só contando as carreiras.'}
            </p>
          </div>
        ) : (
          <>
            <div className="carreira-atual">
              <div className="rotulo">
                {atual.carreira.secao && <>{atual.carreira.secao} · </>}
                Carreira {atual.numero}
                {atual.carreira.lado && ` (${atual.carreira.lado})`}
                {atual.totalRepeticoes > 1 && (
                  <>
                    {' · '}
                    <strong>
                      {atual.repeticao}ª vez de {atual.totalRepeticoes}
                    </strong>
                  </>
                )}
              </div>

              {/*
                Quando a contagem foi mesmo apurada, a versão expandida ajuda:
                "(1 pb, 1 aum) x6" vira uma frase. Quando não foi — receita de
                tricô que manda "M até o Marc 1" — o texto da receita é melhor do
                que qualquer paráfrase minha, e não corre risco de dizer bobagem.
              */}
              <div className="instrucao">
                {atual.carreira.contagemConfiavel
                  ? atual.carreira.resumo
                  : paraOTamanho(atual.carreira.textoOriginal)}
              </div>

              {quantosTamanhos >= 2 &&
                projeto.tamanho !== undefined &&
                dependeDoTamanho(atual.carreira.textoOriginal, quantosTamanhos) && (
                  <button
                    className="botao contorno"
                    style={{ marginTop: '0.6rem', minHeight: '2.8rem', fontSize: '0.9rem' }}
                    onClick={() => setVerTodosOsTamanhos((atual) => !atual)}
                  >
                    {verTodosOsTamanhos
                      ? `Mostrar só o ${nomesTamanhos[projeto.tamanho]}`
                      : 'Ver todos os tamanhos'}
                  </button>
                )}

              {atual.carreira.contagemConfiavel && atual.carreira.itens.length > 1 && (
                <ul className="passos">
                  {atual.carreira.itens.map((item, indice) => (
                    <li
                      key={indice}
                      className={`passo ${item.tipo === 'grupo' ? 'repeticao' : ''}`}
                    >
                      {item.rotulo}
                    </li>
                  ))}
                </ul>
              )}

              {atual.carreira.contagemConfiavel ? (
                <p className="suave" style={{ marginTop: '0.8rem', marginBottom: 0 }}>
                  Ao terminar, você deve ter <strong>{atual.carreira.produz} pontos</strong>.
                </p>
              ) : (
                atual.carreira.totalDeclarado !== undefined && (
                  <p className="suave" style={{ marginTop: '0.8rem', marginBottom: 0 }}>
                    A receita diz que aqui você deve ter{' '}
                    <strong>{atual.carreira.totalDeclarado} pontos</strong>.
                  </p>
                )
              )}
            </div>

            {atual.carreira.divergencia && (
              <Aviso tipo="problema">{atual.carreira.divergencia}</Aviso>
            )}
            {atual.carreira.avisos.map((aviso, indice) => (
              <Aviso key={indice}>{aviso}</Aviso>
            ))}

            {/* Parágrafos que vêm entre as carreiras: repetir bloco, trocar cor. */}
            {recadosAqui.map((recado, indice) => (
              <div key={indice} className="carreira-proxima">
                {paraOTamanho(recado)}
              </div>
            ))}

            {proxima && (
              <div className="carreira-proxima">
                <strong>Depois vem:</strong>{' '}
                {proxima.carreira.contagemConfiavel
                  ? proxima.carreira.resumo
                  : paraOTamanho(proxima.carreira.textoOriginal)}
              </div>
            )}
          </>
        )}

        <div className="contadores">
          <div className="contador">
            <div className="nome">Carreiras</div>
            <div className="valor">{posicao + 1}</div>
            {!semReceita && <div className="voltas">de {linhas.length}</div>}
          </div>

          {projeto.contadores.map((contador) => (
            <div key={contador.id} className="contador">
              <div className="nome">{contador.nome}</div>
              <div className="valor">
                {contador.valor}
                {contador.reiniciaEm ? (
                  <span style={{ fontSize: '1.1rem' }}> / {contador.reiniciaEm}</span>
                ) : null}
              </div>
              <div className="voltas">
                {contador.voltas > 0
                  ? `${contador.voltas} ${contador.voltas === 1 ? 'repetição feita' : 'repetições feitas'}`
                  : contador.vinculado
                    ? 'sobe com a carreira'
                    : 'contagem à mão'}
              </div>
              <div className="contador-botoes">
                <button
                  className="botao contorno"
                  aria-label={`Diminuir ${contador.nome}`}
                  onClick={() =>
                    void gravar({
                      contadores: projeto.contadores.map((c) =>
                        c.id === contador.id ? andar(c, -1) : c,
                      ),
                    })
                  }
                >
                  −
                </button>
                <button
                  className="botao contorno"
                  aria-label={`Aumentar ${contador.nome}`}
                  onClick={() => {
                    tocar()
                    void gravar({
                      contadores: projeto.contadores.map((c) =>
                        c.id === contador.id ? andar(c, 1) : c,
                      ),
                    })
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="linha-botoes" style={{ marginBottom: '1rem' }}>
          <button className="botao contorno" onClick={() => setCriandoContador(true)}>
            Novo contador
          </button>
          <button className="botao contorno" onClick={() => setCriandoLembrete(true)}>
            Novo lembrete
          </button>
        </div>

        {grupoDaCarreira?.tipo === 'grupo' &&
          !projeto.contadores.some((c) => c.reiniciaEm === grupoDaCarreira.repeticoes) && (
            <button
              className="botao contorno largo"
              style={{ marginBottom: '1rem' }}
              onClick={() =>
                void gravar({
                  contadores: [
                    ...projeto.contadores,
                    {
                      id: novoId(),
                      nome: 'Repetições',
                      valor: 0,
                      cor: '#7c4a3a',
                      reiniciaEm: grupoDaCarreira.repeticoes,
                      voltas: 0,
                      vinculado: false,
                    },
                  ],
                })
              }
            >
              Contar as {grupoDaCarreira.repeticoes} repetições desta carreira
            </button>
          )}

        <div className="linha-botoes">
          <button
            className="botao contorno"
            onClick={() => void gravar({ travado: !projeto.travado })}
          >
            {projeto.travado ? '🔓 Destravar' : '🔒 Travar contagem'}
          </button>
          <button className="botao contorno" onClick={() => setConfirmandoZerar(true)}>
            Voltar ao começo
          </button>
        </div>
      </div>

      <footer className="trabalho-rodape">
        <div className="cronometro">
          <div>
            <div className="suave">Tempo desta sessão</div>
            <div className="tempo">{formatarDuracao(cronometro.segundos)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="suave">No total</div>
            <div style={{ fontWeight: 700 }}>
              {formatarDuracao(projeto.segundosTotais + cronometro.segundos)}
            </div>
          </div>
          <button
            className="botao contorno"
            onClick={() => {
              if (cronometro.rodando) {
                pausadoPeloUsuario.current = true
                const segundos = cronometro.parar()
                void registrarSessao(segundos)
                cronometro.zerar()
              } else {
                pausadoPeloUsuario.current = false
                cronometro.comecar()
              }
            }}
          >
            {cronometro.rodando ? '⏸ Pausar' : '▶ Continuar'}
          </button>
        </div>

        <div className="linha-botoes">
          <button
            className="botao contorno"
            style={{ flex: '0 0 32%' }}
            disabled={projeto.travado || posicao === 0}
            onClick={() => mover(-1)}
          >
            ← Voltar
          </button>
          <button
            className="botao principal gigante"
            disabled={projeto.travado || (!semReceita && posicao >= linhas.length - 1)}
            onClick={() => mover(1)}
          >
            Próxima carreira →
          </button>
        </div>
      </footer>

      {criandoContador && (
        <DialogoContador
          aoCriar={(contador) => {
            void gravar({ contadores: [...projeto.contadores, contador] })
            setCriandoContador(false)
          }}
          aoCancelar={() => setCriandoContador(false)}
        />
      )}

      {criandoLembrete && (
        <DialogoLembrete
          carreiraSugerida={atual?.numero ?? posicao + 1}
          aoCriar={(lembrete) => {
            void gravar({ lembretes: [...projeto.lembretes, lembrete] })
            setCriandoLembrete(false)
          }}
          aoCancelar={() => setCriandoLembrete(false)}
        />
      )}

      {confirmandoZerar && (
        <Confirmacao
          titulo="Voltar para a carreira 1?"
          texto="A contagem de carreiras e os contadores voltam a zero. O tempo já registrado continua guardado."
          confirmar="Sim, voltar ao começo"
          perigo
          aoConfirmar={() => {
            void gravar({
              carreiraAtual: 0,
              contadores: projeto.contadores.map((c) => ({ ...c, valor: 0, voltas: 0 })),
              lembretes: projeto.lembretes.map((l) => ({ ...l, visto: false })),
            })
            setConfirmandoZerar(false)
          }}
          aoCancelar={() => setConfirmandoZerar(false)}
        />
      )}
    </div>
  )
}

function dentroDoIntervalo(contador: Contador, carreira: number): boolean {
  if (contador.ativoDe !== undefined && carreira < contador.ativoDe) return false
  if (contador.ativoAte !== undefined && carreira > contador.ativoAte) return false
  return true
}

/** Anda um contador para frente ou para trás, respeitando o reinício automático. */
function andar(contador: Contador, passo: 1 | -1): Contador {
  if (passo === 1) {
    const valor = contador.valor + 1
    if (contador.reiniciaEm && valor >= contador.reiniciaEm) {
      return { ...contador, valor: 0, voltas: contador.voltas + 1 }
    }
    return { ...contador, valor }
  }

  if (contador.valor === 0) {
    if (contador.reiniciaEm && contador.voltas > 0) {
      return { ...contador, valor: contador.reiniciaEm - 1, voltas: contador.voltas - 1 }
    }
    return contador
  }
  return { ...contador, valor: contador.valor - 1 }
}

function DialogoContador({
  aoCriar,
  aoCancelar,
}: {
  aoCriar: (contador: Contador) => void
  aoCancelar: () => void
}) {
  const [nome, setNome] = useState('')
  const [reinicia, setReinicia] = useState('')
  const [vinculado, setVinculado] = useState(true)

  return (
    <div className="fundo-escuro" onClick={aoCancelar}>
      <div
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-label="Novo contador"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2>Novo contador</h2>
        <p className="suave">
          Serve para acompanhar uma parte do trabalho em separado: os aumentos, a troca de cor, ou
          quantas vezes você já repetiu o desenho.
        </p>

        <Campo rotulo="Nome do contador" ajuda="Ex.: Aumentos, Desenho, Trocas de cor">
          <input type="text" value={nome} onChange={(evento) => setNome(evento.target.value)} />
        </Campo>

        <Campo
          rotulo="Volta a zero a cada quantas?"
          ajuda="Deixe vazio para contar sem parar. Ex.: 8, se o desenho repete a cada 8 carreiras."
        >
          <input
            type="number"
            inputMode="numeric"
            value={reinicia}
            onChange={(evento) => setReinicia(evento.target.value)}
          />
        </Campo>

        <div className="opcoes" style={{ marginBottom: '1rem' }}>
          <button
            type="button"
            className="opcao"
            aria-pressed={vinculado}
            onClick={() => setVinculado(true)}
          >
            Sobe junto com a carreira
          </button>
          <button
            type="button"
            className="opcao"
            aria-pressed={!vinculado}
            onClick={() => setVinculado(false)}
          >
            Eu conto à mão
          </button>
        </div>

        <div className="linha-botoes">
          <button className="botao contorno" onClick={aoCancelar}>
            Cancelar
          </button>
          <button
            className="botao principal"
            disabled={!nome.trim()}
            onClick={() =>
              aoCriar({
                id: novoId(),
                nome: nome.trim(),
                valor: 0,
                cor: '#7c4a3a',
                reiniciaEm: reinicia ? Number(reinicia) : undefined,
                voltas: 0,
                vinculado,
              })
            }
          >
            Criar contador
          </button>
        </div>
      </div>
    </div>
  )
}

function DialogoLembrete({
  carreiraSugerida,
  aoCriar,
  aoCancelar,
}: {
  carreiraSugerida: number
  aoCriar: (lembrete: Lembrete) => void
  aoCancelar: () => void
}) {
  const [carreira, setCarreira] = useState(String(carreiraSugerida))
  const [texto, setTexto] = useState('')

  return (
    <div className="fundo-escuro" onClick={aoCancelar}>
      <div
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-label="Novo lembrete"
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2>Novo lembrete</h2>
        <p className="suave">O aviso aparece sozinho quando você chegar nessa carreira.</p>

        <Campo rotulo="Em qual carreira?">
          <input
            type="number"
            inputMode="numeric"
            value={carreira}
            onChange={(evento) => setCarreira(evento.target.value)}
          />
        </Campo>

        <Campo rotulo="O que lembrar" ajuda="Ex.: Trocar para a linha azul">
          <input type="text" value={texto} onChange={(evento) => setTexto(evento.target.value)} />
        </Campo>

        <div className="linha-botoes">
          <button className="botao contorno" onClick={aoCancelar}>
            Cancelar
          </button>
          <button
            className="botao principal"
            disabled={!texto.trim() || !carreira}
            onClick={() =>
              aoCriar({
                id: novoId(),
                carreira: Number(carreira),
                texto: texto.trim(),
                visto: false,
              })
            }
          >
            Criar lembrete
          </button>
        </div>
      </div>
    </div>
  )
}
