import { useRef, useState } from 'react'
import { repositorio, useAgulhas, useLinhas, useAjustes, useProjetos, useReceitas } from '../dados/repositorio'
import {
  backupComoTexto,
  baixarBackup,
  copiarBackup,
  gerarBackup,
  importarBackup,
  type ResultadoImportacao,
} from '../dados/backup'
import { converterAmostra } from '../nucleo/amostra'
import { VERSAO } from '../nucleo/diagnostico'
import { VOZ_DISPONIVEL } from './ganchos'
import { Aviso, Cabecalho, Campo, Escolha, Interruptor, Marca } from './ui'

export function TelaAjustes() {
  const ajustes = useAjustes()
  const receitas = useReceitas()
  const projetos = useProjetos()
  const linhas = useLinhas()
  const agulhas = useAgulhas()

  const entradaArquivo = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState(false)
  const [resultado, setResultado] = useState<ResultadoImportacao>()
  const [erro, setErro] = useState<string>()
  const [recado, setRecado] = useState<string>()
  const [textoDaCopia, setTextoDaCopia] = useState<string>()
  const [textoColado, setTextoColado] = useState('')
  const [buscandoVersao, setBuscandoVersao] = useState(false)

  /**
   * Joga fora a cópia guardada no aparelho e baixa tudo de novo.
   *
   * Existe porque a cópia offline pode ficar presa numa versão antiga, e a
   * saída conhecida — "recarregar forçado" — não é algo que se possa pedir a
   * quem não mexe com navegador. As receitas ficam no banco do aparelho, que
   * não é tocado aqui; só os arquivos do app são baixados de novo.
   */
  const buscarVersaoNova = async () => {
    setBuscandoVersao(true)
    try {
      if ('serviceWorker' in navigator) {
        const registros = await navigator.serviceWorker.getRegistrations()
        await Promise.all(registros.map((registro) => registro.unregister()))
      }
      if ('caches' in window) {
        const nomes = await caches.keys()
        await Promise.all(nomes.map((nome) => caches.delete(nome)))
      }
    } catch {
      // Se algo aqui falhar, recarregar mesmo assim já costuma resolver.
    } finally {
      location.reload()
    }
  }

  const limpar = () => {
    setErro(undefined)
    setRecado(undefined)
    setResultado(undefined)
  }

  const exportar = async () => {
    setOcupado(true)
    limpar()
    try {
      baixarBackup(await gerarBackup())
      setRecado('Cópia baixada. Se não apareceu nenhum arquivo, use o botão de copiar abaixo.')
    } catch {
      setErro('Não consegui gerar a cópia. Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  const copiar = async () => {
    setOcupado(true)
    limpar()
    try {
      const dados = await gerarBackup()
      if ((await copiarBackup(dados)) === 'copiado') {
        setRecado('Cópia copiada. Agora cole num e-mail para você mesma e envie.')
        setTextoDaCopia(undefined)
      } else {
        setTextoDaCopia(backupComoTexto(dados))
        setRecado('Selecione todo o texto abaixo, copie e cole num e-mail para você mesma.')
      }
    } catch {
      setErro('Não consegui gerar a cópia. Tente de novo.')
    } finally {
      setOcupado(false)
    }
  }

  const restaurar = async (texto: string, aoTerminar?: () => void) => {
    setOcupado(true)
    limpar()
    try {
      setResultado(await importarBackup(texto))
      setTextoColado('')
    } catch (problema) {
      setErro(problema instanceof Error ? problema.message : 'Não consegui ler essa cópia.')
    } finally {
      setOcupado(false)
      aoTerminar?.()
    }
  }

  const importarArquivo = async (arquivo: File | undefined) => {
    if (!arquivo) return
    await restaurar(await arquivo.text(), () => {
      if (entradaArquivo.current) entradaArquivo.current.value = ''
    })
  }

  return (
    <>
      <Cabecalho titulo="Ajustes" />

      <h2 style={{ marginBottom: '0.8rem' }}>Como você enxerga</h2>

      <Escolha
        rotulo="Tamanho da letra"
        ajuda="Vale para o aplicativo inteiro"
        valor={ajustes.tamanhoLetra}
        opcoes={[
          { valor: 1, texto: 'Normal' },
          { valor: 1.15, texto: 'Grande' },
          { valor: 1.35, texto: 'Maior' },
        ]}
        aoMudar={(tamanhoLetra) => void repositorio.ajustes.salvar({ tamanhoLetra })}
      />

      <h2 style={{ margin: '1.5rem 0 0.8rem' }}>Enquanto você trabalha</h2>

      <Interruptor
        rotulo="Manter a tela acesa"
        descricao="A tela não apaga sozinha enquanto o trabalho está aberto"
        ligado={ajustes.telaSempreAcesa}
        aoMudar={(telaSempreAcesa) => void repositorio.ajustes.salvar({ telaSempreAcesa })}
      />

      <Interruptor
        rotulo="Apitar ao contar"
        descricao="Um bipe curto a cada carreira, para não precisar olhar a tela"
        ligado={ajustes.somAoContar}
        aoMudar={(somAoContar) => void repositorio.ajustes.salvar({ somAoContar })}
      />

      {VOZ_DISPONIVEL && (
        <>
          <Interruptor
            rotulo="Contar falando"
            descricao="Diga “próxima” para avançar e “voltar” para corrigir, sem largar a agulha"
            ligado={ajustes.comandoPorVoz}
            aoMudar={(comandoPorVoz) => void repositorio.ajustes.salvar({ comandoPorVoz })}
          />
          {ajustes.comandoPorVoz && (
            <Aviso>
              O celular vai pedir permissão para usar o microfone na primeira vez. A sua voz é
              reconhecida pelo próprio navegador e nada é guardado.
            </Aviso>
          )}
        </>
      )}

      <CalculadoraAmostra />

      <h2 style={{ margin: '1.5rem 0 0.8rem' }}>Cópia de segurança</h2>

      <div className="cartao">
        <p>
          Tudo fica guardado dentro deste aparelho. Faça uma cópia de vez em quando e mande para o
          seu e-mail: se o celular quebrar ou trocar, é assim que você recupera as receitas.
        </p>
        <p className="suave">
          Você tem {receitas.length} {receitas.length === 1 ? 'receita' : 'receitas'}, {projetos.length}{' '}
          {projetos.length === 1 ? 'trabalho' : 'trabalhos'}, {linhas.length}{' '}
          {linhas.length === 1 ? 'linha' : 'linhas'} e {agulhas.length}{' '}
          {agulhas.length === 1 ? 'agulha' : 'agulhas'}.
        </p>

        <button
          className="botao principal largo"
          disabled={ocupado}
          onClick={() => void exportar()}
        >
          {ocupado ? 'Preparando…' : 'Baixar a cópia'}
        </button>

        <button
          className="botao contorno largo"
          style={{ marginTop: '0.7rem' }}
          disabled={ocupado}
          onClick={() => void copiar()}
        >
          Copiar a cópia para colar num e-mail
        </button>

        {textoDaCopia && (
          <textarea
            readOnly
            value={textoDaCopia}
            onFocus={(evento) => evento.currentTarget.select()}
            style={{
              width: '100%',
              minHeight: '8rem',
              marginTop: '0.7rem',
              padding: '0.6rem',
              border: '2px solid var(--borda)',
              borderRadius: '0.7rem',
              background: 'var(--superficie)',
              color: 'var(--texto)',
              fontFamily: 'inherit',
              fontSize: '0.8rem',
            }}
          />
        )}

        <input
          ref={entradaArquivo}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(evento) => void importarArquivo(evento.target.files?.[0])}
        />
        <button
          className="botao contorno largo"
          style={{ marginTop: '0.7rem' }}
          disabled={ocupado}
          onClick={() => entradaArquivo.current?.click()}
        >
          Restaurar de um arquivo
        </button>

        <div style={{ marginTop: '1.2rem' }}>
          <Campo
            rotulo="Ou cole aqui o texto de uma cópia"
            ajuda="Se você guardou a cópia num e-mail, copie o texto de lá e cole aqui"
          >
            <textarea
              style={{ minHeight: '6rem', fontSize: '0.8rem' }}
              value={textoColado}
              onChange={(evento) => setTextoColado(evento.target.value)}
            />
          </Campo>
          <button
            className="botao contorno largo"
            disabled={ocupado || !textoColado.trim()}
            onClick={() => void restaurar(textoColado)}
          >
            Restaurar do texto colado
          </button>
        </div>

        {recado && <div style={{ marginTop: '0.8rem' }}><Aviso>{recado}</Aviso></div>}
        {erro && <div style={{ marginTop: '0.8rem' }}><Aviso tipo="problema">{erro}</Aviso></div>}

        {resultado && (
          <div style={{ marginTop: '0.8rem' }}>
            <Aviso tipo="tudo-certo">
              Cópia restaurada: {resultado.receitas} receitas, {resultado.projetos} trabalhos,{' '}
              {resultado.linhas} linhas, {resultado.agulhas} agulhas, {resultado.amostras} amostras e{' '}
              {resultado.fotos} fotos.
            </Aviso>
          </div>
        )}
      </div>

      <div className="cartao">
        <h2>
          Sobre o <Marca pequena />
        </h2>
        <p className="suave">
          Feito para guardar receitas de tricô e crochê, contar carreiras e pontos, marcar o tempo de
          cada peça e organizar as linhas e agulhas de casa. Funciona sem internet.
        </p>

        <p className="suave" style={{ marginTop: '0.8rem' }}>
          Versão instalada: <strong>{VERSAO}</strong>
        </p>

        <button
          className="botao contorno largo"
          disabled={buscandoVersao}
          onClick={() => void buscarVersaoNova()}
        >
          {buscandoVersao ? 'Buscando…' : 'Buscar versão nova'}
        </button>
        <p className="suave" style={{ marginTop: '0.5rem', marginBottom: 0 }}>
          Use se alguém avisou que corrigiu alguma coisa e você ainda vê o problema. O app baixa tudo
          de novo — suas receitas e trabalhos não são apagados.
        </p>
      </div>
    </>
  )
}

/**
 * A amostra é o que decide se a peça sai do tamanho certo. Aqui a pessoa informa
 * a amostra da receita e a que ela conseguiu, e o app diz quantos pontos montar.
 */
function CalculadoraAmostra() {
  const [daReceita, setDaReceita] = useState('')
  const [minha, setMinha] = useState('')
  const [pontosDaReceita, setPontosDaReceita] = useState('')

  const montarDaReceita = Number(pontosDaReceita)
  const conta = converterAmostra(Number(daReceita), Number(minha), montarDaReceita)

  return (
    <>
      <h2 style={{ margin: '1.5rem 0 0.8rem' }}>Conferir a amostra</h2>
      <div className="cartao">
        <p className="suave">
          Tricote ou faça um quadrado, meça 10 cm e conte os pontos. Se a sua amostra não bate com a
          da receita, a peça sai maior ou menor — esta conta corrige isso.
        </p>

        <Campo rotulo="Pontos em 10 cm que a receita pede">
          <input
            type="number"
            inputMode="numeric"
            value={daReceita}
            onChange={(evento) => setDaReceita(evento.target.value)}
          />
        </Campo>

        <Campo rotulo="Pontos em 10 cm que deu na sua amostra">
          <input
            type="number"
            inputMode="numeric"
            value={minha}
            onChange={(evento) => setMinha(evento.target.value)}
          />
        </Campo>

        <Campo rotulo="Quantos pontos a receita manda montar">
          <input
            type="number"
            inputMode="numeric"
            value={pontosDaReceita}
            onChange={(evento) => setPontosDaReceita(evento.target.value)}
          />
        </Campo>

        {conta && (
          <Aviso tipo={Math.abs(conta.diferenca) <= 1 ? 'tudo-certo' : 'atencao'}>
            {Math.abs(conta.diferenca) <= 1 ? (
              <>
                Pode montar os {montarDaReceita} pontos da receita: a sua amostra está muito
                próxima da que ela pede.
              </>
            ) : (
              <>
                Monte <strong>{conta.pontosParaMontar} pontos</strong> em vez de {montarDaReceita}.
                {conta.aperto === 'mais frouxo'
                  ? ` O seu ponto está mais frouxo que o da receita, então são ${Math.abs(conta.diferenca)} pontos a menos para dar a mesma largura.`
                  : ` O seu ponto está mais apertado que o da receita, então são ${conta.diferenca} pontos a mais para dar a mesma largura.`}
              </>
            )}
          </Aviso>
        )}
      </div>
    </>
  )
}
