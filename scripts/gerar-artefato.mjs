// Gera o Novelo como um arquivo HTML único, para publicar como artefato.
//
// O artefato é servido dentro de uma página que já traz <html>, <head> e <body>
// prontos, e que bloqueia qualquer pedido a outro endereço. Então este script
// pega o build e devolve só o miolo, com o CSS e o JavaScript embutidos.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const ENTRADA = 'dist-artefato'
const SAIDA = 'artefato/novelo.html'

const html = await readFile(join(ENTRADA, 'index.html'), 'utf8')

const arquivoJs = html.match(/<script[^>]+src="\/?([^"]+\.js)"/)?.[1]
const arquivoCss = html.match(/<link[^>]+href="\/?([^"]+\.css)"/)?.[1]

if (!arquivoJs) throw new Error('Não achei o JavaScript no build.')
if (!arquivoCss) throw new Error('Não achei o CSS no build.')

const js = await readFile(join(ENTRADA, arquivoJs), 'utf8')
const css = await readFile(join(ENTRADA, arquivoCss), 'utf8')

// Um "</script>" solto dentro de uma string do bundle fecharia a tag cedo demais.
const jsSeguro = js.replaceAll('</script>', '<\\/script>')

const pagina = `<title>Novelo</title>
<style>
${css}
</style>

<div id="root"></div>

<script type="module">
// A página que hospeda o artefato monta o <head>, então a regra de viewport
// para celular é aplicada aqui, e só se ainda não existir.
if (!document.querySelector('meta[name="viewport"]')) {
  const viewport = document.createElement('meta')
  viewport.name = 'viewport'
  viewport.content = 'width=device-width, initial-scale=1, viewport-fit=cover'
  document.head.appendChild(viewport)
}

${jsSeguro}
</script>
`

await mkdir('artefato', { recursive: true })
await writeFile(SAIDA, pagina)

const tamanho = (Buffer.byteLength(pagina) / 1024).toFixed(0)
console.log(`${SAIDA} gerado — ${tamanho} KB`)
