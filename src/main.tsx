import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { banco } from './dados/banco'
import './nucleo/polyfills'
import './estilo.css'

const raiz = createRoot(document.getElementById('root')!)

/**
 * O app inteiro depende do banco do navegador. Ele pode faltar em navegação
 * anônima ou dentro de páginas incorporadas — e aí é melhor dizer o que houve do
 * que deixar a pessoa salvando receitas que somem sem aviso.
 */
banco
  .open()
  .then(() => raiz.render(
    <StrictMode>
      <App />
    </StrictMode>,
  ))
  .catch(() =>
    raiz.render(
      <div className="aplicativo">
        <main className="conteudo">
          <div className="vazio">
            <div className="desenho" aria-hidden="true">
              🧶
            </div>
            <h2>Não consigo guardar nada neste navegador</h2>
            <p>
              O Novelo precisa guardar as receitas dentro do aparelho, e este navegador não está
              deixando. Costuma ser janela anônima ou privada.
            </p>
            <p>Feche a janela anônima e abra o Novelo numa janela normal.</p>
          </div>
        </main>
      </div>,
    ),
  )
