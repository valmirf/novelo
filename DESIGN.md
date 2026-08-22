# Design — O Armarinho

<!-- impeccable:design-schema 1 -->

Escrito a partir do que foi construído, não do que foi planejado. Semente da
direção: `1640563b`, candidato 6 da lista ordenada. O contrato de direção vive
no `<body>` de `index.html` e sobrevive ao build.

## O mundo

O app é o armário dela — o armarinho. Estrutura em nogueira escura, latão para
número e puxador, e **todo texto que ela precisa ler fica sobre papel de
etiqueta claro**. É assim que o móvel funciona: o corpo é escuro, a etiqueta é
clara.

Recusa explícita de dois padrões: o app de tricô pastel com cartão arredondado
e bolinha de lã, e o creme + serifada + terracota que esta mesma interface era
antes — o clichê de interface gerada por IA.

## Claro ou escuro

Escuro, escolhido pela cena e não por categoria: tricô acontece dentro de casa,
muitas vezes à noite sob abajur, em sessões longas. **Não existe versão clara** —
o móvel é escuro. A interface não segue o tema do sistema, mas pinta tudo
explicitamente para nunca herdar fundo de lugar nenhum.

## Cor

Estratégia: paleta completa com quatro papéis, e **um acento que não é meu**.

| Papel | Token | Valor |
|---|---|---|
| Estrutura (o móvel) | `--madeira` / `--madeira-alta` / `--madeira-baixa` / `--veio` | `#241a12` `#33251a` `#180f0a` `#0f0a06` |
| Ferragem | `--latao` / `--latao-fosco` / `--latao-brilho` | `#d4a83c` `#8a6f2a` `#f0d68a` |
| Papel (onde se lê) | `--etiqueta` / `--etiqueta-sombra` | `#f2ece0` `#ded5c4` |
| Tinta sobre papel | `--tinta` / `--tinta-suave` | `#17110c` `#4a3d2f` |
| Sobre madeira | `--sobre-madeira` / `--sobre-madeira-suave` | `#f4efe6` `#c4b49c` |
| **O fio dela** | `--fio` | `#9c3b4a` (padrão) — **substituído em tempo de execução pela cor da linha cadastrada** |

Semânticos, sempre em papel e sempre acompanhados de palavra ou forma:
`--alerta` `#b8801f`, `--erro` `#a02b23`, `--certo` `#2f6b41`, cada um com seu
papel tingido (`--alerta-papel`, `--erro-papel`, `--certo-papel`).

**O acento vem do material dela.** `TelaTrabalho` procura a primeira linha
marcada no trabalho que tenha cor escolhida e define `--fio` na raiz. O app não
impõe cor de marca por cima do fio que ela está usando.

## Tipografia

Duas faces **hospedadas no próprio app** (`src/fontes/`), variáveis, licença
OFL, 55 KB somados, versionadas pelo build e servidas por caminho relativo —
funcionam em subpasta como a do GitHub Pages.

| Papel | Token | Face |
|---|---|---|
| Leitura (a instrução) | `--leitura` | **Petrona** (Impallari Type) — serifa de texto quente, feita para leitura longa |
| Gravado (rótulo, número, botão, marca) | `--gravado` | **Archivo Narrow** — grotesca estreita de sinalização, terminais retos |
| Medida | `--medida` | ui-monospace, SF Mono, Menlo |

Petrona é argentina, o que combina com o assunto sem precisar declarar nada. As
pilhas de sistema continuam atrás das duas como rede de segurança. Acentos do
português conferidos por medição de largura em ambas as faces, não presumidos.

Rótulos em caixa alta com entreletra de 0.04–0.09em; a instrução em serifa com
medida máxima de 30ch. Números com `tabular-nums` para não dançar ao contar.

**Dívida quitada.** Antes o app dependia de pilhas de sistema: em Apple caíam em
faces com caráter, em Android e Windows caíam em Georgia e Roboto e a voz
gravada deixava de existir — a maior parte do mercado brasileiro. Agora a voz é
a mesma em qualquer aparelho.

## A marca

Antes do redesenho **a marca não aparecia em lugar nenhum do produto**: "Novelo"
só existia no manifesto do PWA, então a pessoa usava o app sem nunca ver o nome.

- **Assinatura** (`.marca`, `src/app/ui.tsx`) — NOVELO em Archivo Narrow 700,
  caixa alta, entreletra de 0.22em: letra de latão **aplicada** na testeira do
  móvel. Fio claro na aresta de cima e sombra projetada embaixo, coerente com a
  luz da cena. Sem gradiente no glifo — a página não desenha metal polido em
  lugar nenhum, então a marca também não finge. A marca usa a mesma condensada
  dos rótulos de gaveta de propósito: ela pertence ao armário, não flutua acima
  dele.
