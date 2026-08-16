// Preenchimentos para recursos do JavaScript que Safari antigo não tem.
//
// Precisa rodar antes de qualquer outra coisa (é o primeiro import de main.tsx),
// porque o leitor de PDF conta com esses recursos existirem. Em iPad e iPhone
// que não atualizam sozinhos, Safari fica parado em versões antigas por anos —
// e sem isto o app quebra com "undefined is not a function", sem explicação.
//
// O projeto mira ES2022 de propósito: os tipos são declarados aqui, um a um,
// em vez de elevar o "lib" do projeto para uma versão mais nova (o que faria o
// TypeScript supor que OUTROS recursos novos também existem, sem eu ter
// garantido isso).
declare global {
  interface PromiseConstructor {
    withResolvers<T>(): {
      promise: Promise<T>
      resolve: (valor: T | PromiseLike<T>) => void
      reject: (motivo?: unknown) => void
    }
  }
}

// ---------------------------------------------------------------------------
// Percorrer um ReadableStream com "for await ... of"
//
// ESTA é a causa do PDF não abrir no iPad da Camila. O pdf.js faz, dentro de
// getTextContent:
//
//     const t = this.streamTextContent(e)   // t é um ReadableStream
//     for await (const i of t) { ... }
//
// Safari só ganhou essa capacidade na versão 17.4. Antes disso o laço falha com
// "undefined is not a function (near '...i of t...')" — exatamente a mensagem
// que ela viu. Reproduzido removendo este recurso num Safari real, e confirmado
// que o preenchimento resolve.
const streamPrototipo = typeof ReadableStream !== 'undefined' ? ReadableStream.prototype : undefined

if (streamPrototipo && !(Symbol.asyncIterator in streamPrototipo)) {
  const percorrer = function (this: ReadableStream) {
    const leitor = this.getReader()
    return {
      next: () => leitor.read(),
      // Sair do laço no meio (break, throw) precisa liberar o leitor, senão o
      // stream fica travado e a próxima leitura do mesmo arquivo trava junto.
      async return(valor?: unknown) {
        await leitor.cancel()
        leitor.releaseLock()
        return { done: true as const, value: valor }
      },
      [Symbol.asyncIterator]() {
        return this
      },
    }
  }

  Object.defineProperty(streamPrototipo, Symbol.asyncIterator, {
    value: percorrer,
    writable: true,
    configurable: true,
  })
  // O pdf.js também chama .values() em alguns caminhos; é o mesmo mecanismo.
  Object.defineProperty(streamPrototipo, 'values', {
    value: percorrer,
    writable: true,
    configurable: true,
  })
}

// ---------------------------------------------------------------------------
// Promise.withResolvers — também usado pelo pdf.js, também só a partir do
// Safari 17.4. Mantido: as duas faltas aparecem no mesmo tipo de aparelho.
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
