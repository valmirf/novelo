import { useEffect, useState } from 'react'
import { desenharPagina } from '../nucleo/pdf'
import { Aviso } from './ui'

/**
 * O que fazer quando o PDF é imagem escaneada.
 *
 * A página é mostrada como imagem para o próprio celular ler: iPhone e Android
 * já vêm com reconhecimento de texto muito bom, de graça e sem instalar nada.
 * Sai bem melhor do que qualquer reconhecedor que coubesse dentro do app.
 */
export function PdfEscaneado({
  arquivo,
  paginas,
  aoFechar,
}: {
  arquivo: File
  paginas: number
  aoFechar: () => void
}) {
  const [pagina, setPagina] = useState(1)
  const [url, setUrl] = useState<string>()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string>()

  useEffect(() => {
    let cancelado = false
    let criada: string | undefined

    setCarregando(true)
    setErro(undefined)

    desenharPagina(arquivo, pagina)
      .then((imagem) => {
        if (cancelado) return
        criada = URL.createObjectURL(imagem)
        setUrl(criada)
      })
      .catch(() => {
        if (!cancelado) setErro('Não consegui mostrar essa página.')
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })

    return () => {
      cancelado = true
      if (criada) URL.revokeObjectURL(criada)
    }
  }, [arquivo, pagina])

  return (
    <div className="cartao">
      <h2>Copiar o texto pelo celular</h2>
      <p className="suave">{instrucoes()}</p>

      {erro && <Aviso tipo="problema">{erro}</Aviso>}

      {carregando ? (
        <p>Preparando a página…</p>
      ) : (
        url && (
          <img
            src={url}
            alt={`Página ${pagina} da receita`}
            style={{
              width: '100%',
              border: '2px solid var(--borda)',
              borderRadius: '0.7rem',
              background: '#ffffff',
            }}
          />
        )
      )}

      {paginas > 1 && (
        <div className="linha-botoes" style={{ marginTop: '0.8rem' }}>
          <button
            className="botao contorno"
            disabled={pagina === 1}
            onClick={() => setPagina((atual) => atual - 1)}
          >
            ← Página anterior
          </button>
          <button
            className="botao contorno"
            disabled={pagina === paginas}
            onClick={() => setPagina((atual) => atual + 1)}
          >
            Próxima página →
          </button>
        </div>
      )}

      <p className="suave" style={{ marginTop: '0.8rem' }}>
        {paginas > 1 ? `Página ${pagina} de ${paginas}.` : 'Página única.'} Depois de colar, confira
        o texto — reconhecimento de imagem às vezes troca número.
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
