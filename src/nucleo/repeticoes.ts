// O trecho que repete dentro de uma carreira.
//
// Em receita de crochê e tricô, o que fica entre asteriscos é o pedaço que se
// repete até o fim da carreira: "*3 pa, 1 aum, 3 pa*, repita ate o fim". O
// asterisco não é pontuação, é notação — e mostrar o sinal cru na tela é
// entregar a sintaxe da receita para quem o app existe justamente para poupar.
//
// Só o asterisco é reconhecido. Colchete também aparece como repetição em
// muitas receitas, mas aparece como observação editorial em outras, e marcar um
// trecho como "repete" quando não repete é afirmar o que não se sabe — a mesma
// regra que impede o app de inventar contagem.

export interface Pedaco {
  texto: string
  /** Verdadeiro no trecho que a receita manda repetir. */
  repete: boolean
}

export function marcarRepeticoes(texto: string): Pedaco[] {
  const asteriscos = (texto.match(/\*/g) ?? []).length

  // Ímpar quer dizer asterisco sozinho: não dá para saber onde o trecho termina,
  // então o texto passa inteiro, do jeito que a receita escreveu.
  if (asteriscos < 2 || asteriscos % 2 !== 0) return [{ texto, repete: false }]

  const pedacos: Pedaco[] = []
  let resto = texto

  while (true) {
    const abre = resto.indexOf('*')
    if (abre === -1) break
    const fecha = resto.indexOf('*', abre + 1)
    if (fecha === -1) break

    const miolo = resto.slice(abre + 1, fecha)
    // "* *" sem conteúdo não é repetição de nada; deixa o texto passar cru.
    if (miolo.trim() === '') {
      resto = resto.slice(0, fecha + 1) + resto.slice(fecha + 1)
      break
    }

    if (abre > 0) pedacos.push({ texto: resto.slice(0, abre), repete: false })
    pedacos.push({ texto: miolo, repete: true })
    resto = resto.slice(fecha + 1)
  }

  if (resto !== '') pedacos.push({ texto: resto, repete: false })
  return pedacos.length > 0 ? pedacos : [{ texto, repete: false }]
}
