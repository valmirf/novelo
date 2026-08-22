// Camada única de acesso a dados.
//
// Nenhuma tela conversa com o banco direto: tudo passa por aqui. Hoje isso grava
// no IndexedDB do aparelho; no dia que houver nuvem, só este arquivo muda e as
// telas continuam iguais. É a costura que combinamos deixar pronta.

import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { AJUSTES_PADRAO, banco } from './banco'
import { agora, novoId } from '../nucleo/tipos'
import type {
  Agulha,
  AmostraSalva,
  Ajustes,
  Base,
  Foto,
  Linha,
  Projeto,
  Receita,
} from '../nucleo/tipos'

/** Enquanto não existe conta, tudo pertence a este dono. */
export const DONO_LOCAL = 'local'

type Tabela<T> = {
  get(id: string): Promise<T | undefined>
  put(item: T): Promise<unknown>
  toArray(): Promise<T[]>
}

function colecao<T extends Base>(tabela: Tabela<T>, ordenarPor: (item: T) => string) {
  const vivos = async () => {
    const todos = await tabela.toArray()
    return todos
      .filter((item) => !item.apagadoEm)
      .sort((a, b) => ordenarPor(a).localeCompare(ordenarPor(b), 'pt-BR'))
  }

  return {
    listar: vivos,

    async obter(id: string): Promise<T | undefined> {
      const item = await tabela.get(id)
      return item && !item.apagadoEm ? item : undefined
    },

    async salvar(dados: Partial<T> & Pick<T, Exclude<keyof T, keyof Base>>): Promise<T> {
      const existente = dados.id ? await tabela.get(dados.id) : undefined
      const registro = {
        ...existente,
        ...dados,
        id: dados.id ?? novoId(),
        donoId: existente?.donoId ?? DONO_LOCAL,
        criadoEm: existente?.criadoEm ?? agora(),
        atualizadoEm: agora(),
      } as T
      await tabela.put(registro)
      return registro
    },

    /** Marca como apagado em vez de remover, para a sincronia futura enxergar. */
    async apagar(id: string): Promise<void> {
      const existente = await tabela.get(id)
      if (!existente) return
      await tabela.put({ ...existente, apagadoEm: agora(), atualizadoEm: agora() })
    },
  }
}

export const repositorio = {
  receitas: colecao<Receita>(banco.receitas, (r) => r.titulo),
  projetos: colecao<Projeto>(banco.projetos, (p) => p.nome),
  linhas: colecao<Linha>(banco.linhas, (l) => `${l.marca} ${l.nome} ${l.cor}`),
  agulhas: colecao<Agulha>(banco.agulhas, (a) => `${a.tipo} ${String(a.numero).padStart(5, '0')}`),
  amostras: colecao<AmostraSalva>(banco.amostras, (a) => a.nome),

  fotos: {
    async guardar(arquivo: Blob): Promise<string> {
      const foto: Foto = {
        id: novoId(),
        donoId: DONO_LOCAL,
        criadoEm: agora(),
        atualizadoEm: agora(),
        arquivo,
        tipoArquivo: arquivo.type || 'image/jpeg',
      }
      await banco.fotos.put(foto)
      return foto.id
    },
    async obter(id: string): Promise<Foto | undefined> {
      return banco.fotos.get(id)
    },
    async apagar(id: string): Promise<void> {
      await banco.fotos.delete(id)
    },
  },

  ajustes: {
    async obter(): Promise<Ajustes> {
      return (await banco.ajustes.get('unico')) ?? AJUSTES_PADRAO
    },
    async salvar(mudancas: Partial<Ajustes>): Promise<Ajustes> {
      const atual = await this.obter()
      const novo = { ...atual, ...mudancas, id: 'unico' as const }
      await banco.ajustes.put(novo)
      return novo
    },
  },
}

// --------------------------------------------------------------------------
// Ganchos de leitura para as telas. Atualizam sozinhos quando o dado muda.

function vivos<T extends Base>(lista: T[] | undefined, ordenarPor: (item: T) => string): T[] {
  return (lista ?? [])
    .filter((item) => !item.apagadoEm)
    .sort((a, b) => ordenarPor(a).localeCompare(ordenarPor(b), 'pt-BR'))
}

export function useReceitas(): Receita[] {
  const lista = useLiveQuery(() => banco.receitas.toArray(), [])
  return vivos(lista, (r) => r.titulo)
}

export function useReceita(id?: string): Receita | undefined {
  return useLiveQuery(async () => (id ? banco.receitas.get(id) : undefined), [id])
}

export function useProjetos(): Projeto[] {
  const lista = useLiveQuery(() => banco.projetos.toArray(), [])
  const ordem = { andamento: 0, pausado: 1, finalizado: 2 }
  return vivos(lista, (p) => p.nome).sort((a, b) => ordem[a.status] - ordem[b.status])
}

export function useProjeto(id?: string): Projeto | undefined {
  return useLiveQuery(async () => (id ? banco.projetos.get(id) : undefined), [id])
}

export function useLinhas(): Linha[] {
  const lista = useLiveQuery(() => banco.linhas.toArray(), [])
  return vivos(lista, (l) => `${l.marca} ${l.nome} ${l.cor}`)
}

export function useAgulhas(): Agulha[] {
  const lista = useLiveQuery(() => banco.agulhas.toArray(), [])
  return vivos(lista, (a) => `${a.tipo} ${String(a.numero).padStart(5, '0')}`)
}

export function useAmostras(): AmostraSalva[] {
  const lista = useLiveQuery(() => banco.amostras.toArray(), [])
  return vivos(lista, (a) => a.nome)
}

export function useAmostra(id?: string): AmostraSalva | undefined {
  return useLiveQuery(async () => (id ? banco.amostras.get(id) : undefined), [id])
}

export function useAjustes(): Ajustes {
  return useLiveQuery(async () => repositorio.ajustes.obter(), [], AJUSTES_PADRAO)
}

/** Devolve um endereço temporário para mostrar a foto guardada. */
export function useFoto(id?: string): string | undefined {
  const [url, setUrl] = useState<string>()

  useEffect(() => {
    let cancelado = false
    let criada: string | undefined

    if (!id) {
      setUrl(undefined)
      return
    }

    repositorio.fotos.obter(id).then((foto) => {
      if (cancelado || !foto) return
      criada = URL.createObjectURL(foto.arquivo)
      setUrl(criada)
    })

    return () => {
      cancelado = true
      if (criada) URL.revokeObjectURL(criada)
    }
  }, [id])

  return url
}
