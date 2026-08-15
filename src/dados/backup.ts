// Cópia de segurança em arquivo.
//
// Serve para dois papéis: é a segurança de hoje (o aparelho pode quebrar) e é o
// caminho de importação do dia que os dados forem para a nuvem.

import { banco } from './banco'
import { agora } from '../nucleo/tipos'
import type { Agulha, Ajustes, Linha, Projeto, Receita } from '../nucleo/tipos'

const FORMATO = 1

interface FotoExportada {
  id: string
  donoId: string
  criadoEm: string
  atualizadoEm: string
  apagadoEm?: string
  tipoArquivo: string
  /** A imagem inteira, em base64. */
  conteudo: string
}

export interface ArquivoBackup {
  formato: number
  aplicativo: 'novelo'
  geradoEm: string
  receitas: Receita[]
  projetos: Projeto[]
  linhas: Linha[]
  agulhas: Agulha[]
  fotos: FotoExportada[]
  ajustes?: Ajustes
}

export async function gerarBackup(): Promise<ArquivoBackup> {
  const [receitas, projetos, linhas, agulhas, fotos, ajustes] = await Promise.all([
    banco.receitas.toArray(),
    banco.projetos.toArray(),
    banco.linhas.toArray(),
    banco.agulhas.toArray(),
    banco.fotos.toArray(),
    banco.ajustes.get('unico'),
  ])

  const fotosExportadas: FotoExportada[] = []
  for (const foto of fotos) {
    fotosExportadas.push({
      id: foto.id,
      donoId: foto.donoId,
      criadoEm: foto.criadoEm,
      atualizadoEm: foto.atualizadoEm,
      apagadoEm: foto.apagadoEm,
      tipoArquivo: foto.tipoArquivo,
      conteudo: await paraBase64(foto.arquivo),
    })
  }

  return {
    formato: FORMATO,
    aplicativo: 'novelo',
    geradoEm: agora(),
    receitas,
    projetos,
    linhas,
    agulhas,
    fotos: fotosExportadas,
    ajustes: ajustes ?? undefined,
  }
}

export type ResultadoDownload = 'salvo' | 'recusado'

/**
 * Entrega o arquivo de cópia para a pessoa guardar.
 *
 * São dois caminhos porque são dois lugares onde o app roda. No navegador comum
 * vale o link de download de sempre. Já quando o Novelo está publicado como
 * página no claude.ai, links de download não funcionam — lá é preciso pedir ao
 * hospedeiro, que mostra uma confirmação e pode ser recusado.
 */
export async function baixarBackup(dados: ArquivoBackup): Promise<ResultadoDownload> {
  const data = new Date().toISOString().slice(0, 10)
  const nome = `novelo-backup-${data}.json`
  const conteudo = JSON.stringify(dados)

  const salvador = await acharSalvador()
  if (salvador) {
    try {
      await salvador.save({ filename: nome, data: conteudo })
      return 'salvo'
    } catch (problema) {
      if ((problema as { code?: string })?.code === 'declined') return 'recusado'
      throw problema
    }
  }

  const url = URL.createObjectURL(new Blob([conteudo], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'salvo'
}

interface SalvadorDeArquivo {
  save(pedido: { filename: string; data: string }): Promise<{ status: 'saved' }>
}

async function acharSalvador(): Promise<SalvadorDeArquivo | null> {
  const janela = window as unknown as {
    claude?: { use?: (nome: string) => Promise<unknown> }
  }
  if (!janela.claude?.use) return null
  try {
    return ((await janela.claude.use('downloads')) as SalvadorDeArquivo | null) ?? null
  } catch {
    return null
  }
}

export interface ResultadoImportacao {
  receitas: number
  projetos: number
  linhas: number
  agulhas: number
  fotos: number
}

/**
 * Junta o arquivo com o que já existe. Em caso de id repetido, vence o registro
 * modificado por último — a mesma regra que a sincronia na nuvem vai usar.
 */
export async function importarBackup(texto: string): Promise<ResultadoImportacao> {
  let dados: ArquivoBackup
  try {
    dados = JSON.parse(texto)
  } catch {
    throw new Error('Esse arquivo não é uma cópia do Novelo.')
  }

  if (dados?.aplicativo !== 'novelo' || typeof dados.formato !== 'number') {
    throw new Error('Esse arquivo não é uma cópia do Novelo.')
  }
  if (dados.formato > FORMATO) {
    throw new Error('Essa cópia foi feita numa versão mais nova do Novelo. Atualize o app primeiro.')
  }

  const resultado: ResultadoImportacao = { receitas: 0, projetos: 0, linhas: 0, agulhas: 0, fotos: 0 }

  resultado.receitas = await juntar<Receita>(dados.receitas, banco.receitas)
  resultado.projetos = await juntar<Projeto>(dados.projetos, banco.projetos)
  resultado.linhas = await juntar<Linha>(dados.linhas, banco.linhas)
  resultado.agulhas = await juntar<Agulha>(dados.agulhas, banco.agulhas)

  for (const foto of dados.fotos ?? []) {
    const existente = await banco.fotos.get(foto.id)
    if (existente && existente.atualizadoEm >= foto.atualizadoEm) continue
    await banco.fotos.put({
      id: foto.id,
      donoId: foto.donoId,
      criadoEm: foto.criadoEm,
      atualizadoEm: foto.atualizadoEm,
      apagadoEm: foto.apagadoEm,
      tipoArquivo: foto.tipoArquivo,
      arquivo: deBase64(foto.conteudo, foto.tipoArquivo),
    })
    resultado.fotos++
  }

  return resultado
}

interface TabelaSimples<T> {
  get(id: string): Promise<T | undefined>
  put(item: T): Promise<unknown>
}

async function juntar<T extends { id: string; atualizadoEm: string }>(
  itens: T[] | undefined,
  tabela: TabelaSimples<T>,
): Promise<number> {
  let contagem = 0
  for (const item of itens ?? []) {
    if (!item?.id) continue
    const existente = await tabela.get(item.id)
    if (existente && existente.atualizadoEm >= item.atualizadoEm) continue
    await tabela.put(item)
    contagem++
  }
  return contagem
}

function paraBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader()
    leitor.onerror = () => reject(new Error('Não consegui ler uma das fotos.'))
    leitor.onload = () => {
      const resultado = String(leitor.result)
      resolve(resultado.slice(resultado.indexOf(',') + 1))
    }
    leitor.readAsDataURL(blob)
  })
}

function deBase64(base64: string, tipo: string): Blob {
  const binario = atob(base64)
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  return new Blob([bytes], { type: tipo })
}
