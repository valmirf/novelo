// O projeto mira ES2022 de propósito — não quero que o TypeScript passe a
// achar que outros recursos do ES2024 também existem só porque este aqui foi
// preenchido à mão. Por isso o tipo é declarado aqui, um por um, em vez de
// elevar o "lib" do projeto inteiro.
declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>
      resolve: (valor: T | PromiseLike<T>) => void
      reject: (motivo?: unknown) => void
    }
  }
}

// Preenchimentos para recurso do JavaScript que nem todo navegador tem ainda.
//
// Precisa rodar antes de qualquer outra coisa, porque o leitor de PDF (pdf.js)
// usa Promise.withResolvers() por baixo dos panos — e esse recurso só existe a
// partir do Safari 17.4. Em qualquer Safari mais velho (comum em iPad que não
// atualiza sozinho), a chamada quebra com "undefined is not a function", bem no
// meio da leitura, sem explicação nenhuma. É o caso do iPad da Camila.
if (typeof Promise.withResolvers !== 'function') {
  Promise.withResolvers = function withResolvers<T>() {
    let resolve!: (valor: T | PromiseLike<T>) => void
    let reject!: (motivo?: unknown) => void
    const promise = new Promise<T>((res, rej) => {
      resolve = res
      reject = rej
    })
    return { promise, resolve, reject }
  }
}
