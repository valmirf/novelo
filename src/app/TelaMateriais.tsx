import { useState } from 'react'
import type { Navegacao } from './App'
import { repositorio, useAgulhas, useLinhas } from '../dados/repositorio'
import type { Agulha, EspessuraLinha, Linha, TipoAgulha } from '../nucleo/tipos'
import { Cabecalho, Campo, Confirmacao, Escolha, Miniatura, SeletorFoto, Vazio } from './ui'
import { IconeAgulha, IconeGrande, IconeMais, IconeMateriais } from './icones'

const ESPESSURAS: EspessuraLinha[] = ['muito fina', 'fina', 'média', 'grossa', 'muito grossa']
const TIPOS_AGULHA: TipoAgulha[] = ['croche', 'trico reta', 'trico circular', 'trico de meia']
const NOME_AGULHA: Record<TipoAgulha, string> = {
  croche: 'Agulha de crochê',
  'trico reta': 'Agulha de tricô reta',
  'trico circular': 'Agulha de tricô circular',
  'trico de meia': 'Agulha de meia',
}

const milimetros = (numero: number) => `${String(numero).replace('.', ',')} mm`

export function TelaMateriais({ navegacao }: { navegacao: Navegacao }) {
  const [aba, setAba] = useState<'linhas' | 'agulhas'>('linhas')
  const linhas = useLinhas()
  const agulhas = useAgulhas()

  const totalNovelos = linhas.reduce((soma, linha) => soma + linha.quantidade, 0)
  const totalMetros = linhas.reduce(
    (soma, linha) => soma + (linha.metragem ?? 0) * linha.quantidade,
    0,
  )

  return (
    <>
      <Cabecalho titulo="Meus materiais" />

      <div className="opcoes" style={{ marginBottom: '1.2rem' }}>
        <button className="opcao" aria-pressed={aba === 'linhas'} onClick={() => setAba('linhas')}>
          Linhas ({linhas.length})
        </button>
        <button className="opcao" aria-pressed={aba === 'agulhas'} onClick={() => setAba('agulhas')}>
          Agulhas ({agulhas.length})
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
                    <Miniatura fotoId={linha.fotoId} alt={`Foto da linha ${linha.nome}`} />
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
      ) : (
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
