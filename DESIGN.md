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

| Papel | Token | Pilha |
|---|---|---|
| Leitura (a instrução) | `--leitura` | Charter, Iowan Old Style, Palatino, Georgia, serif |
| Gravado (rótulo, número, botão) | `--gravado` | Avenir Next Condensed, Avenir Next, Helvetica Neue |
| Medida | `--medida` | ui-monospace, SF Mono, Menlo |

Rótulos em caixa alta com entreletra de 0.04–0.09em; a instrução em serifa com
medida máxima de 30ch. Números com `tabular-nums` para não dançar ao contar.

**Dívida conhecida:** nenhuma fonte pôde ser hospedada neste ambiente. Em Apple
as pilhas caem em faces com caráter de verdade; em Android e Windows caem em
Georgia e Roboto, e a voz gravada deixa de existir. Para venda no Brasil, isto é
a maioria do mercado — hospedar uma face própria é o próximo passo real.

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
  a palavra em destaque.
- **`.aviso`** — papel enfiado na gaveta, com carimbo redondo à esquerda. Nunca
  barra de cor na lateral.

## Ícones

Conjunto autoral em `src/app/icones.tsx`, traço único de 1.6, sem preenchimento.
Nenhum emoji e nenhum caractere Unicode fazendo papel de ícone — cada aparelho
desenha o seu, e nenhum combina com o móvel.

Registro de duas tentativas falhas: novelo com retas cruzadas e novelo com arcos
**leem como sinal de proibido** no tamanho da aba. O ícone de Trabalhos virou
amostra de ponto meia, que não tem essa ambiguidade.

## Movimento

Um momento autoral só: a gaveta que entra ao avançar a carreira
(`gaveta-entra`, 260ms, desaceleração exponencial). A chave `key={posicao}` em
`.carreira-atual` é o que faz o movimento reentrar a cada carreira. Silenciado
por completo em `prefers-reduced-motion`.

## Teto não alcançado

Registrado honestamente para quem continuar: nada é de fato **gravado** (o
numeral em latão pede baixo-relevo), não há ferragem de gaveta (espelho, trilho,
puxador de chapa), existe um só tipo de papel de etiqueta, e a luz de abajur é
um brilho radial de 5% onde a cena justificaria queda modelada.
