import { useEffect, useState } from 'react'
import { desenharPagina } from '../nucleo/pdf'
import { Aviso } from './ui'
import { IconeAvancar, IconeVoltar } from './icones'

/**
 * Receita que chegou como imagem: print do Instagram, foto da revista, ou PDF
 * escaneado — nos três casos não há texto para extrair.
 *
 * Em vez de embutir um reconhecedor de imagem, a receita é mostrada e quem lê é
 * o próprio celular: iPhone e Android já trazem reconhecimento de texto, de
 * graça, melhor do que caberia aqui dentro.
 */
export function ReceitaEmImagem({
  arquivo,
  paginas,
  aoFechar,
}: {
  arquivo: File
  /** Só para PDF. Imagem solta não tem páginas. */
  paginas?: number
  aoFechar: () => void
}) {
  const [pagina, setPagina] = useState(1)
  const [url, setUrl] = useState<string>()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string>()

  const ehPdf = paginas !== undefined

  useEffect(() => {
    let cancelado = false
    let criada: string | undefined

    setCarregando(true)
    setErro(undefined)

    const preparar = ehPdf
      ? desenharPagina(arquivo, pagina)
      : Promise.resolve(arquivo as Blob)

    preparar
      .then((imagem) => {
        if (cancelado) return
        criada = URL.createObjectURL(imagem)
        setUrl(criada)
      })
      .catch(() => {
        if (!cancelado) setErro('Não consegui mostrar essa receita.')
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
      if (criada) URL.revokeObjectURL(criada)
    }
  }, [arquivo, pagina, ehPdf])

  return (
    <div className="cartao">
      <h2>Copiar o texto pelo celular</h2>
      <p className="suave">{instrucoes()}</p>

      {erro && <Aviso tipo="problema">{erro}</Aviso>}

      {carregando ? (
        <p>Preparando a receita…</p>
      ) : (
        url && (
          <img
            src={url}
            alt={ehPdf ? `Página ${pagina} da receita` : 'Receita'}
            style={{
              width: '100%',
              border: '2px solid var(--latao-fosco)',
              borderRadius: '0.7rem',
              background: '#ffffff',
            }}
          />
        )
      )}

      {ehPdf && paginas > 1 && (
        <div className="linha-botoes" style={{ marginTop: '0.8rem' }}>
          <button
            className="botao contorno"
            disabled={pagina === 1}
            onClick={() => setPagina((atual) => atual - 1)}
          >
            <IconeVoltar /> Página anterior
          </button>
          <button
            className="botao contorno"
            disabled={pagina === paginas}
            onClick={() => setPagina((atual) => atual + 1)}
          >
            Próxima página <IconeAvancar />
          </button>
        </div>
      )}

      <p className="suave" style={{ marginTop: '0.8rem' }}>
        {ehPdf && paginas > 1 ? `Página ${pagina} de ${paginas}. ` : ''}
        Depois de colar, confira o texto — reconhecimento de imagem às vezes troca número.
      </p>

      <button className="botao contorno largo" onClick={aoFechar}>
        Fechar a imagem
      </button>
    </div>
  )
}

function instrucoes(): string {
  const agente = navigator.userAgent

  if (/iPad|iPhone|iPod/.test(agente)) {
    return (
      'Segure o dedo em cima da imagem até aparecer o menu e escolha “Copiar texto”. ' +
      'Depois toque no campo da receita, segure e escolha “Colar”.'
    )
  }

  if (/Android/.test(agente)) {
    return (
      'Segure o dedo em cima da imagem e escolha “Pesquisar imagem com o Google”. ' +
      'O Google Lens mostra o texto e deixa copiar. Depois cole no campo da receita.'
    )
  }

  return (
    'No computador não dá para copiar o texto da imagem. Abra este mesmo endereço no celular, ' +
    'que iPhone e Android reconhecem o texto da imagem sozinhos — ou digite a receita à mão.'
  )
}
