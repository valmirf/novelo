// Gera o Novelo como um arquivo HTML único, para publicar como artefato.
//
// O artefato é servido dentro de uma página que já traz <html>, <head> e <body>
// prontos, e que bloqueia qualquer pedido a outro endereço. Então este script
// pega o build e devolve só o miolo, com o CSS e o JavaScript embutidos.
//
// O leitor de PDF (pdf.js + o worker dele, quase 2 MB) precisa ficar de fora do
// script principal: um WebView com pouca memória — como o do iPhone — trava ao
// interpretar esse tanto de código de uma vez, mesmo que ninguém escolha um
// PDF. Por isso vite.config.artefato.ts deixa esse pedaço como um arquivo
// separado ("preguicoso-*.js"), e aqui ele é embutido como texto inerte
// (base64), que só vira código de verdade — via Blob e import() — no momento
// em que alguém realmente escolhe um arquivo. Até lá, o navegador só carrega
// um texto, sem gastar memória interpretando.

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const ENTRADA = 'dist-artefato'
const SAIDA = 'artefato/novelo.html'
const PREFIXO_PREGUICOSO = 'preguicoso-'

const html = await readFile(join(ENTRADA, 'index.html'), 'utf8')

const arquivoJs = html.match(/<script[^>]+src="\/?([^"]+\.js)"/)?.[1]
const arquivoCss = html.match(/<link[^>]+href="\/?([^"]+\.css)"/)?.[1]

if (!arquivoJs) throw new Error('Não achei o JavaScript no build.')
if (!arquivoCss) throw new Error('Não achei o CSS no build.')

let js = await readFile(join(ENTRADA, arquivoJs), 'utf8')
const css = await readFile(join(ENTRADA, arquivoCss), 'utf8')

// Os pedaços preguiçosos: tudo que o build separou por ser pesado demais para
// entrar no carregamento inicial.
const todosOsArquivos = await readdir(ENTRADA)
const nomesPreguicosos = todosOsArquivos.filter((nome) => nome.startsWith(PREFIXO_PREGUICOSO))

if (nomesPreguicosos.length === 0) {
  throw new Error(
    'Não achei nenhum pedaço preguiçoso. O leitor de PDF deveria estar separado — confira vite.config.artefato.ts.',
  )
}

const pedacos = []
for (const nome of nomesPreguicosos) {
  const especificador = `./${nome}`
  if (!js.includes(`"${especificador}"`)) {
    throw new Error(
      `O pedaço "${nome}" existe mas o script principal não faz import() dele. ` +
        'A convenção de nomes deve ter mudado — confira o import em pdf.ts.',
    )
  }
  const conteudo = await readFile(join(ENTRADA, nome), 'utf8')
  pedacos.push({ nome, especificador, base64: Buffer.from(conteudo, 'utf8').toString('base64') })
}

// Cada import("./preguicoso-x.js") no script principal é trocado por uma
// variável — preenchida em tempo de execução com o endereço do Blob — para que
// o navegador só baixe e interprete aquele código quando o import() rodar de
// verdade, não durante o carregamento da página.
pedacos.forEach((pedaco, indice) => {
  const variavel = `__pedacoPreguicoso${indice}`
  js = js.replaceAll(`"${pedaco.especificador}"`, variavel)
  pedaco.variavel = variavel
})

// Um "</script>" solto dentro de uma string do bundle fecharia a tag cedo demais.
const jsSeguro = js.replaceAll('</script>', '<\\/script>')

const blocosDeTexto = pedacos
  .map((p) => `<script type="text/plain" id="${p.nome}">${p.base64}</script>`)
  .join('\n')

// Endereço "data:" em vez de Blob: dentro da sandbox de verdade em que o
// artefato roda, o WebKit falha ao carregar recurso do tipo blob: ("WebKitBlobResource
// error 1") — confirmado com testes num motor Safari real, sandboxado como o
// artefato. "data:" não passa por esse mecanismo, e é o mesmo tipo de endereço
// que o próprio worker do pdf.js já usa aqui dentro com sucesso.
const preparoDosPedacos = pedacos
  .map(
    (p) =>
      `const ${p.variavel} = 'data:text/javascript;base64,' + document.getElementById(${JSON.stringify(p.nome)}).textContent`,
  )
  .join('\n  ')

const pagina = `<title>Novelo</title>
<style>
${css}
</style>

<div id="root"></div>

${blocosDeTexto}

<script type="module">
// A página que hospeda o artefato monta o <head>, então a regra de viewport
// para celular é aplicada aqui, e só se ainda não existir.
if (!document.querySelector('meta[name="viewport"]')) {
  const viewport = document.createElement('meta')
  viewport.name = 'viewport'
  viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover'
  document.head.appendChild(viewport)
}

// Os pedaços pesados (leitor de PDF) viram Blob só agora — isso não custa
// memória de interpretação, é só reservar o endereço. A interpretação de
// verdade só acontece quando o app chamar import() por eles, ao escolher um
// arquivo.
${preparoDosPedacos}

${jsSeguro}
</script>
`

await mkdir('artefato', { recursive: true })
await writeFile(SAIDA, pagina)

const tamanho = (Buffer.byteLength(pagina) / 1024).toFixed(0)
console.log(`${SAIDA} gerado — ${tamanho} KB (${pedacos.length} pedaço(s) preguiçoso(s): ${pedacos.map((p) => p.nome).join(', ')})`)
