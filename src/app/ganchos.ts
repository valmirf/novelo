import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Segura a tela acesa enquanto ela trabalha. Sem isso o celular apaga no meio da
 * carreira e ela precisa desbloquear com a agulha na mão.
 */
export function useTelaAcesa(ativo: boolean): void {
  useEffect(() => {
    if (!ativo || !('wakeLock' in navigator)) return

    let travaAtual: WakeLockSentinel | undefined
    let cancelado = false

    const pedir = async () => {
      try {
        travaAtual = await navigator.wakeLock.request('screen')
      } catch {
        // Bateria baixa ou aba em segundo plano: não é erro que valha mostrar.
      }
    }

    const aoVoltar = () => {
      if (!cancelado && document.visibilityState === 'visible') void pedir()
    }

    void pedir()
    document.addEventListener('visibilitychange', aoVoltar)

    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      void travaAtual?.release()
    }
  }, [ativo])
}

/** Um bipe curto de confirmação, para não precisar olhar a tela a cada carreira. */
export function useSom(ativo: boolean): () => void {
  const contexto = useRef<AudioContext>()

  return useCallback(() => {
    if (!ativo) return
    try {
      contexto.current ??= new AudioContext()
      const ctx = contexto.current
      if (ctx.state === 'suspended') void ctx.resume()

      const oscilador = ctx.createOscillator()
      const volume = ctx.createGain()
      oscilador.frequency.value = 880
      oscilador.type = 'sine'
      volume.gain.setValueAtTime(0.0001, ctx.currentTime)
      volume.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01)
      volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.14)
      oscilador.connect(volume).connect(ctx.destination)
      oscilador.start()
      oscilador.stop(ctx.currentTime + 0.15)
    } catch {
      // Sem áudio disponível: segue sem som.
    }
  }, [ativo])
}

/** Cronômetro da sessão de trabalho, em segundos. */
export function useCronometro(): {
  rodando: boolean
  segundos: number
  comecar: () => void
  parar: () => number
  zerar: () => void
} {
  const [rodando, setRodando] = useState(false)
  const [segundos, setSegundos] = useState(0)
  const inicio = useRef<number>(0)

  useEffect(() => {
    if (!rodando) return
    const timer = setInterval(() => {
      setSegundos(Math.floor((Date.now() - inicio.current) / 1000))
    }, 1000)
    return () => clearInterval(timer)
  }, [rodando])

  const comecar = useCallback(() => {
    inicio.current = Date.now() - segundos * 1000
    setRodando(true)
  }, [segundos])

  const parar = useCallback(() => {
    // Parar duas vezes seguidas não pode recontar desde o início antigo, senão
    // uma pausa seguida de troca de app registra horas que não existiram.
    if (!rodando) return segundos
    setRodando(false)
    const total = Math.floor((Date.now() - inicio.current) / 1000)
    setSegundos(total)
    return total
  }, [rodando, segundos])

  const zerar = useCallback(() => {
    inicio.current = Date.now()
    setSegundos(0)
  }, [])

  return { rodando, segundos, comecar, parar, zerar }
}

// --------------------------------------------------------------------------
// Comando por voz: dá para avançar a carreira com as duas mãos ocupadas.

interface EventoFala {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
  resultIndex: number
}

