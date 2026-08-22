// Modelo de dados do app.
//
// Todo registro carrega id em UUID, marcas de tempo e `donoId`. Isso não serve
// para nada hoje — o app é local e de uma pessoa só — mas é exatamente o que
// permite ligar sincronia na nuvem depois sem migrar banco nem reescrever tela.

export interface Base {
  /** UUID. Nunca use id sequencial: dois aparelhos offline gerariam o mesmo. */
  id: string
  /** 'local' enquanto não existe conta. Vira o id do usuário no dia que existir. */
  donoId: string
  criadoEm: string
  atualizadoEm: string
  /** Apagar é marcar, não sumir: a sincronia precisa saber que foi apagado. */
  apagadoEm?: string
}

export type TipoTrabalho = 'croche' | 'trico'

export interface Amostra {
  /** Pontos contados em 10 cm. */
  pontos: number
  /** Carreiras contadas em 10 cm. */
  carreiras: number
  observacao?: string
}

/**
 * Uma amostra guardada na biblioteca.
 *
 * É o registro de uma combinação que ela já testou: esta linha, com esta
 * agulha, neste ponto, dá esta contagem em 10 cm. Serve para não refazer a
 * mesma amostra duas vezes e para escolher a agulha certa antes de começar.
 *
 * A `Amostra` acima é só a medida solta que vive dentro de uma receita ou de um
 * trabalho; esta é o registro completo, com material, blocagem e foto.
 */
export interface AmostraSalva extends Base {
  /** Como ela chama esta amostra. Ex.: "Barroco com agulha 4". */
  nome: string
  tipo: TipoTrabalho
  /** O ponto usado. Ex.: "ponto alto", "meia", "arroz". */
  ponto?: string

  /** Contagem em 10 cm, do jeito que saiu da agulha. */
  pontos: number
  carreiras: number

  /** Linha do inventário. */
  linhaId?: string
  /** Quando a linha usada não está guardada nos materiais. */
  linhaTexto?: string
  agulhaId?: string
  agulhaTexto?: string

  /** Molhada e esticada para secar. Muda a contagem quase sempre. */
  blocada: boolean
  /** Só existe quando blocada: a contagem em 10 cm depois de blocar. */
  pontosBlocada?: number
  carreirasBlocada?: number
  /** Só existe quando blocada: o tamanho da amostra depois de blocar, em cm. */
  larguraBlocada?: number
  alturaBlocada?: number

  fotoId?: string
  notas?: string
}

export interface Receita extends Base {
  titulo: string
  tipo: TipoTrabalho
  /** O texto cru da receita, do jeito que foi copiado. */
  texto: string
  notas?: string
  dificuldade?: 1 | 2 | 3
  linhaSugerida?: string
  agulhaSugerida?: string
  amostra?: Amostra
  fotoId?: string
  autoria?: string
}

export interface Contador {
  id: string
  nome: string
  valor: number
  cor: string
  /** Volta a zero ao chegar nesse número. Vazio = conta para sempre. */
  reiniciaEm?: number
  /** Quantas vezes já reiniciou. É o número de repetições do padrão já feitas. */
  voltas: number
  /** Sobe junto com o contador de carreiras. */
  vinculado: boolean
  /** Só funciona entre essas carreiras. Vazio = sempre. */
  ativoDe?: number
  ativoAte?: number
}

export interface Lembrete {
  id: string
  /** Número da carreira em que o aviso aparece. */
  carreira: number
  texto: string
  visto: boolean
}

export interface Sessao {
  inicio: string
  fim: string
  segundos: number
}

export type StatusProjeto = 'andamento' | 'pausado' | 'finalizado'

export interface Projeto extends Base {
  nome: string
  receitaId?: string
  status: StatusProjeto
  /** Posição na lista de carreiras interpretadas, começando em 0. */
  carreiraAtual: number
  contadores: Contador[]
  lembretes: Lembrete[]
  segundosTotais: number
  sessoes: Sessao[]
  linhaIds: string[]
  agulhaIds: string[]
  fotoId?: string
  notas?: string
  amostraReal?: Amostra
  /**
   * Qual tamanho da receita esta peça está seguindo, começando em 0.
   * Fica no trabalho e não na receita: a mesma receita serve para fazer a peça
   * em tamanhos diferentes para pessoas diferentes.
   */
  tamanho?: number
  /** Trava os botões para não contar sem querer com o trabalho no colo. */
  travado: boolean
}

export type EspessuraLinha =
  | 'muito fina'
  | 'fina'
  | 'média'
  | 'grossa'
  | 'muito grossa'

export interface Linha extends Base {
  marca: string
  nome: string
  cor: string
  /**
   * A cor de verdade do fio, escolhida no seletor. O nome ("vermelho") serve
   * para ela procurar; esta serve para o app pintar o trabalho com a cor que
   * ela está usando, em vez de uma cor de marca minha.
   */
  corHex?: string
  /** Lote de tingimento. Cores do mesmo tom variam entre lotes diferentes. */
  lote?: string
  composicao?: string
  /** Gramas por novelo. */
  gramatura?: number
  /** Metros por novelo. */
  metragem?: number
  /** Quantos novelos existem em casa. */
  quantidade: number
  espessura?: EspessuraLinha
  agulhaSugerida?: string
  fotoId?: string
  notas?: string
}

export type TipoAgulha = 'croche' | 'trico reta' | 'trico circular' | 'trico de meia'

export interface Agulha extends Base {
  tipo: TipoAgulha
  /** Numeração em milímetros. */
  numero: number
  /** Comprimento do cabo ou do fio, em cm. */
  comprimento?: number
  material?: string
  quantidade: number
  notas?: string
}

export interface Foto extends Base {
  arquivo: Blob
  tipoArquivo: string
}

export interface Ajustes {
  id: 'unico'
  /** Multiplicador do tamanho da letra em todo o app. */
  tamanhoLetra: number
  somAoContar: boolean
  telaSempreAcesa: boolean
  comandoPorVoz: boolean
}

export function agora(): string {
  return new Date().toISOString()
}

export function novoId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Reserva para navegadores antigos, que ainda aparecem em aparelho de família.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
