import { useState } from 'react'
import type { Navegacao } from './App'
import { repositorio, useAgulhas, useAmostras, useLinhas } from '../dados/repositorio'
import { lerBlocagem } from '../nucleo/blocagem'
import type {
  Agulha,
  AmostraSalva,
  EspessuraLinha,
  Linha,
  TipoAgulha,
  TipoTrabalho,
} from '../nucleo/tipos'
import {
  Aviso,
  Cabecalho,
  Campo,
  Confirmacao,
  Escolha,
  Interruptor,
  Miniatura,
  SeletorFoto,
  Vazio,
} from './ui'
import { IconeAgulha, IconeAmostras, IconeGrande, IconeMais, IconeMateriais } from './icones'

const ESPESSURAS: EspessuraLinha[] = ['muito fina', 'fina', 'média', 'grossa', 'muito grossa']
const TIPOS_AGULHA: TipoAgulha[] = ['croche', 'trico reta', 'trico circular', 'trico de meia']
const NOME_AGULHA: Record<TipoAgulha, string> = {
  croche: 'Agulha de crochê',
  'trico reta': 'Agulha de tricô reta',
  'trico circular': 'Agulha de tricô circular',
  'trico de meia': 'Agulha de meia',
}

const milimetros = (numero: number) => `${String(numero).replace('.', ',')} mm`
const centimetros = (numero: number) => `${String(numero).replace('.', ',')} cm`

const NOME_TIPO: Record<TipoTrabalho, string> = { croche: 'Crochê', trico: 'Tricô' }

type Secao = 'linhas' | 'agulhas' | 'amostras'

/**
 * Em que seção ela estava.
 *
 * A tela se refaz do zero ao voltar do editor, e sem isto quem salvava uma
 * amostra caía de volta em Linhas — numa gaveta que não é a que estava aberta.
 * Fica fora do componente de propósito: guardar na rota faria cada toque na
 * tira virar um passo do botão "voltar" do celular.
 */
let secaoLembrada: Secao = 'linhas'

/** O nome curto da linha, para caber no cartão da amostra. */
const nomeDaLinha = (linha: Linha) => `${linha.marca} ${linha.nome}`.trim() || linha.cor

/**
 * Qual contagem vale para calcular a peça.
 *
 * Depois de blocar é a de depois que manda — usar a de antes faz a peça sair do
 * tamanho errado. Se ela marcou blocada mas ainda não mediu, devolve a de antes
 * e a tela avisa que falta medir; nunca inventar número é regra da casa.
 */
function contagemQueVale(amostra: AmostraSalva): { pontos: number; carreiras: number; blocada: boolean } {
  if (amostra.blocada && amostra.pontosBlocada && amostra.carreirasBlocada) {
    return { pontos: amostra.pontosBlocada, carreiras: amostra.carreirasBlocada, blocada: true }
  }
  return { pontos: amostra.pontos, carreiras: amostra.carreiras, blocada: false }
}

