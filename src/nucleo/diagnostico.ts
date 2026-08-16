// Diagnóstico que a própria pessoa consegue ler e mandar num print.
//
// Descobrir por que o PDF não abria no iPad da Camila custou dias, porque a
// única forma de ver a causa era ligar o aparelho num Mac e abrir o Inspetor
// Web. Isso não é razoável. Agora o app mostra na tela o que precisamos saber:
// qual versão está rodando (para saber se é cópia velha em cache) e se o
// navegador tem os recursos de que o leitor de PDF depende.

declare const __VERSAO_DO_APP__: string

export const VERSAO = typeof __VERSAO_DO_APP__ === 'string' ? __VERSAO_DO_APP__ : 'desenvolvimento'

/** Os recursos que faltavam no Safari antigo e quebravam a leitura de PDF. */
export function recursosDoNavegador(): { nome: string; presente: boolean }[] {
  const temStreamPercorrivel =
    typeof ReadableStream !== 'undefined' && Symbol.asyncIterator in ReadableStream.prototype

  return [
    { nome: 'lista', presente: temStreamPercorrivel },
    { nome: 'espera', presente: typeof Promise.withResolvers === 'function' },
    { nome: 'trabalhador', presente: typeof Worker !== 'undefined' },
  ]
}

/**
 * Uma linha curta, feia de propósito: é para ser fotografada e mandada, não
 * para ser bonita. Sem ela, a alternativa é pedir para a pessoa abrir o
 * console do navegador — o que já se mostrou inviável.
 */
export function resumoTecnico(erro?: unknown): string {
  const recursos = recursosDoNavegador()
    .map((r) => `${r.nome}:${r.presente ? 'ok' : 'FALTA'}`)
    .join(' ')

  const motivo =
    erro instanceof Error ? erro.message : erro !== undefined ? String(erro) : 'sem erro'

  return `v${VERSAO} · ${recursos} · ${motivo}`
}
