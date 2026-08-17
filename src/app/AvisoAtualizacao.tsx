import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

/**
 * Avisa quando existe uma versão nova do app e deixa a pessoa escolher a hora
 * de atualizar — nunca recarrega sozinho.
 *
 * A cópia local (para funcionar offline) senão fica presa numa versão antiga
 * para sempre: recarregar forçado é algo que só quem entende de navegador
 * sabe fazer, e não é razoável pedir isso pra Camila. Mas recarregar sem
 * avisar também é arriscado — se ela estiver no meio de digitar uma receita,
 * perderia o que ainda não salvou. Por isso o aviso é visível e o toque é
 * dela.
 */
export function useAtualizacaoDisponivel(): { disponivel: boolean; atualizar: () => void } {
  const [disponivel, setDisponivel] = useState(false)
  const [atualizarFn, setAtualizarFn] = useState<() => void>(() => () => {})

  useEffect(() => {
    const atualizar = registerSW({
      onNeedRefresh() {
        setDisponivel(true)
      },
    })
    setAtualizarFn(() => () => atualizar(true))
  }, [])

  return { disponivel, atualizar: atualizarFn }
}

export function AvisoAtualizacao({ atualizar }: { atualizar: () => void }) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'var(--latao)',
        color: 'var(--madeira-baixa)',
        padding: '0.9rem 1rem',
        paddingBottom: 'max(0.9rem, env(safe-area-inset-bottom))',
        display: 'flex',
        alignItems: 'center',
        gap: '0.8rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontWeight: 700 }}>Tem uma versão nova do Novelo pronta.</span>
      <button
        className="botao"
        style={{ background: 'var(--madeira-baixa)', color: 'var(--latao)', minHeight: '2.8rem' }}
        onClick={atualizar}
      >
        Atualizar agora
      </button>
    </div>
  )
}
