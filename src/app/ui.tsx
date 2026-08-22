import { useEffect, useRef, useState, type ReactNode } from 'react'
import { repositorio, useFoto } from '../dados/repositorio'
import { IconeVoltar } from './icones'

/*
  A marca. Letra de latão aplicada na testeira do móvel — por isso é a mesma
  condensada gravada dos rótulos de gaveta, e não uma fonte só dela: a marca
  pertence ao armário, não flutua por cima dele.
*/
export function Marca({ pequena = false }: { pequena?: boolean }) {
  return <span className={pequena ? 'marca pequena' : 'marca'}>Novelo</span>
}

export function Cabecalho({
  titulo,
  marca,
  aoVoltar,
  acao,
}: {
  titulo: string
  /* Só a tela inicial mostra o nome; nas outras o título é a informação útil. */
  marca?: boolean
  aoVoltar?: () => void
  acao?: ReactNode
}) {
  return (
    <header className="cabecalho">
      {aoVoltar && (
        <button className="botao contorno" onClick={aoVoltar}>
          <IconeVoltar /> Voltar
        </button>
      )}
      <h1>{marca ? <Marca /> : titulo}</h1>
      {acao}
    </header>
  )
}

export function Campo({
  rotulo,
  ajuda,
  children,
}: {
  rotulo: string
  ajuda?: string
  children: ReactNode
}) {
  return (
    <label className="campo">
      <span>
        {rotulo}
        {ajuda && (
          <>
            <br />
            <span className="ajuda">{ajuda}</span>
          </>
        )}
      </span>
      {children}
    </label>
  )
}

