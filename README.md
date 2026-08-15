# Novelo

App de tricô e crochê: guarda as receitas, lê a receita carreira por carreira,
conta pontos e carreiras, marca o tempo de cada peça e organiza o estoque de
linhas e agulhas de casa.

Funciona offline, instala na tela do celular e não depende de servidor nenhum.

## Rodar

```bash
npm install
npm run dev
```

Outros comandos: `npm test` (testes do interpretador e da amostra),
`npm run build` (versão de produção), `npm run preview`.

## Como está montado

```
src/
  nucleo/          regras que não dependem de tela
    lexico.ts        pontos de crochê e tricô em PT-BR, com o que cada um consome e produz
    interpretador.ts lê o texto da receita e devolve as carreiras expandidas
    amostra.ts       conversão de amostra (quantos pontos montar)
    tipos.ts         modelo de dados
  dados/           persistência
    banco.ts         tabelas no IndexedDB (Dexie)
    repositorio.ts   ÚNICA porta de acesso a dados
    backup.ts        cópia de segurança em arquivo
  app/             telas em React
```

### O interpretador

É o que diferencia o app dos contadores de carreira do mercado: nenhum deles lê a
receita, todos só contam. Este entende, em português:

| Escrito assim | O app entende |
| --- | --- |
| `Carr 1: 6 pb no anel mágico = 6` | 6 pontos baixos, não consome nada, termina com 6 |
| `Carr 2: 1 aum em cada ponto = 12` | expande usando a contagem da carreira anterior |
| `Carr 3: (1 pb, 1 aum) x6 = 18` | repetição por parênteses |
| `Carr 7: *2 pb, 1 aum* repetir 6 vezes` | repetição por asterisco |
| `Carr 4-6: 1 pb em cada ponto` | um bloco que vale por três carreiras |
| `Carr 5: 1 pb, *1 aum, 2 pb* até o fim` | calcula quantas voltas cabem no que sobrou |
| `2 m juntos`, `3 pa no mesmo ponto`, `pular 2 pontos` | diminuição, aumento e pontos pulados |

Cada ponto declara quanto **consome** da carreira anterior e quanto **produz** na
nova. Dessa dupla sai a contagem automática — e a conferência: quando a receita
declara `= 24` e a conta dá outro número, o app avisa antes de a peça sair errada.

## Decisões que valem saber

**Dados prontos para migrar.** Hoje tudo mora no aparelho, mas todo registro tem
UUID (nunca id sequencial, que colide entre dois aparelhos offline), marcas de
tempo, `donoId` e exclusão por marcação em vez de remoção. Nenhuma tela fala com
o banco direto: tudo passa por `dados/repositorio.ts`. Ligar sincronia na nuvem
depois é reescrever esse arquivo, não as telas.

**Interface para quem tem vista cansada.** O público desse tipo de app costuma
ser mais velho e pouco íntimo de celular. Então: letra base de 20px com ajuste
para maior, contraste alto, área de toque mínima de 64px, todo botão com palavra
escrita (ícone nunca sozinho), nenhuma ação escondida atrás de deslizar, e
confirmação por extenso antes de qualquer coisa que não dá para desfazer.

## Limites conhecidos

- **Sem vibração no iPhone.** O Safari não expõe háptico para app web; o retorno
  é sonoro. No Android a vibração funciona.
- **Sem Apple Watch e sem widget de tela bloqueada.** Isso exigiria app nativo.
- O comando por voz depende do reconhecimento do navegador e não existe em todos.