- **Onde aparece** — só na testeira da tela inicial e uma vez em Ajustes
  (`.marca.pequena`). Nas outras telas o título é a informação útil. O rótulo
  "Meus trabalhos" desceu para o conteúdo (`.rotulo-lista`) para que a lista
  continue nomeada por extenso.
- **Ícone** (`public/icone.svg`, mais os PNGs de 192 e 512) — a placa de latão
  parafusada na gaveta, com o N vazado até a madeira. Legibilidade conferida a
  80px. Duas versões descartadas ficam registradas no próprio arquivo: o novelo
  creme e terracota do mundo antigo, e a gaveta inteira com puxador embaixo, que
  no tamanho de ícone lia como **televisão com pé**.

## Tokens

Auditoria de cobertura feita sobre o arquivo, não estimada.

| Categoria | Antes | Depois |
|---|---|---|
| Cor | 20 tokens + **13 hex soltos** no corpo do arquivo | 29 tokens, **zero hex solto** |
| Espaço | nenhum token, **26 valores distintos** | 10 degraus, 15 valores |
| Movimento | nenhum token, 3 durações e 2 saídas cruas | 4 tokens |
| Raio / alvo | `--raio`, `--raio-gaveta`, `--alvo` | iguais |

Dois defeitos que a auditoria achou:

1. **O mesmo papel semântico tinha duas cores.** Tinta sobre papel de alerta era
   `#6b4a10` num lugar e `#5c3f0d` noutro; sobre papel de acerto, `#1c4a2b` e
   `#1b4529`. Consolidados no valor de maior contraste dos dois.
2. **A palavra no botão de apagar tinha 3,69:1** — abaixo do piso do próprio
   app. Passou a usar `--erro-papel`, que já existia e dá 5,97:1.

A escala de espaço saiu do que o arquivo já usava, não de uma razão inventada:
`1rem`, `0.85`, `0.7`, `0.6`, `0.5` e `0.4` concentravam metade das
declarações. Os 11 valores restantes eram vizinhos a 1 ou 2px — ruído — e foram
recolhidos ao degrau mais próximo. Conferido por impressão digital de layout
(`testes/impressao.mjs`): 66 caixas se moveram, **nenhuma mais de 3px**, e
nenhuma caixa apareceu ou sumiu.

**Dívida em aberto:** 92 `style={{}}` embutidos nas telas carregam decisões de
espaço que deveriam vir do sistema. Não foram migrados — cada um é uma decisão
local e migrar em massa sem olhar cada caso trocaria um problema por outro.

## Componente: Miniatura

A foto do item numa lista.

| Estado | Visual | Por quê |
|---|---|---|
| Com foto | a imagem, recortada na moldura | — |
| **Sem foto** | a moldura com o ícone da seção, apagado a 55% | Guarda o lugar. Numa lista em que alguns itens têm foto e outros não, sumir com a moldura faz cada cartão começar num lugar diferente e a lista perde o prumo. |

O desenho do vazio vem de fora (`vazia={<IconeAmostras />}`), para cada lista
mostrar o seu. É decoração e vai `aria-hidden`: o cartão já diz por escrito o
que é.

## Piso de acessibilidade (inegociável)

Confirmado pelo usuário e medido, não estimado:

- corpo a partir de 20px (`--escala` ajusta tudo em Ajustes);
- alvo de toque de 64px (`--alvo: 3.4rem`), inclusive nos botões de contador;
- contraste alto: a instrução fica em tinta quase preta sobre papel, o maior
  contraste da interface, justamente onde a vista cansa;
- todo botão com palavra escrita; ícone nunca sozinho;
- nenhuma ação atrás de deslizar ou apertar e segurar;
- confirmação por extenso antes de qualquer coisa irreversível;
- **nenhum estado comunicado só por cor** — cada um carrega palavra ou forma.

## Componentes

- **`.carreira-atual`** — a etiqueta. Papel, furo de fichário à esquerda,
  instrução em 1.5rem, amostra do fio com nome. É o coração da tela.
- **`.botao.principal`** — o puxador. Chapa de latão lisa com aresta gravada
  (luz na borda de cima, sulco escuro embaixo). Nunca imita metal com bisel e
  estrias: a página não desenha metal, então não finge.