export function Escolha<T extends string | number>({
  rotulo,
  ajuda,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string
  ajuda?: string
  opcoes: { valor: T; texto: string }[]
  valor: T
  aoMudar: (valor: T) => void
}) {
  return (
    <div className="campo">
      <span>
        {rotulo}
        {ajuda && (
          <>
            <br />
            <span className="ajuda">{ajuda}</span>
          </>
        )}
      </span>
      <div className="opcoes" role="group" aria-label={rotulo}>
        {opcoes.map((opcao) => (
          <button
            key={String(opcao.valor)}
            type="button"
            className="opcao"
            aria-pressed={opcao.valor === valor}
            onClick={() => aoMudar(opcao.valor)}
          >
            {opcao.texto}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Interruptor({
  rotulo,
  descricao,
  ligado,
  aoMudar,
}: {
  rotulo: string
  descricao?: string
  ligado: boolean
  aoMudar: (ligado: boolean) => void
}) {
  return (
    <button
      type="button"
      className="interruptor"
      role="switch"
      aria-checked={ligado}
      onClick={() => aoMudar(!ligado)}
    >
      <span>
        <strong>{rotulo}</strong>
        {descricao && (
          <>
            <br />
            <span className="suave">{descricao}</span>
          </>
        )}
      </span>
      <span className="estado">{ligado ? 'Sim' : 'Não'}</span>
    </button>
  )
}

export function Aviso({
  tipo = 'atencao',
  children,
}: {
  tipo?: 'atencao' | 'problema' | 'tudo-certo'
  children: ReactNode
}) {
  const simbolo = tipo === 'problema' ? '✕' : tipo === 'tudo-certo' ? '✓' : '!'
  return (
    <div className={`aviso ${tipo}`} role={tipo === 'problema' ? 'alert' : undefined}>
      <span aria-hidden="true">{simbolo}</span>
      <span>{children}</span>
    </div>
  )
}

export function Vazio({
  desenho,
  titulo,
  texto,
  children,
}: {
  /** Ícone desenhado, do mesmo traço das abas. */
  desenho: ReactNode
  titulo: string
  texto: string
  children?: ReactNode
}) {
  return (
    <div className="vazio">
      <div className="desenho" aria-hidden="true">
        {desenho}
      </div>
      <h2>{titulo}</h2>
      <p>{texto}</p>
      {children}
    </div>
  )
}

/**
 * Confirmação antes de qualquer coisa que não dá para desfazer. Diálogo grande,
 * com o que vai acontecer escrito por extenso — nada de "Tem certeza?" solto.
 */
export function Confirmacao({
  titulo,
  texto,
  confirmar,
  perigo,
  aoConfirmar,
  aoCancelar,
}: {
  titulo: string
  texto: string
  confirmar: string
  perigo?: boolean
  aoConfirmar: () => void
  aoCancelar: () => void
}) {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') aoCancelar()
    }
    document.addEventListener('keydown', aoTeclar)
    return () => document.removeEventListener('keydown', aoTeclar)
  }, [aoCancelar])

  return (
    <div className="fundo-escuro" onClick={aoCancelar}>
      <div
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(evento) => evento.stopPropagation()}
      >
        <h2>{titulo}</h2>
        <p>{texto}</p>
        <div className="linha-botoes">
          <button className="botao contorno" onClick={aoCancelar}>
            Cancelar
          </button>
          <button className={`botao ${perigo ? 'perigo' : 'principal'}`} onClick={aoConfirmar}>
            {confirmar}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Foto guardada no aparelho, reduzida antes de salvar para não encher o celular. */
export function SeletorFoto({
  fotoId,
  aoTrocar,
  rotulo = 'Foto',
  ajuda,
}: {
  fotoId?: string
  aoTrocar: (fotoId: string | undefined) => void
  rotulo?: string
  ajuda?: string
}) {
  const url = useFoto(fotoId)
  const entrada = useRef<HTMLInputElement>(null)
  const [ocupado, setOcupado] = useState(false)

  const escolher = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setOcupado(true)
    try {
      const reduzida = await reduzirImagem(arquivo)
      const id = await repositorio.fotos.guardar(reduzida)
      aoTrocar(id)
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="campo">
      <span>
        {rotulo}
        {ajuda && (
          <>
            <br />
            <span className="ajuda">{ajuda}</span>
          </>
        )}
      </span>
      {url && (
        <img
          src={url}
          alt={rotulo}
          style={{
            width: '100%',
            maxHeight: '16rem',
            objectFit: 'cover',
            borderRadius: '0.7rem',
            marginBottom: '0.6rem',
          }}
        />
      )}
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        onChange={(evento) => void escolher(evento.target.files?.[0])}
      />
      <div className="linha-botoes">
        <button
          type="button"
          className="botao contorno"
          disabled={ocupado}
          onClick={() => entrada.current?.click()}
        >
          {ocupado ? 'Salvando…' : url ? 'Trocar foto' : 'Escolher foto'}
        </button>
        {url && (
          <button type="button" className="botao contorno" onClick={() => aoTrocar(undefined)}>
            Tirar foto
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * A foto do item na lista.
 *
 * O estado vazio existe de propósito e ocupa o mesmo lugar da foto: numa lista
 * em que alguns itens têm foto e outros não, sumir com a moldura faz cada
 * cartão começar num lugar diferente e a lista perde o prumo. Antes o vazio era
 * uma moldura escura e muda; agora carrega, apagado, o mesmo desenho da seção —
 * é decoração e vai escondida do leitor de tela, porque o cartão já diz por
 * escrito o que é.
 */
export function Miniatura({
  fotoId,
  alt,
  vazia,
}: {
  fotoId?: string
  alt: string
  /** Desenho mostrado quando não há foto. Use o ícone da própria seção. */
  vazia?: ReactNode
}) {
  const url = useFoto(fotoId)
  if (url) return <img className="miniatura" src={url} alt={alt} />
  return (
    <div className="miniatura sem-foto" aria-hidden="true">
      {vazia}
    </div>
  )
}

async function reduzirImagem(arquivo: File, maximo = 1400): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo)
  const escala = Math.min(1, maximo / Math.max(bitmap.width, bitmap.height))
  const largura = Math.round(bitmap.width * escala)
  const altura = Math.round(bitmap.height * escala)

  const tela = document.createElement('canvas')
  tela.width = largura
  tela.height = altura
  const contexto = tela.getContext('2d')
  if (!contexto) return arquivo
  contexto.drawImage(bitmap, 0, 0, largura, altura)
  bitmap.close()

  return new Promise((resolve) => {
    tela.toBlob((blob) => resolve(blob ?? arquivo), 'image/jpeg', 0.85)
  })
}