export function TelaMateriais({ navegacao }: { navegacao: Navegacao }) {
  const [aba, definirAba] = useState<Secao>(secaoLembrada)
  const setAba = (secao: Secao) => {
    secaoLembrada = secao
    definirAba(secao)
  }
  const linhas = useLinhas()
  const agulhas = useAgulhas()
  const amostras = useAmostras()

  const totalNovelos = linhas.reduce((soma, linha) => soma + linha.quantidade, 0)
  const totalMetros = linhas.reduce(
    (soma, linha) => soma + (linha.metragem ?? 0) * linha.quantidade,
    0,
  )

  return (
    <>
      <Cabecalho titulo="Meus materiais" />

      <div className="opcoes secoes" role="group" aria-label="O que mostrar" style={{ marginBottom: '1.2rem' }}>
        <button className="opcao" aria-pressed={aba === 'linhas'} onClick={() => setAba('linhas')}>
          Linhas<small>{linhas.length}</small>
        </button>
        <button className="opcao" aria-pressed={aba === 'agulhas'} onClick={() => setAba('agulhas')}>
          Agulhas<small>{agulhas.length}</small>
        </button>
        <button className="opcao" aria-pressed={aba === 'amostras'} onClick={() => setAba('amostras')}>
          Amostras<small>{amostras.length}</small>
        </button>
      </div>

      {aba === 'linhas' ? (
        <>
          <button className="botao principal largo gigante" onClick={() => navegacao.ir({ tela: 'linha' })}>
            <IconeMais /> Guardar uma linha
          </button>

          {linhas.length > 0 && (
            <div className="cartao" style={{ marginTop: '1rem' }}>
              <strong>
                {totalNovelos} {totalNovelos === 1 ? 'novelo' : 'novelos'} em casa
              </strong>
              {totalMetros > 0 && (
                <div className="suave">
                  Aproximadamente {Math.round(totalMetros).toLocaleString('pt-BR')} metros no total
                </div>
              )}
            </div>
          )}

          <div style={{ marginTop: '1rem' }}>
            {linhas.length === 0 ? (
              <Vazio
                desenho={<IconeGrande><IconeMateriais /></IconeGrande>}
                titulo="Nenhuma linha guardada"
                texto="Anote as linhas que você tem em casa: marca, cor, lote e quantos novelos sobraram. Assim dá para saber se o estoque dá para a próxima peça."
              />
            ) : (
              linhas.map((linha) => (
                <button
                  key={linha.id}
                  className="cartao clicavel"
                  onClick={() => navegacao.ir({ tela: 'linha', id: linha.id })}
                >
                  <div className="cartao-linha">
                    <Miniatura
                      fotoId={linha.fotoId}
                      alt={`Foto da linha ${linha.nome}`}
                      vazia={<IconeMateriais />}
                    />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="cartao-titulo">
                        {linha.marca} {linha.nome}
                      </div>
                      <div className="suave">
                        Cor {linha.cor}
                        {linha.lote ? ` · lote ${linha.lote}` : ''}
                        {linha.espessura ? ` · ${linha.espessura}` : ''}
                      </div>
                      <div style={{ marginTop: '0.3rem' }}>
                        <span className="selo">
                          {linha.quantidade} {linha.quantidade === 1 ? 'novelo' : 'novelos'}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      ) : aba === 'agulhas' ? (
        <>
          <button
            className="botao principal largo gigante"
            onClick={() => navegacao.ir({ tela: 'agulha' })}
          >
            <IconeMais /> Guardar uma agulha
          </button>

          <div style={{ marginTop: '1rem' }}>
            {agulhas.length === 0 ? (
              <Vazio
                desenho={<IconeGrande><IconeAgulha /></IconeGrande>}
                titulo="Nenhuma agulha guardada"
                texto="Anote as agulhas que você tem, com o número em milímetros. Ajuda na hora de comprar, para não repetir o que já existe na gaveta."
              />
            ) : (
              agulhas.map((agulha) => (
                <button
                  key={agulha.id}
                  className="cartao clicavel"
                  onClick={() => navegacao.ir({ tela: 'agulha', id: agulha.id })}
                >
                  <div className="cartao-titulo">
                    {NOME_AGULHA[agulha.tipo]} {milimetros(agulha.numero)}
                  </div>
                  <div className="suave">
                    {agulha.material ? `${agulha.material} · ` : ''}
                    {agulha.comprimento ? `${agulha.comprimento} cm · ` : ''}
                    {agulha.quantidade} {agulha.quantidade === 1 ? 'unidade' : 'unidades'}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <button
            className="botao principal largo gigante"
            onClick={() => navegacao.ir({ tela: 'amostra' })}
          >
            <IconeMais /> Guardar uma amostra
          </button>

          <div style={{ marginTop: '1rem' }}>
            {amostras.length === 0 ? (
              <Vazio
                desenho={<IconeGrande><IconeAmostras /></IconeGrande>}
                titulo="Nenhuma amostra guardada"
                texto="A amostra responde uma pergunta antes de começar a peça: com esta linha e esta agulha, quantos pontos cabem em 10 cm? Guarde aqui a conta de cada combinação que você já testou e não precisa fazer a mesma amostra duas vezes."
              />
            ) : (
              amostras.map((amostra) => {
                const vale = contagemQueVale(amostra)
                const linha = linhas.find((item) => item.id === amostra.linhaId)
                const agulha = agulhas.find((item) => item.id === amostra.agulhaId)
                const material = [
                  linha ? nomeDaLinha(linha) : amostra.linhaTexto,
                  agulha ? milimetros(agulha.numero) : amostra.agulhaTexto,
                ]
                  .filter(Boolean)
                  .join(' · ')

                return (
                  <button
                    key={amostra.id}
                    className="cartao clicavel"
                    onClick={() => navegacao.ir({ tela: 'amostra', id: amostra.id })}
                  >
                    <div className="cartao-linha">
                      <Miniatura
                        fotoId={amostra.fotoId}
                        alt={`Foto da amostra ${amostra.nome}`}
                        vazia={<IconeAmostras />}
                      />
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div className="cartao-titulo">{amostra.nome}</div>
                        <div className="suave">
                          {NOME_TIPO[amostra.tipo]}
                          {amostra.ponto ? ` · ${amostra.ponto}` : ''}
                        </div>

                        <div className="contagem-amostra">
                          <strong>{vale.pontos}</strong> pontos <span aria-hidden="true">×</span>{' '}
                          <strong>{vale.carreiras}</strong> carreiras
                          <span className="suave"> em 10 cm</span>
                        </div>

                        <div style={{ marginTop: '0.3rem' }}>
                          <span className={`selo ${amostra.blocada ? 'certo' : ''}`}>
                            {amostra.blocada
                              ? vale.blocada
                                ? 'Blocada'
                                : 'Blocada, falta medir'
                              : 'Não blocada'}
                          </span>
                        </div>

                        {amostra.larguraBlocada && amostra.alturaBlocada && (
                          <div className="suave" style={{ marginTop: '0.3rem' }}>
                            Depois de blocar mediu {centimetros(amostra.larguraBlocada)} por{' '}
                            {centimetros(amostra.alturaBlocada)}
                          </div>
                        )}

                        {material && (
                          <div className="suave" style={{ marginTop: '0.3rem' }}>
                            {material}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </>
      )}
    </>
  )
}

export function TelaLinhaEditor({ id, navegacao }: { id?: string; navegacao: Navegacao }) {
  const linhas = useLinhas()
  const salva = linhas.find((linha) => linha.id === id)
  const [rascunho, setRascunho] = useState<Partial<Linha> | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const linha: Partial<Linha> = rascunho ?? salva ?? { quantidade: 1 }
  const mudar = (mudancas: Partial<Linha>) => setRascunho({ ...linha, ...mudancas })

  const salvar = async () => {
    if (!(linha.nome ?? '').trim() && !(linha.marca ?? '').trim()) return
    await repositorio.linhas.salvar({
      ...linha,
      id,
      marca: (linha.marca ?? '').trim(),
      nome: (linha.nome ?? '').trim(),
      cor: (linha.cor ?? '').trim(),
      quantidade: linha.quantidade ?? 1,
    } as Linha)
    navegacao.voltar()
  }

  return (
    <>
      <Cabecalho titulo={id ? 'Editar linha' : 'Linha nova'} aoVoltar={navegacao.voltar} />

      <SeletorFoto rotulo="Foto da linha" fotoId={linha.fotoId} aoTrocar={(fotoId) => mudar({ fotoId })} />

      <Campo rotulo="Marca" ajuda="Ex.: Círculo, Pingouin">
        <input type="text" value={linha.marca ?? ''} onChange={(e) => mudar({ marca: e.target.value })} />
      </Campo>

      <Campo rotulo="Nome da linha" ajuda="Ex.: Amigurumi, Anne, Barroco">
        <input type="text" value={linha.nome ?? ''} onChange={(e) => mudar({ nome: e.target.value })} />
      </Campo>

      <Campo rotulo="Cor do fio" ajuda="O nome que você usa, e a cor de verdade ao lado">
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'stretch' }}>
          <input
            type="text"
            style={{ flex: 1 }}
            value={linha.cor ?? ''}
            onChange={(e) => mudar({ cor: e.target.value })}
          />
          <input
            type="color"
            aria-label="Escolher a cor do fio"
            value={linha.corHex ?? '#9c3b4a'}
            onChange={(e) => mudar({ corHex: e.target.value })}
            style={{ width: '4.5rem', minHeight: 'var(--alvo)', padding: '0.25rem', cursor: 'pointer' }}
          />
        </div>
      </Campo>

      <div className="campo-duplo">
        <Campo rotulo="Lote" ajuda="Vem na etiqueta">
          <input type="text" value={linha.lote ?? ''} onChange={(e) => mudar({ lote: e.target.value })} />
        </Campo>
      </div>

      <Campo rotulo="Quantos novelos você tem?">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={linha.quantidade ?? 1}
          onChange={(e) => mudar({ quantidade: Number(e.target.value) })}
        />
      </Campo>

      <Escolha
        rotulo="Espessura"
        valor={linha.espessura ?? 'média'}
        opcoes={ESPESSURAS.map((espessura) => ({ valor: espessura, texto: espessura }))}
        aoMudar={(espessura) => mudar({ espessura })}
      />

      <div className="campo-duplo">
        <Campo rotulo="Gramas por novelo">
          <input
            type="number"
            inputMode="numeric"
            value={linha.gramatura ?? ''}
            onChange={(e) => mudar({ gramatura: Number(e.target.value) })}
          />
        </Campo>
        <Campo rotulo="Metros por novelo">
          <input
            type="number"
            inputMode="numeric"
            value={linha.metragem ?? ''}
            onChange={(e) => mudar({ metragem: Number(e.target.value) })}
          />
        </Campo>
      </div>

      <Campo rotulo="Composição" ajuda="Ex.: 100% algodão">
        <input
          type="text"
          value={linha.composicao ?? ''}
          onChange={(e) => mudar({ composicao: e.target.value })}
        />
      </Campo>

      <Campo rotulo="Agulha indicada na etiqueta">
        <input
          type="text"
          value={linha.agulhaSugerida ?? ''}
          onChange={(e) => mudar({ agulhaSugerida: e.target.value })}
        />
      </Campo>

      <Campo rotulo="Anotações">
        <textarea
          style={{ minHeight: '6rem' }}
          value={linha.notas ?? ''}
          onChange={(e) => mudar({ notas: e.target.value })}
        />
      </Campo>

      <button className="botao principal largo gigante" onClick={() => void salvar()}>
        Salvar linha
      </button>

      {id && (
        <button
          className="botao perigo largo"
          style={{ marginTop: '0.7rem' }}
          onClick={() => setConfirmando(true)}
        >
          Apagar esta linha
        </button>
      )}

      {confirmando && (
        <Confirmacao
          titulo="Apagar a linha?"
          texto={`"${linha.marca} ${linha.nome}" sai do seu inventário.`}
          confirmar="Sim, apagar"
          perigo
          aoConfirmar={() => {
            if (id) void repositorio.linhas.apagar(id)
            setConfirmando(false)
            navegacao.voltar()
          }}
          aoCancelar={() => setConfirmando(false)}
        />
      )}
    </>
  )
}

export function TelaAgulhaEditor({ id, navegacao }: { id?: string; navegacao: Navegacao }) {
  const agulhas = useAgulhas()
  const salva = agulhas.find((agulha) => agulha.id === id)
  const [rascunho, setRascunho] = useState<Partial<Agulha> | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const agulha: Partial<Agulha> = rascunho ?? salva ?? { tipo: 'croche', quantidade: 1 }
  const mudar = (mudancas: Partial<Agulha>) => setRascunho({ ...agulha, ...mudancas })

  const salvar = async () => {
    if (!agulha.numero) return
    await repositorio.agulhas.salvar({
      ...agulha,
      id,
      tipo: agulha.tipo ?? 'croche',
      numero: agulha.numero,
      quantidade: agulha.quantidade ?? 1,
    } as Agulha)
    navegacao.voltar()
  }

  return (
    <>
      <Cabecalho titulo={id ? 'Editar agulha' : 'Agulha nova'} aoVoltar={navegacao.voltar} />

      <Escolha
        rotulo="Tipo de agulha"
        valor={agulha.tipo ?? 'croche'}
        opcoes={TIPOS_AGULHA.map((tipo) => ({ valor: tipo, texto: NOME_AGULHA[tipo] }))}
        aoMudar={(tipo) => mudar({ tipo })}
      />

      <Campo rotulo="Número em milímetros" ajuda="Vem gravado na agulha. Ex.: 3,5">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={agulha.numero ?? ''}
          onChange={(e) => mudar({ numero: Number(e.target.value.replace(',', '.')) })}
        />
      </Campo>

      <div className="campo-duplo">
        <Campo rotulo="Comprimento em cm">
          <input
            type="number"
            inputMode="numeric"
            value={agulha.comprimento ?? ''}
            onChange={(e) => mudar({ comprimento: Number(e.target.value) })}
          />
        </Campo>
        <Campo rotulo="Quantas você tem?">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            value={agulha.quantidade ?? 1}
            onChange={(e) => mudar({ quantidade: Number(e.target.value) })}
          />
        </Campo>
      </div>

      <Campo rotulo="Material" ajuda="Ex.: alumínio, bambu, plástico">
        <input
          type="text"
          value={agulha.material ?? ''}
          onChange={(e) => mudar({ material: e.target.value })}
        />
      </Campo>

      <Campo rotulo="Anotações">
        <textarea
          style={{ minHeight: '6rem' }}
          value={agulha.notas ?? ''}
          onChange={(e) => mudar({ notas: e.target.value })}
        />
      </Campo>

      <button
        className="botao principal largo gigante"
        disabled={!agulha.numero}
        onClick={() => void salvar()}
      >
        Salvar agulha
      </button>

      {id && (
        <button
          className="botao perigo largo"
          style={{ marginTop: '0.7rem' }}
          onClick={() => setConfirmando(true)}
        >
          Apagar esta agulha
        </button>
      )}

      {confirmando && (
        <Confirmacao
          titulo="Apagar a agulha?"
          texto={`${NOME_AGULHA[agulha.tipo ?? 'croche']} ${milimetros(agulha.numero ?? 0)} sai do seu inventário.`}
          confirmar="Sim, apagar"
          perigo
          aoConfirmar={() => {
            if (id) void repositorio.agulhas.apagar(id)
            setConfirmando(false)
            navegacao.voltar()
          }}
          aoCancelar={() => setConfirmando(false)}
        />
      )}
    </>
  )
}

/**
 * Editor de uma amostra.
 *
 * A ordem das perguntas segue a ordem do que ela faz na vida real: tricota o
 * quadradinho, mede, anota com que linha e agulha foi, e só depois decide se
 * bloca. Por isso a parte da blocagem só aparece depois que ela diz que blocou:
 * campo que não serve para nada agora é campo que atrapalha.
 */
export function TelaAmostraEditor({ id, navegacao }: { id?: string; navegacao: Navegacao }) {
  const amostras = useAmostras()
  const linhas = useLinhas()
  const agulhas = useAgulhas()
  const salva = amostras.find((amostra) => amostra.id === id)
  const [rascunho, setRascunho] = useState<Partial<AmostraSalva> | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  const amostra: Partial<AmostraSalva> = rascunho ?? salva ?? { tipo: 'croche', blocada: false }
  const mudar = (mudancas: Partial<AmostraSalva>) => setRascunho({ ...amostra, ...mudancas })

  /** Número digitado, ou vazio de verdade — nunca zero fingindo ser resposta. */
  const numero = (texto: string) => (texto.trim() === '' ? undefined : Number(texto))

  const leitura =
    amostra.blocada && amostra.pontos && amostra.carreiras && amostra.pontosBlocada && amostra.carreirasBlocada
      ? lerBlocagem(
          { pontos: amostra.pontos, carreiras: amostra.carreiras },
          { pontos: amostra.pontosBlocada, carreiras: amostra.carreirasBlocada },
        )
      : undefined

  const podeSalvar = Boolean((amostra.nome ?? '').trim()) && Boolean(amostra.pontos) && Boolean(amostra.carreiras)

  const salvar = async () => {
    if (!podeSalvar) return
    const blocada = amostra.blocada ?? false
    await repositorio.amostras.salvar({
      ...amostra,
      id,
      nome: (amostra.nome ?? '').trim(),
      tipo: amostra.tipo ?? 'croche',
      ponto: (amostra.ponto ?? '').trim() || undefined,
      pontos: amostra.pontos ?? 0,
      carreiras: amostra.carreiras ?? 0,
      blocada,
      // Desmarcar a blocagem apaga os números dela: guardar medida de blocagem
      // numa amostra marcada como não blocada é guardar contradição.
      pontosBlocada: blocada ? amostra.pontosBlocada : undefined,
      carreirasBlocada: blocada ? amostra.carreirasBlocada : undefined,
      larguraBlocada: blocada ? amostra.larguraBlocada : undefined,
      alturaBlocada: blocada ? amostra.alturaBlocada : undefined,
    } as AmostraSalva)
    navegacao.voltar()
  }

  return (
    <>
      <Cabecalho titulo={id ? 'Editar amostra' : 'Amostra nova'} aoVoltar={navegacao.voltar} />

      <SeletorFoto
        rotulo="Foto da amostra"
        ajuda="Ajuda a reconhecer o ponto depois"
        fotoId={amostra.fotoId}
        aoTrocar={(fotoId) => mudar({ fotoId })}
      />

      <Campo rotulo="Nome da amostra" ajuda="Ex.: Barroco com agulha 4">
        <input
          type="text"
          value={amostra.nome ?? ''}
          onChange={(e) => mudar({ nome: e.target.value })}
        />
      </Campo>

      <Escolha
        rotulo="É de crochê ou de tricô?"
        valor={amostra.tipo ?? 'croche'}
        opcoes={[
          { valor: 'croche' as TipoTrabalho, texto: 'Crochê' },
          { valor: 'trico' as TipoTrabalho, texto: 'Tricô' },
        ]}
        aoMudar={(tipo) => mudar({ tipo })}
      />

      <Campo rotulo="Ponto usado" ajuda="Ex.: ponto alto, meia, arroz">
        <input
          type="text"
          value={amostra.ponto ?? ''}
          onChange={(e) => mudar({ ponto: e.target.value })}
        />
      </Campo>

      <h2 style={{ margin: '1.5rem 0 0.5rem' }}>A contagem em 10 cm</h2>
      <p className="suave" style={{ marginBottom: '0.9rem' }}>
        Meça 10 cm no meio da amostra, longe das bordas, e conte quantos pontos e quantas carreiras
        cabem nessa medida. Essa é a conta que faz a peça sair do tamanho certo.
      </p>

      <div className="campo-duplo">
        <Campo rotulo="Pontos em 10 cm">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={amostra.pontos ?? ''}
            onChange={(e) => mudar({ pontos: numero(e.target.value) })}
          />
        </Campo>
        <Campo rotulo="Carreiras em 10 cm">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={amostra.carreiras ?? ''}
            onChange={(e) => mudar({ carreiras: numero(e.target.value) })}
          />
        </Campo>
      </div>

      <h2 style={{ margin: '1.5rem 0 0.5rem' }}>Com que material</h2>

      <EscolhaDoInventario
        rotulo="Linha usada"
        ajuda="Toque na linha que você usou nesta amostra"
        vazio="Você ainda não guardou nenhuma linha"
        opcoes={linhas.map((linha) => ({ id: linha.id, texto: `${nomeDaLinha(linha)} — ${linha.cor}` }))}
        escolhido={amostra.linhaId}
        texto={amostra.linhaTexto}
        rotuloTexto="Ou escreva a linha usada"
        aoEscolher={(linhaId) => mudar({ linhaId, linhaTexto: linhaId ? undefined : amostra.linhaTexto })}
        aoEscrever={(linhaTexto) => mudar({ linhaTexto, linhaId: linhaTexto ? undefined : amostra.linhaId })}
      />

      <EscolhaDoInventario
        rotulo="Agulha usada"
        ajuda="Toque na agulha que você usou nesta amostra"
        vazio="Você ainda não guardou nenhuma agulha"
        opcoes={agulhas.map((agulha) => ({
          id: agulha.id,
          texto: `${NOME_AGULHA[agulha.tipo]} ${milimetros(agulha.numero)}`,
        }))}
        escolhido={amostra.agulhaId}
        texto={amostra.agulhaTexto}
        rotuloTexto="Ou escreva a agulha usada"
        aoEscolher={(agulhaId) => mudar({ agulhaId, agulhaTexto: agulhaId ? undefined : amostra.agulhaTexto })}
        aoEscrever={(agulhaTexto) => mudar({ agulhaTexto, agulhaId: agulhaTexto ? undefined : amostra.agulhaId })}
      />

      <h2 style={{ margin: '1.5rem 0 0.5rem' }}>A blocagem</h2>

      <Interruptor
        rotulo="Esta amostra foi blocada?"
        descricao="Blocar é molhar a amostra e deixar secar esticada no tamanho. O tecido quase sempre muda de medida depois disso."
        ligado={amostra.blocada ?? false}
        aoMudar={(blocada) => mudar({ blocada })}
      />

      {amostra.blocada && (
        /*
          O grupo carrega o "depois de blocar" no nome acessível, e não em cada
          rótulo: repetir a expressão em quatro rótulos fazia cada um quebrar em
          três linhas dentro da coluna estreita. Quem usa leitor de tela ouve o
          nome do grupo ao entrar nele, então nada se perde.
        */
        <div className="cartao" role="group" aria-label="Depois de blocar" style={{ marginTop: '0.9rem' }}>
          <h3 style={{ marginBottom: '0.5rem' }}>Depois de blocar</h3>
          <p className="suave" style={{ marginTop: 0 }}>
            Depois de seca, meça a amostra blocada e anote de novo. É esta contagem que vale para
            calcular a peça.
          </p>

          <div className="campo-duplo">
            <Campo rotulo="Pontos em 10 cm">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={amostra.pontosBlocada ?? ''}
                onChange={(e) => mudar({ pontosBlocada: numero(e.target.value) })}
              />
            </Campo>
            <Campo rotulo="Carreiras em 10 cm">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={amostra.carreirasBlocada ?? ''}
                onChange={(e) => mudar({ carreirasBlocada: numero(e.target.value) })}
              />
            </Campo>
          </div>

          <div className="campo-duplo">
            <Campo rotulo="Largura" ajuda="Em centímetros">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={amostra.larguraBlocada ?? ''}
                onChange={(e) => mudar({ larguraBlocada: numero(e.target.value) })}
              />
            </Campo>
            <Campo rotulo="Altura" ajuda="Em centímetros">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.5"
                value={amostra.alturaBlocada ?? ''}
                onChange={(e) => mudar({ alturaBlocada: numero(e.target.value) })}
              />
            </Campo>
          </div>

          {leitura ? (
            <Aviso tipo={leitura.mudanca === 'igual' ? 'tudo-certo' : 'atencao'}>{leitura.resumo}</Aviso>
          ) : (
            <Aviso>
              Anote os dois números de depois de blocar e eu digo o que a blocagem mudou.
            </Aviso>
          )}
        </div>
      )}

      <Campo rotulo="Anotações">
        <textarea
          style={{ minHeight: '6rem' }}
          value={amostra.notas ?? ''}
          onChange={(e) => mudar({ notas: e.target.value })}
        />
      </Campo>

      <button
        className="botao principal largo gigante"
        disabled={!podeSalvar}
        onClick={() => void salvar()}
      >
        Salvar amostra
      </button>
      {!podeSalvar && (
        <p className="suave" style={{ marginTop: '0.5rem' }}>
          Falta o nome da amostra e a contagem de pontos e carreiras em 10 cm.
        </p>
      )}

      {id && (
        <button
          className="botao perigo largo"
          style={{ marginTop: '0.7rem' }}
          onClick={() => setConfirmando(true)}
        >
          Apagar esta amostra
        </button>
      )}

      {confirmando && (
        <Confirmacao
          titulo="Apagar a amostra?"
          texto={`"${amostra.nome}" sai da sua biblioteca de amostras. A contagem anotada nela some junto.`}
          confirmar="Sim, apagar"
          perigo
          aoConfirmar={() => {
            if (id) void repositorio.amostras.apagar(id)
            setConfirmando(false)
            navegacao.voltar()
          }}
          aoCancelar={() => setConfirmando(false)}
        />
      )}
    </>
  )
}

/**
 * Escolher um item do inventário, com saída para quem não guardou o material.
 *
 * Os dois caminhos se apagam entre si de propósito: se ela toca numa linha da
 * lista, o texto escrito some, e vice-versa. Deixar os dois preenchidos criaria
 * uma amostra que diz duas linhas diferentes ao mesmo tempo.
 */
function EscolhaDoInventario({
  rotulo,
  ajuda,
  vazio,
  opcoes,
  escolhido,
  texto,
  rotuloTexto,
  aoEscolher,
  aoEscrever,
}: {
  rotulo: string
  ajuda: string
  vazio: string
  opcoes: { id: string; texto: string }[]
  escolhido?: string
  texto?: string
  rotuloTexto: string
  aoEscolher: (id: string | undefined) => void
  aoEscrever: (texto: string | undefined) => void
}) {
  return (
    <div className="campo">
      <span>
        {rotulo}
        <br />
        <span className="ajuda">{opcoes.length > 0 ? ajuda : vazio}</span>
      </span>

      {opcoes.length > 0 && (
        <div className="opcoes" style={{ flexDirection: 'column' }}>
          {opcoes.map((opcao) => (
            <button
              key={opcao.id}
              type="button"
              className="opcao"
              style={{ width: '100%', justifyContent: 'flex-start' }}
              aria-pressed={escolhido === opcao.id}
              // Tocar de novo na mesma desmarca: dá para desfazer sem apagar tudo.
              onClick={() => aoEscolher(escolhido === opcao.id ? undefined : opcao.id)}
            >
              {opcao.texto}
            </button>
          ))}
        </div>
      )}

      <label className="campo" style={{ marginTop: opcoes.length > 0 ? '0.7rem' : 0 }}>
        <span className="ajuda">{rotuloTexto}</span>
        <input
          type="text"
          value={texto ?? ''}
          onChange={(e) => aoEscrever(e.target.value.trim() === '' ? undefined : e.target.value)}
        />
      </label>
    </div>
  )
}