- **`.sulco`** — o trilho de gavetas: quanto da peça já foi, com divisões
  marcadas e o que falta escrito em palavra ao lado.
- **`.cartao`** / **`.contador`** / **`.interruptor`** — frentes de gaveta.
  Elevação declarada **uma vez**: sombra, sem borda.
- **`.abas`** — o rodapé do móvel. A gaveta aberta ganha latão, friso no topo e
  a palavra em destaque. Quatro gavetas é o teto medido: no tamanho de letra
  "Maior" a palavra TRABALHOS pede 114px e uma quinta aba deixaria 67px. O
  rótulo tem teto em `vw` e `min-width: 0` justamente porque antes disso as
  quatro já somavam 433px numa tela de 375px.
- **`.opcoes.secoes`** — a tira que troca de seção dentro de uma tela. Grade de
  três colunas iguais com a contagem em linha própria: em flex, três seções
  quebravam e a terceira esticava até virar uma barra do tamanho de um botão
  principal.
- **`.contagem-amostra`** — o número que ela abre a biblioteca de amostras para
  ver. Algarismo tabular, para comparar cartões sem a contagem dançar.
- **`.aviso`** — papel enfiado na gaveta, com carimbo redondo à esquerda. Nunca
  barra de cor na lateral.

## Ícones

Conjunto autoral em `src/app/icones.tsx`, traço único de 1.6, sem preenchimento.
Nenhum emoji e nenhum caractere Unicode fazendo papel de ícone — cada aparelho
desenha o seu, e nenhum combina com o móvel.

Registro de duas tentativas falhas: novelo com retas cruzadas e novelo com arcos
**leem como sinal de proibido** no tamanho da aba. O ícone de Trabalhos virou
amostra de ponto meia, que não tem essa ambiguidade.

O ícone de Amostras é uma **régua**, e não um quadrado tricotado: o quadrado já
é o de Trabalhos e, lado a lado, os dois viravam o mesmo desenho. Cinco
candidatos foram desenhados e olhados a 26px antes de escolher — quadro com
régua embaixo e quadro com régua ao lado leem como televisão com pé, régua na
diagonal lê como seta de redimensionar, quadro com alfinetes nos cantos lê como
dado, e a fita métrica enrolada vira um "S".

## Movimento

Um momento autoral só: a gaveta que entra ao avançar a carreira
(`gaveta-entra`, 260ms, desaceleração exponencial). A chave `key={posicao}` em
`.carreira-atual` é o que faz o movimento reentrar a cada carreira.

Em `prefers-reduced-motion` **o movimento não é apagado, é trocado**. Antes era
`animation: none !important` em tudo, o que matava junto o retorno de que a
carreira mudou — e para quem trabalha com as duas mãos ocupadas, olhando de
relance, esse aviso é o próprio produto. Agora a carreira nova aparece com um
esmaecer curto de 160ms sem escorregar de lado, a sombra de rolagem continua
acendendo, e some só o deslize da gaveta e o afundar do botão sob o dedo.

Além dele, dois movimentos utilitários: o afundar de 120ms do botão sob o dedo e
o acender da sombra que diz "tem mais embaixo".

## O que os testes já corrigiram no desenho

A suíte de navegador alcança tudo por papel e por palavra visível, nunca por
classe de CSS. Isso não é higiene de teste: se um elemento não pode ser achado
pelo nome que mostra, quem usa leitor de tela também não o acha. Três mudanças
de interface saíram daí, e não de gosto:

- **`aria-valuetext` na barra de progresso.** Só com `aria-valuenow`, o leitor
  de tela anunciava uma porcentagem; agora diz "Carreira 5 de 39, faltam 34",
  igual ao que está escrito ao lado.
- **O rótulo da carreira virou `<h2>`.** Ele sempre foi o título da instrução
  que vem abaixo; agora quem navega por cabeçalhos pula direto para ele.
- **Os botões do cartão dizem qual trabalho.** "Continuar" se repetia em todos
  os cartões; o rótulo acessível passou a carregar o nome da peça. O botão do
  relógio virou "Retomar", que também desfaz a ambiguidade de dois "Continuar"
  com sentidos diferentes no mesmo app.

## Teto não alcançado

Registrado honestamente para quem continuar: nada é de fato **gravado** (o
numeral em latão pede baixo-relevo), não há ferragem de gaveta (espelho, trilho,
puxador de chapa), existe um só tipo de papel de etiqueta, e a luz de abajur é
um brilho radial de 5% onde a cena justificaria queda modelada.
