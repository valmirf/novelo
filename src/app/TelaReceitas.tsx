import { useMemo, useRef, useState } from 'react'
import type { Navegacao } from './App'
import { repositorio, useReceita, useReceitas } from '../dados/repositorio'
import { interpretar } from '../nucleo/interpretador'
import { lerPdf } from '../nucleo/pdf'
import { PdfEscaneado } from './PdfEscaneado'
import type { Receita, TipoTrabalho } from '../nucleo/tipos'
import { Aviso, Cabecalho, Campo, Confirmacao, Escolha, Miniatura, SeletorFoto, Vazio } from './ui'

const EXEMPLO = `Carr 1: 6 pb no anel mágico = 6
Carr 2: 1 aum em cada ponto = 12
Carr 3: (1 pb, 1 aum) x6 = 18
Carr 4-6: 1 pb em cada ponto = 18`

export function TelaReceitas({ navegacao }: { navegacao: Navegacao }) {
  const receitas = useReceitas()
  const [busca, setBusca] = useState('')

  const filtradas = receitas.filter((receita) =>
    `${receita.titulo} ${receita.autoria ?? ''}`.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <>
      <Cabecalho titulo="Receitas" />

      <button className="botao principal largo gigante" onClick={() => navegacao.ir({ tela: 'receita' })}>
        <span aria-hidden="true">＋</span> Guardar uma receita nova
      </button>
      <p className="suave" style={{ marginTop: '0.5rem' }}>
        Você pode trazer de um arquivo PDF ou escrever à mão.
      </p>

      {receitas.length > 3 && (
        <div style={{ marginTop: '1rem' }}>
          <Campo rotulo="Procurar">
            <input
              type="search"
              value={busca}
              placeholder="Nome da receita"
              onChange={(evento) => setBusca(evento.target.value)}
            />
          </Campo>
        </div>
      )}

      <div style={{ marginTop: '1.2rem' }}>
        {receitas.length === 0 ? (
          <Vazio
            desenho="📖"
            titulo="Nenhuma receita ainda"
            texto="Guarde aqui as receitas que você usa. Pode trazer de um arquivo PDF, copiar de um site ou digitar do caderno."
          />
        ) : filtradas.length === 0 ? (
          <Vazio desenho="🔎" titulo="Nada encontrado" texto="Nenhuma receita com esse nome." />
        ) : (
          filtradas.map((receita) => (
            <button
              key={receita.id}
              className="cartao clicavel"
              onClick={() => navegacao.ir({ tela: 'receita', id: receita.id })}
            >
              <div className="cartao-linha">
                <Miniatura fotoId={receita.fotoId} alt={`Foto de ${receita.titulo}`} />
                <div style={{ minWidth: 0 }}>
                  <div className="cartao-titulo">{receita.titulo}</div>
                  <div className="suave">
                    {receita.tipo === 'croche' ? 'Crochê' : 'Tricô'}
                    {receita.autoria ? ` · ${receita.autoria}` : ''}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </>
  )
}

export function TelaReceitaEditor({ id, navegacao }: { id?: string; navegacao: Navegacao }) {
  const salva = useReceita(id)
  const [rascunho, setRascunho] = useState<Partial<Receita> | null>(null)
  const [confirmandoApagar, setConfirmandoApagar] = useState(false)

  const entradaPdf = useRef<HTMLInputElement>(null)
  const [lendoPdf, setLendoPdf] = useState(false)
  const [avisoPdf, setAvisoPdf] = useState<{ tipo: 'atencao' | 'tudo-certo'; texto: string }>()
  const [pdfParaSubstituir, setPdfParaSubstituir] = useState<string>()
  const [pdfEscaneado, setPdfEscaneado] = useState<{ arquivo: File; paginas: number }>()

  // Enquanto a pessoa não mexeu em nada, mostramos o que está no banco.
  const receita: Partial<Receita> = rascunho ?? salva ?? { tipo: 'croche', texto: '' }
  const mexeu = rascunho !== null

  const mudar = (mudancas: Partial<Receita>) => setRascunho({ ...receita, ...mudancas })

  const leitura = useMemo(() => interpretar(receita.texto ?? ''), [receita.texto])
  const comProblema = leitura.carreiras.filter((c) => c.divergencia)

  // Carreiras de verdade, não entradas de texto: "Carr 5-10" é uma linha escrita
  // mas seis carreiras para tricotar, e é esse número que faz sentido para ela.
  const quantasCarreiras = leitura.carreiras.reduce((soma, c) => soma + c.numeros.length, 0)

  const escolherPdf = async (arquivo: File | undefined) => {
    if (entradaPdf.current) entradaPdf.current.value = ''
    if (!arquivo) return

    setLendoPdf(true)
    setAvisoPdf(undefined)
    try {
      const lido = await lerPdf(arquivo)

      if (lido.pareceDigitalizado) {
        setPdfEscaneado({ arquivo, paginas: lido.paginas })
        setAvisoPdf({
          tipo: 'atencao',
          texto:
            'Esse PDF é uma imagem escaneada, então não tem texto para eu copiar. ' +
            'Mas o seu celular sabe ler texto de imagem — siga o passo a passo abaixo.',
        })
        return
      }

      setPdfEscaneado(undefined)

      const jaTemTexto = (receita.texto ?? '').trim().length > 0
      if (jaTemTexto) {
        setPdfParaSubstituir(lido.texto)
        return
      }

      mudar({ texto: lido.texto })
      setAvisoPdf({
        tipo: 'tudo-certo',
        texto:
          lido.paginas === 1
            ? 'Li o PDF. Confira o texto abaixo antes de salvar.'
            : `Li as ${lido.paginas} páginas do PDF. Confira o texto abaixo antes de salvar.`,
      })
    } catch {
      setAvisoPdf({
        tipo: 'atencao',
        texto: 'Não consegui abrir esse arquivo. Confira se é mesmo um PDF.',
      })
    } finally {
      setLendoPdf(false)
    }
  }

  const salvar = async () => {
    const titulo = (receita.titulo ?? '').trim()
    if (!titulo) return
    await repositorio.receitas.salvar({
      ...receita,
      id,
      titulo,
      tipo: receita.tipo ?? 'croche',
      texto: receita.texto ?? '',
    } as Receita)
    navegacao.voltar()
  }

  const apagar = async () => {
    if (id) await repositorio.receitas.apagar(id)
    setConfirmandoApagar(false)
    navegacao.voltar()
  }

  return (
    <>
      <Cabecalho titulo={id ? 'Editar receita' : 'Receita nova'} aoVoltar={navegacao.voltar} />

      {/*
        A entrada por PDF vem antes de tudo de propósito: é assim que a maior
        parte das receitas chega, e escondida lá embaixo ninguém achava.
      */}
      <input
        ref={entradaPdf}
        type="file"
        accept="application/pdf,.pdf"
        hidden
        onChange={(evento) => void escolherPdf(evento.target.files?.[0])}
      />
      <button
        type="button"
        className="botao principal largo gigante"
        disabled={lendoPdf}
        onClick={() => entradaPdf.current?.click()}
      >
        {lendoPdf ? 'Lendo o PDF…' : '📄 Tenho a receita em PDF'}
      </button>
      <p className="suave" style={{ marginTop: '0.5rem', marginBottom: '1.4rem' }}>
        Escolha o arquivo e eu trago a receita escrita para você. Ou preencha à mão abaixo.
      </p>

      {avisoPdf && <Aviso tipo={avisoPdf.tipo}>{avisoPdf.texto}</Aviso>}

      {pdfEscaneado && (
        <PdfEscaneado
          arquivo={pdfEscaneado.arquivo}
          paginas={pdfEscaneado.paginas}
          aoFechar={() => setPdfEscaneado(undefined)}
        />
      )}

      <Campo rotulo="Nome da peça" ajuda="Por exemplo: Touca da Ana, Manta cinza">
        <input
          type="text"
          value={receita.titulo ?? ''}
          onChange={(evento) => mudar({ titulo: evento.target.value })}
        />
      </Campo>

      <Escolha
        rotulo="É tricô ou crochê?"
        valor={receita.tipo ?? 'croche'}
        opcoes={[
          { valor: 'croche' as TipoTrabalho, texto: 'Crochê' },
          { valor: 'trico' as TipoTrabalho, texto: 'Tricô' },
        ]}
        aoMudar={(tipo) => mudar({ tipo })}
      />

      <SeletorFoto
        rotulo="Foto da peça pronta"
        fotoId={receita.fotoId}
        aoTrocar={(fotoId) => mudar({ fotoId })}
      />

      <Campo rotulo="A receita" ajuda="Uma carreira por linha, começando por “Carreira 1:”">
        <textarea
          value={receita.texto ?? ''}
          placeholder={EXEMPLO}
          onChange={(evento) => mudar({ texto: evento.target.value })}
        />
      </Campo>

      {(receita.texto ?? '').trim().length > 0 && (
        <div className="cartao">
          <h2>Conferência</h2>
          <p className="suave">O app leu a receita e conferiu as contas para você.</p>

          {leitura.avisos.map((aviso, indice) => (
            <Aviso key={indice}>{aviso}</Aviso>
          ))}

          {leitura.carreiras.length > 0 && comProblema.length === 0 && (
            <Aviso tipo="tudo-certo">
              {quantasCarreiras === 1
                ? 'Entendi 1 carreira e as contas batem.'
                : `Entendi ${quantasCarreiras} carreiras e as contas batem.`}
            </Aviso>
          )}

          {comProblema.map((carreira) => (
            <Aviso key={carreira.indice} tipo="problema">
              <strong>{carreira.rotulo}:</strong> {carreira.divergencia}
            </Aviso>
          ))}

          {leitura.carreiras.slice(0, 3).map((carreira) => (
            <div key={carreira.indice} className="passo" style={{ marginBottom: '0.4rem' }}>
              <strong>{carreira.rotulo}:</strong> {carreira.resumo}
              <div className="suave">Termina com {carreira.produz} pontos</div>
            </div>
          ))}
          {leitura.carreiras.length > 3 && (
            <p className="suave">e mais {leitura.carreiras.length - 3} carreiras…</p>
          )}
        </div>
      )}

      <details className="cartao">
        <summary style={{ fontWeight: 700, minHeight: '2.5rem', cursor: 'pointer' }}>
          Linha, agulha e amostra
        </summary>
        <div style={{ marginTop: '1rem' }}>
          <Campo rotulo="Linha indicada">
            <input
              type="text"
              value={receita.linhaSugerida ?? ''}
              onChange={(evento) => mudar({ linhaSugerida: evento.target.value })}
            />
          </Campo>
          <Campo rotulo="Agulha indicada">
            <input
              type="text"
              value={receita.agulhaSugerida ?? ''}
              placeholder="Ex.: 3,5 mm"
              onChange={(evento) => mudar({ agulhaSugerida: evento.target.value })}
            />
          </Campo>
          <div className="campo-duplo">
            <Campo rotulo="Pontos em 10 cm">
              <input
                type="number"
                inputMode="numeric"
                value={receita.amostra?.pontos ?? ''}
                onChange={(evento) =>
                  mudar({
                    amostra: {
                      pontos: Number(evento.target.value),
                      carreiras: receita.amostra?.carreiras ?? 0,
                    },
                  })
                }
              />
            </Campo>
            <Campo rotulo="Carreiras em 10 cm">
              <input
                type="number"
                inputMode="numeric"
                value={receita.amostra?.carreiras ?? ''}
                onChange={(evento) =>
                  mudar({
                    amostra: {
                      pontos: receita.amostra?.pontos ?? 0,
                      carreiras: Number(evento.target.value),
                    },
                  })
                }
              />
            </Campo>
          </div>
          <Campo rotulo="De quem é a receita">
            <input
              type="text"
              value={receita.autoria ?? ''}
              onChange={(evento) => mudar({ autoria: evento.target.value })}
            />
          </Campo>
          <Campo rotulo="Anotações">
            <textarea
              style={{ minHeight: '6rem' }}
              value={receita.notas ?? ''}
              onChange={(evento) => mudar({ notas: evento.target.value })}
            />
          </Campo>
        </div>
      </details>

      <button
        className="botao principal largo gigante"
        disabled={!(receita.titulo ?? '').trim()}
        onClick={() => void salvar()}
      >
        {mexeu || !id ? 'Salvar receita' : 'Pronto'}
      </button>

      {id && (
        <>
          <button
            className="botao contorno largo"
            style={{ marginTop: '0.7rem' }}
            onClick={() => navegacao.ir({ tela: 'projeto', receitaId: id })}
          >
            Começar um trabalho com esta receita
          </button>
          <button
            className="botao perigo largo"
            style={{ marginTop: '0.7rem' }}
            onClick={() => setConfirmandoApagar(true)}
          >
            Apagar esta receita
          </button>
        </>
      )}

      {pdfParaSubstituir !== undefined && (
        <Confirmacao
          titulo="Substituir o que está escrito?"
          texto="Já existe uma receita escrita aqui. O texto do PDF vai tomar o lugar dela."
          confirmar="Sim, usar o PDF"
          aoConfirmar={() => {
            mudar({ texto: pdfParaSubstituir })
            setPdfParaSubstituir(undefined)
            setAvisoPdf({
              tipo: 'tudo-certo',
              texto: 'Li o PDF. Confira o texto abaixo antes de salvar.',
            })
          }}
          aoCancelar={() => setPdfParaSubstituir(undefined)}
        />
      )}

      {confirmandoApagar && (
        <Confirmacao
          titulo="Apagar a receita?"
          texto={`A receita "${receita.titulo}" vai sair da lista. Os trabalhos que usam ela continuam guardados.`}
          confirmar="Sim, apagar"
          perigo
          aoConfirmar={() => void apagar()}
          aoCancelar={() => setConfirmandoApagar(false)}
        />
      )}
    </>
  )
}
