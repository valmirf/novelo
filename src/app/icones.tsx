/*
 * Ícones desenhados na gramática do armarinho: traço único de 1.6, cantos
 * vivos, sem preenchimento — como as marcas gravadas nas frentes das gavetas.
 * Emoji não serve: cada aparelho desenha o seu, e nenhum combina com o móvel.
 */

const comum = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false as const,
}

/**
 * Amostra de ponto meia — a peça sendo trabalhada.
 *
 * Duas tentativas com novelo falharam no tamanho da aba: qualquer traço
 * cruzando um círculo lê como sinal de proibido. O ponto tricotado não tem
 * essa ambiguidade e é inconfundível para quem tricota.
 */
export function IconeTrabalhos() {
  return (
    <svg {...comum}>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <path d="M6.6 8.2 8.6 11l2-2.8M13.4 8.2l2 2.8 2-2.8" />
      <path d="M6.6 13.2l2 2.8 2-2.8M13.4 13.2l2 2.8 2-2.8" />
    </svg>
  )
}

/** Caderno aberto de receitas. */
export function IconeReceitas() {
  return (
    <svg {...comum}>
      <path d="M12 6.4C10.4 5.2 8.4 4.7 5 4.9v12.6c3.4-.2 5.4.3 7 1.5 1.6-1.2 3.6-1.7 7-1.5V4.9c-3.4-.2-5.4.3-7 1.5Z" />
      <path d="M12 6.4v12.6" />
    </svg>
  )
}

/**
 * Carretel de linha — os materiais. As abas de cima e de baixo são mais largas
 * que o corpo, senão o desenho lê como escada.
 */
export function IconeMateriais() {
  return (
    <svg {...comum}>
      <path d="M6 4.6h12M6 19.4h12" />
      <path d="M9.2 4.6c0 2.6-1.4 3.4-1.4 7.4s1.4 4.8 1.4 7.4" />
      <path d="M14.8 4.6c0 2.6 1.4 3.4 1.4 7.4s-1.4 4.8-1.4 7.4" />
      <path d="M8.4 9.4h7.2M8 12h8M8.4 14.6h7.2" />
    </svg>
  )
}

/** Puxador de gaveta — os ajustes do móvel. */
export function IconeAjustes() {
  return (
    <svg {...comum}>
      <rect x="3.5" y="7" width="17" height="10" rx="1.5" />
      <path d="M9 12h6" />
      <path d="M9 10.4v3.2M15 10.4v3.2" />
    </svg>
  )
}

/*
 * Setas, pausa e retomada. Existiam como caracteres Unicode (←, →, ⏸, ▶), que
 * cada aparelho desenha do seu jeito — e o ⏸ vira emoji colorido em alguns.
 * Desenhados aqui, ficam no mesmo traço do resto do conjunto.
 */
export function IconeVoltar() {
  return (
    <svg {...comum} width={20} height={20}>
      <path d="M19 12H5.5" />
      <path d="M11 5.5 4.5 12l6.5 6.5" />
    </svg>
  )
}

export function IconeAvancar() {
  return (
    <svg {...comum} width={20} height={20}>
      <path d="M5 12h13.5" />
      <path d="M13 5.5 19.5 12 13 18.5" />
    </svg>
  )
}

export function IconePausar() {
  return (
    <svg {...comum} width={20} height={20}>
      <path d="M9.5 5.5v13M14.5 5.5v13" />
    </svg>
  )
}

export function IconeRetomar() {
  return (
    <svg {...comum} width={20} height={20}>
      <path d="M7.5 5.2 18.5 12 7.5 18.8Z" />
    </svg>
  )
}

/** Cruz de acrescentar, no mesmo traço do resto. */
export function IconeMais() {
  return (
    <svg {...comum} width={22} height={22}>
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  )
}

/** Agulha de crochê, para o estoque de agulhas. */
export function IconeAgulha() {
  return (
    <svg {...comum}>
      <path d="M6 19 16.5 8.5" />
      <path d="M16.5 8.5c1.6-1.6 4-1 4.2 1.1.2 1.7-1.6 2.9-3 2" />
      <path d="M5.2 20.4 4 21l.6-1.2Z" />
    </svg>
  )
}

/** Lupa de busca, no mesmo traço das outras. */
export function IconeBusca() {
  return (
    <svg {...comum}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M15 15l5 5" />
    </svg>
  )
}

/**
 * As telas vazias pedem um desenho maior que o da aba. É o mesmo traço, só
 * que num quadro maior — sistema de ícone único, não dois.
 */
export function IconeGrande({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="icone-grande"
      style={{ display: 'inline-block', width: '3.6rem', height: '3.6rem', color: 'var(--latao-fosco)' }}
    >
      {children}
    </span>
  )
}