interface Reconhecedor {
  lang: string
  continuous: boolean
  interimResults: boolean
  start(): void
  stop(): void
  onresult: ((evento: EventoFala) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

type ConstrutorReconhecedor = new () => Reconhecedor

function acharReconhecedor(): ConstrutorReconhecedor | undefined {
  const janela = window as unknown as {
    SpeechRecognition?: ConstrutorReconhecedor
    webkitSpeechRecognition?: ConstrutorReconhecedor
  }
  return janela.SpeechRecognition ?? janela.webkitSpeechRecognition
}

export const VOZ_DISPONIVEL = typeof window !== 'undefined' && acharReconhecedor() !== undefined

export function useComandoPorVoz(
  ativo: boolean,
  aoOuvir: (comando: 'avancar' | 'voltar') => void,
): void {
  const callback = useRef(aoOuvir)
  callback.current = aoOuvir

  useEffect(() => {
    const Construtor = acharReconhecedor()
    if (!ativo || !Construtor) return

    const reconhecedor = new Construtor()
    reconhecedor.lang = 'pt-BR'
    reconhecedor.continuous = true
    reconhecedor.interimResults = false
    let parado = false

    reconhecedor.onresult = (evento) => {
      for (let i = evento.resultIndex; i < evento.results.length; i++) {
        const fala = evento.results[i][0].transcript
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')

        if (/\b(voltar|volta|anterior|desfazer)\b/.test(fala)) callback.current('voltar')
        else if (/\b(proxima|proximo|avancar|avanca|contar|feito|pronto)\b/.test(fala)) {
          callback.current('avancar')
        }
      }
    }

    // O reconhecimento se encerra sozinho de tempos em tempos; religa.
    reconhecedor.onend = () => {
      if (!parado) {
        try {
          reconhecedor.start()
        } catch {
          // Já estava rodando.
        }
      }
    }
    reconhecedor.onerror = () => {}

    try {
      reconhecedor.start()
    } catch {
      // Permissão negada: o app segue funcionando pelos botões.
    }

    return () => {
      parado = true
      reconhecedor.onend = null
      reconhecedor.stop()
    }
  }, [ativo])
}

/** "1h 20min" — jeito que as pessoas falam, não "01:20:00". */
export function formatarDuracao(segundos: number): string {
  const horas = Math.floor(segundos / 3600)
  const minutos = Math.floor((segundos % 3600) / 60)
  const resto = segundos % 60
  if (horas > 0) return `${horas}h ${String(minutos).padStart(2, '0')}min`
  if (minutos > 0) return `${minutos}min ${String(resto).padStart(2, '0')}s`
  return `${resto}s`
}

export function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Diz se ainda há conteúdo abaixo do que está à vista numa área que rola.
 *
 * A tela de trabalho cortava a próxima carreira no meio da palavra — "1 pa em
 * cada ponto. (135" — com um corte reto que lê como defeito, não como "tem mais
 * embaixo". Com isto o rodapé desenha uma sombra suave por cima do corte, e só
 * enquanto houver mesmo o que ver.
 *
 * Devolve uma referência por função, e não um `useRef`. A tela aparece primeiro
 * no estado "ainda carregando", sem a área que rola; com `useRef` o efeito roda
 * uma vez com a referência vazia e nunca mais, porque o objeto de referência
 * não muda — foi exatamente esse o defeito da primeira versão. Guardar o
 * elemento em estado faz o efeito rodar de novo quando ele enfim existe.
 */
export function useTemMaisAbaixo(): {
  prender: (elemento: HTMLElement | null) => void
  temMais: boolean
} {
  const [elemento, prender] = useState<HTMLElement | null>(null)
  const [temMais, setTemMais] = useState(false)

  useEffect(() => {
    if (!elemento) return

    const conferir = () => {
      const sobra = elemento.scrollHeight - elemento.scrollTop - elemento.clientHeight
      // Uma folga de 2px evita piscar por causa de arredondamento de zoom.
      setTemMais(sobra > 2)
    }

    conferir()
    elemento.addEventListener('scroll', conferir, { passive: true })

    // O texto reflui quando a fonte hospedada termina de carregar, e aí a
    // altura do conteúdo muda sem que ninguém mexa no DOM.
    void document.fonts?.ready.then(conferir)

    // A caixa muda de tamanho ao girar o aparelho ou ao mudar o tamanho da letra.
    const observador = new ResizeObserver(conferir)
    observador.observe(elemento)
    for (const filho of elemento.children) observador.observe(filho)

    // O conteúdo cresce quando a carreira muda ou um contador aparece.
    const mutacoes = new MutationObserver(conferir)
    mutacoes.observe(elemento, { childList: true, subtree: true, characterData: true })

    return () => {
      elemento.removeEventListener('scroll', conferir)
      observador.disconnect()
      mutacoes.disconnect()
    }
  }, [elemento])

  return { prender, temMais }
}
