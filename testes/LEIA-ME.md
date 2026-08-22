# Testes do Novelo

Três camadas, cada uma respondendo uma pergunta diferente.

## `npm test` — a lógica sozinha

Vitest sobre `src/**/*.test.ts`. Cobre o que decide número: o interpretador de
receitas, a expansão de repetições, a resolução de tamanhos, a conversão de
amostra e a leitura de blocagem. São rápidos e rodam sem navegador.

## `npm run test:e2e` — o app inteiro, no aparelho

Playwright em dois perfis: **iPhone 13** (WebKit) e **Pixel 7** (Chromium).
WebKit não é enfeite: a Camila usa iPhone, e os dois problemas mais caros da
história deste app — o PDF que não abria e a página que recarregava sozinha — só
apareceram no Safari.

Roda contra o **pacote construído**, não contra o servidor de desenvolvimento.
É o arquivo que ela de fato baixa, com as fontes versionadas, o service worker e
o caminho relativo do GitHub Pages — e é muito mais rápido.

Os testes seguem os princípios do produto, não a estrutura do código:

| Arquivo | O que prova |
|---|---|
| `contagem.spec.ts` | Avançar, voltar, e a carreira sobreviver a fechar o app |
| `durabilidade.spec.ts` | "Nada se perde": toques encostados contam todos |
| `interpretacao.spec.ts` | Repetição expandida em passadas de verdade; asterisco desenhado, nunca mostrado |
| `amostras.spec.ts` | Biblioteca de amostras, blocagem lida em português, e o "falta medir" que recusa inventar |
| `acessibilidade.spec.ts` | O piso do produto: nada transborda, todo botão tem palavra, nenhum alvo abaixo de 44px |

Tudo é alcançado por papel e por palavra visível, nunca por classe de CSS. Não é
só higiene: se um botão não pode ser achado pelo nome que mostra, quem usa
leitor de tela também não o acha — o teste que quebra está apontando um defeito
de verdade. Foi assim que a barra de progresso ganhou `aria-valuetext` e o
rótulo da carreira virou cabeçalho.

## `npm run auditar` e `npm run capturar` — conferir com número e com olho

`auditoria.mjs` percorre 7 telas em 3 larguras e 2 tamanhos de letra e mede
contraste, alvo de toque, nome acessível, rótulo de campo, alt de imagem, ordem
de cabeçalho e transbordo horizontal. Foi ele que achou o selo de status
empurrando a página para fora da tela.

`capturar.mjs` fotografa as telas principais em `capturas/`, e `impressao.mjs`
grava a caixa de cada elemento em número — comparar dois arquivos destes prova
que uma mudança de sistema não mexeu no que já estava certo.

## Um aviso sobre a porta 4173

O Playwright constrói e sobe o próprio servidor em 4173, e está configurado para
**nunca reaproveitar** um que já esteja de pé. Reaproveitar parece economia e é
armadilha: um `vite preview` esquecido na porta serve um pacote antigo, e a
suíte inteira reprova apontando defeitos que já foram corrigidos.

Se a subida do servidor der tempo esgotado, quase sempre é um processo velho
segurando a porta:

```
pkill -f "vite preview"
```
