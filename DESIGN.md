# Design — o mundo do Novelo

<!-- impeccable:design-schema 1 -->

Papel claro, marrom de barro, e o tema que a pessoa já escolheu no aparelho.

Esta é a paleta original do app. Houve uma passagem por outro mundo — **O
Armarinho**, nogueira escura com ferragem de latão — que o dono do projeto
pediu para desfazer. Fica registrado aqui e no `<body>` de `index.html` para
ninguém refazer o caminho por engano. O que veio junto do armarinho e **não era
cor** permaneceu, e está listado no fim deste documento.

## Claro e escuro

Os dois, seguindo `prefers-color-scheme`. Quem tricota à noite sob abajur recebe
o escuro sem pedir; quem tricota de dia recebe o claro. A decisão é do aparelho
dela, não do app.

A paleta escura está escrita duas vezes — uma sob a media query, outra sob
`[data-theme='dark']` — porque CSS puro não deixa compartilhar um bloco entre
dois seletores. A repetição é chata e é de propósito.

## Cor

| Papel | Token | Claro | Escuro |
|---|---|---|---|
| Fundo da página | `--fundo` | `#fdfaf6` | `#1a1512` |
| Superfície (cartão, campo) | `--superficie` | `#ffffff` | `#262019` |
| Superfície rebaixada | `--superficie-2` | `#f4ece3` | `#332a22` |
| Borda / borda forte | `--borda` / `--borda-forte` | `#d9c9ba` / `#b39d8a` | `#4a3e33` / `#6d5c4c` |
| Texto / texto suave | `--texto` / `--texto-suave` | `#241a14` / `#5c4a3f` | `#f7f0e8` / `#d0bfae` |
| **A marca** | `--marca` | `#7c4a3a` (barro) | `#e8a68d` |
| Texto sobre a marca | `--marca-texto` | `#ffffff` | `#241a14` |
| **O fio dela** | `--fio` | `#9c3b4a` | `#c96b78` |

Semânticos com fundo próprio: `--alerta`, `--erro`, `--certo`, cada um com o seu
`-fundo`. Nenhum estado é comunicado só por cor — cada um carrega palavra ou
forma.

**O acento vem do material dela.** `TelaTrabalho` procura a primeira linha
marcada no trabalho que tenha cor escolhida e define `--fio` na raiz. O colchete
de repetição e o quadradinho ao lado do nome da linha usam essa cor.

## Tipografia

Duas faces hospedadas no próprio app (`src/fontes/`), variáveis, licença OFL,
55 KB somados, servidas por caminho relativo — funcionam na subpasta do GitHub
Pages.

| Papel | Token | Face |
|---|---|---|
| Leitura | `--leitura` | **Petrona** — serifa de texto quente, feita para leitura longa |
| Gravado (rótulo, marca, aba, número) | `--gravado` | **Archivo Narrow** — condensada de sinalização |
| Medida | `--medida` | ui-monospace, SF Mono, Menlo |

O mundo original usava a pilha de sans do sistema. As faces hospedadas ficaram
porque resolvem um problema que não é de cor: em Android e Windows a pilha caía
em Roboto, e a voz do app deixava de existir para a maior parte do mercado
brasileiro.

## A marca

`NOVELO` em condensada, caixa alta, entreletra de 0.22em, na cor de barro.
**Sem sombra e sem relevo**: nesta paleta nada finge ser objeto, então a marca
também não. Aparece só na testeira da tela inicial e uma vez em Ajustes.

O ícone é o novelo de barro sobre papel — o original, restaurado junto com a
paleta.

## Piso de acessibilidade (inegociável)

Confirmado pelo usuário e **medido nos dois temas**, não estimado. A auditoria
(`testes/auditoria.mjs`) percorre 84 estados — 2 temas × 7 telas × 3 larguras ×
2 tamanhos de letra — e confere contraste, alvo de toque, nome acessível de
botão, rótulo de campo, alt de imagem, ordem de cabeçalho e transbordo. Zero
reprovações.

- corpo a partir de 20px (`--escala` ajusta tudo em Ajustes, até 1.35);
- alvo de toque de 64px (`--alvo: 3.4rem`);
- contraste alto em todo texto;
- todo botão com palavra escrita; ícone nunca sozinho;
- nenhuma ação atrás de deslizar ou apertar e segurar;
- confirmação por extenso antes de qualquer coisa irreversível.

## O que ficou do armarinho

Nada disto é cor, e por isso nada disto voltou atrás:

- **O colchete de repetição** (`.repete`) — a receita marca com asteriscos o
  trecho que se repete; asterisco é notação de quem escreve receita, não
  pontuação de quem lê. Vira colchete desenhado na cor do fio dela.
- **A sombra de rolagem** (`.trabalho-rodape::before`) — a leitura era cortada
  no meio da palavra por uma linha reta que lia como defeito. Agora dissolve, e
  só quando há mesmo conteúdo abaixo.
- **A biblioteca de amostras** e a leitura de blocagem em português.
- **A barra de abas que cede** — `min-width: 0` e teto em `vw`, porque no
  tamanho de letra "Maior" as quatro abas somavam 433px numa tela de 375px.
- **O selo com teto de largura** — "FAZENDO AGORA" mede 203px nesse tamanho e
  empurrava a página para fora da tela.
- **O cabeçalho que quebra** — numa tela de 320px sobravam 79px para uma palavra
  que pede 90.
- **O bloco de tempo por importância** — o tempo da peça é a leitura grande, a
  sessão confirma que o relógio anda, e o botão desce sozinho quando não cabe.
- **O movimento reduzido que troca em vez de apagar** — antes era
  `animation: none !important` em tudo, o que matava junto o aviso de que a
  carreira mudou.
- **O estado vazio da miniatura**, a escala de espaço, os tokens de movimento e
  a suavização de fonte no tema escuro.

## Movimento

Um momento autoral só: a carreira que entra deslizando ao avançar
(`carreira-entra`, 260ms). A chave `key={posicao}` em `.carreira-atual` é o que
faz o movimento reentrar a cada carreira. Em `prefers-reduced-motion` vira um
esmaecer de 160ms sem deslocamento.

## Ícones

Conjunto autoral em `src/app/icones.tsx`, traço único de 1.6, sem preenchimento.
Nenhum emoji: cada aparelho desenha o seu.

Registro de tentativas falhas, para ninguém repetir: novelo com retas cruzadas e
novelo com arcos **leem como sinal de proibido** no tamanho da aba — por isso o
ícone de Trabalhos é uma amostra de ponto meia. O de Amostras é uma **régua**,
porque o quadrado tricotado já é o de Trabalhos e, lado a lado, os dois viravam
o mesmo desenho.
