# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Mulheres que tricotam e fazem crochê, em português do Brasil. A usuária de
referência é a Camila; o produto agora mira também tricoteiras em geral, com
intenção comercial confirmada.

Faixa de idade e familiaridade com tecnologia variam muito, e boa parte do
público é mais velho ou pouco íntimo de celular — essa é a razão das regras de
acessibilidade abaixo, que o usuário confirmou como piso inegociável.

A situação de uso é específica e manda no desenho: **as duas mãos estão
ocupadas** segurando agulha e fio, o aparelho fica apoiado ao lado do trabalho,
e a interação acontece em toques rápidos entre uma carreira e outra. Muitas
vezes com a peça no colo, o que torna toque acidental um risco real.

## Product Purpose

Guardar as receitas de tricô e crochê da pessoa e acompanhá-la enquanto ela
trabalha: mostrar em que carreira está, contar pontos e carreiras, cronometrar
a peça e organizar o estoque de linhas e agulhas de casa.

Sucesso é ela conseguir trabalhar sem perder a conta e sem precisar de caderno
à parte.

## Positioning

O diferencial é o **interpretador de receitas em português**. Os concorrentes
(My Row Counter, Knittle, KnitCounter) contam carreiras mas não leem a receita,
e nenhum fala português. O Novelo:

- lê a receita de PDF, foto ou texto;
- expande as repetições em carreiras de verdade ("Trabalhar as carr 3 e 4 - 18
  vezes" vira 18 passadas navegáveis);
- mostra só os números do tamanho que ela escolheu, entre os vários que a
  receita traz na mesma linha;
- confere a contagem de pontos quando a receita permite — e **admite quando não
  permite**, em vez de inventar número.

## Operating Context

- Receita chega em PDF (o mais comum), print do Instagram, foto, ou texto.
- Receita profissional de tricô é escrita em blocos com numeração que recomeça
  a cada parte (Decote, Cavas, Mangas), instruções relativas a marcadores ("M
  até o Marc 1"), e vários tamanhos na mesma linha ("84 (92, 100, 110) M").
- Uma peça leva dias ou semanas, em muitas sessões curtas.
- Aparelhos reais incluem iPad e iPhone com Safari desatualizado.

## Capabilities and Constraints

Funciona: receitas com foto e conferência ao vivo; modo trabalho com carreira
atual, próxima e recados; contadores vinculados com reinício automático;
lembretes por carreira; trava de contagem; cronômetro por sessão com histórico;
inventário de linhas e agulhas; calculadora de amostra; cópia de segurança;
escolha de tamanho.

Restrições confirmadas:

- **Sem servidor.** Tudo mora no aparelho (IndexedDB), funciona offline.
- Dados preparados para migrar para nuvem depois (UUID, marcas de tempo,
  `donoId`, exclusão por marcação, acesso só via `dados/repositorio.ts`).
- Publicado como site estático em GitHub Pages, instalável como PWA.
- Sem háptico no iPhone (Safari não expõe); o retorno é sonoro.
- Sem Apple Watch e sem widget — exigiriam app nativo.
- Precisa suportar Safari anterior ao 17.4 (polyfills em `nucleo/polyfills.ts`).

## Brand Commitments

Nome: **Novelo**. Voz em português do Brasil, direta e sem jargão de
computador — a interface fala de carreiras, pontos, linhas e agulhas, nunca de
"registros" ou "sincronizar".

Paleta: papel claro e marrom de barro, com tema escuro seguindo o aparelho. Um
redesenho para um mundo de nogueira e latão foi tentado e **desfeito a pedido do
dono do projeto** — a paleta clara é a decisão, não um estado provisório.

## Evidence on Hand

- Duas receitas reais da Camila (PDFs de tricô profissional, autoria Cristiane
  Bertoluci) usadas para validar o interpretador. São material de teste, não
  conteúdo do produto — não podem ser distribuídas.
- 50 testes automatizados, escritos a partir das linhas reais dessas receitas.
- Nenhum depoimento, número de usuárias ou dado de mercado. Não inventar.

## Product Principles

1. **Nunca inventar número.** Quando a contagem não pode ser apurada, dizer
   isso e mostrar a receita como está escrita. Número errado dito com confiança
   estraga a peça e faz a culpa parecer dela.
2. **A situação manda.** Mãos ocupadas, aparelho apoiado, toques rápidos entre
   carreiras. Nada que exija precisão de dedo ou atenção longa.
3. **A receita dela é a fonte da verdade.** O app acompanha e organiza; não
   reescreve nem substitui o que a autora escreveu.
4. **Nada se perde.** Trabalho de semanas: posição, tempo e contagem precisam
   sobreviver a fechar o app, trocar de versão e trocar de aparelho.
5. **Explicar, não sumir.** Quando algo não está disponível, dizer o que falta
   e como conseguir, em vez de esconder a opção.

## Accessibility & Inclusion

Piso inegociável, confirmado pelo usuário neste redesenho:

- corpo de texto a partir de 20px, com ajuste para maior nos ajustes;
- área de toque mínima de 64px;
- contraste alto em todo texto — nada de cinza claro sobre claro;
- todo botão com palavra escrita; ícone nunca sozinho;
- nenhuma ação escondida atrás de deslizar ou apertar e segurar;
- confirmação por extenso antes de qualquer coisa irreversível.

A beleza deve ser construída **dentro** dessas regras, não à custa delas.

## Biblioteca de amostras

Guarda a resposta de "com esta linha e esta agulha, quantos pontos cabem em 10
cm?" — a conta que decide se a peça sai do tamanho certo. Cada registro tem a
contagem, o material usado, se foi blocada e, quando foi, a contagem e o tamanho
depois de blocar.

Mora em Materiais e não em Receitas de propósito: a amostra é o resultado de uma
**combinação de materiais** e é consultada antes de escolher a receita. Em
Receitas ela encostaria na amostra que a receita exige — dois números diferentes
com o mesmo nome, exatamente a confusão que o app existe para desfazer.

Quando a amostra é blocada, é a contagem de depois que aparece no cartão: usar a
de antes faz a peça sair errada. Marcada como blocada sem medida ainda não
anotada, o cartão mostra a contagem de antes e escreve "Blocada, falta medir" —
nunca inventar número continua sendo a regra.
