// Cópia de segurança em arquivo.
//
// Serve para dois papéis: é a segurança de hoje (o aparelho pode quebrar) e é o
// caminho de importação do dia que os dados forem para a nuvem.

import { banco } from './banco'
import { agora } from '../nucleo/tipos'
import type { Agulha, AmostraSalva, Ajustes, Linha, Projeto, Receita } from '../nucleo/tipos'

/**
 * 2 acrescentou a biblioteca de amostras. Uma versão antiga do app recusa este
 * arquivo com recado claro em vez de importar pela metade e perder as amostras
 * calada — perder dado em silêncio é pior que recusar.
 */
const FORMATO = 2

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
  amostras: AmostraSalva[]
  fotos: FotoExportada[]
  ajustes?: Ajustes
}

export async function gerarBackup(): Promise<ArquivoBackup> {
  const [receitas, projetos, linhas, agulhas, amostras, fotos, ajustes] = await Promise.all([
    banco.receitas.toArray(),
    banco.projetos.toArray(),
    banco.linhas.toArray(),
    banco.agulhas.toArray(),
    banco.amostras.toArray(),
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
    amostras,
    fotos: fotosExportadas,
    ajustes: ajustes ?? undefined,
  }
}

/** Baixa a cópia como arquivo. Funciona em navegador comum. */
export function baixarBackup(dados: ArquivoBackup): void {
  const nome = `novelo-backup-${new Date().toISOString().slice(0, 10)}.json`
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * A cópia como texto, para quando o download não funciona.
 *
 * Existe porque nem todo lugar onde o app roda deixa a página entregar arquivo:
 * dentro de uma página incorporada o botão de baixar não faz nada. Aí o jeito é
 * copiar o texto e colar num e-mail para si mesma.
 */
export async function copiarBackup(dados: ArquivoBackup): Promise<'copiado' | 'copie-na-mao'> {
  const texto = JSON.stringify(dados)
  try {
    await navigator.clipboard.writeText(texto)
    return 'copiado'
  } catch {
    return 'copie-na-mao'
  }
}

export function backupComoTexto(dados: ArquivoBackup): string {
  return JSON.stringify(dados)
}

export interface ResultadoImportacao {
  receitas: number
  projetos: number
  linhas: number
  agulhas: number
  amostras: number
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

  const resultado: ResultadoImportacao = {
    receitas: 0,
    projetos: 0,
    linhas: 0,
    agulhas: 0,
    amostras: 0,
    fotos: 0,
  }

  resultado.receitas = await juntar<Receita>(dados.receitas, banco.receitas)
  resultado.projetos = await juntar<Projeto>(dados.projetos, banco.projetos)
  resultado.linhas = await juntar<Linha>(dados.linhas, banco.linhas)
  resultado.agulhas = await juntar<Agulha>(dados.agulhas, banco.agulhas)
  resultado.amostras = await juntar<AmostraSalva>(dados.amostras, banco.amostras)

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
