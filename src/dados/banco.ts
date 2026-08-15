import Dexie, { type EntityTable } from 'dexie'
import type { Agulha, Ajustes, Foto, Linha, Projeto, Receita } from '../nucleo/tipos'

// O banco fica dentro do próprio aparelho (IndexedDB). Nada sai daqui.
// Ninguém fora de `repositorio.ts` deve importar este arquivo — é essa regra que
// deixa a troca por um servidor barata no futuro.

export class BancoNovelo extends Dexie {
  receitas!: EntityTable<Receita, 'id'>
  projetos!: EntityTable<Projeto, 'id'>
  linhas!: EntityTable<Linha, 'id'>
  agulhas!: EntityTable<Agulha, 'id'>
  fotos!: EntityTable<Foto, 'id'>
  ajustes!: EntityTable<Ajustes, 'id'>

  constructor() {
    super('novelo')
    this.version(1).stores({
      receitas: 'id, donoId, titulo, tipo, atualizadoEm, apagadoEm',
      projetos: 'id, donoId, nome, status, receitaId, atualizadoEm, apagadoEm',
      linhas: 'id, donoId, marca, nome, cor, atualizadoEm, apagadoEm',
      agulhas: 'id, donoId, tipo, numero, atualizadoEm, apagadoEm',
      fotos: 'id, donoId, atualizadoEm, apagadoEm',
      ajustes: 'id',
    })
  }
}

export const banco = new BancoNovelo()

export const AJUSTES_PADRAO: Ajustes = {
  id: 'unico',
  tamanhoLetra: 1,
  somAoContar: true,
  telaSempreAcesa: true,
  comandoPorVoz: false,
}
