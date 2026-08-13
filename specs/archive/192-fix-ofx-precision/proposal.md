# Proposal: fix-ofx-precision-jabaquara-kennedy-and-ui-labels (192)

## Problema
Dois problemas interligados estão prejudicando a conferência da conciliação global com a planilha manual:
1. **Perda de Precisão em Dízimas (Jabaquara / Kennedy)**: Valores de extrato bancário importados via arquivo OFX que terminam em uma única casa decimal (como Jabaquara `39851.9` e Kennedy `458.5`) perdem a precisão de sua grandeza. Ao passar pelo parse/sanitize genérico, a conversão incorreta gera fatores de 10x de erro (tornando `39.851,90` em `3.985,19`).
2. **Labeling Incorreto**: Na tabela "Fechamento por Loja", a coluna exibindo o saldo real das contas importadas (`bank_total`) está nomeada de forma incorreta como "Faturam. Banco", o que não reflete a planilha de conciliação manual (onde é referenciado com precisão como "Saldo Banco Itaú").

## Solução Proposta
1. **Refatoração do Extrator `<BALAMT>` no `ofxParser.ts`**: Desacoplar a leitura do saldo bancário de sanitizações genéricas (`extractNumber`), que tendem a mascarar a precisão de casas decimais faltantes ou remover pontos preciosos. Implementaremos o algoritmo estrito:
   - Substituir vírgula por ponto.
   - Usar `parseFloat` nativo para prender a dízima.
   - Elevar e arredondar matematicamente para centavos (ex: `* 100`) para travar o valor monetário integral, e então recuar (`/ 100`) para salvar na coluna do banco de forma segura.
2. **Mudança Semântica na Tabela**: No painel de index da conciliação (`src/routes/conciliacao.index.tsx`), substituir visualmente o cabeçalho/card de "Faturam. Banco" para "Saldo Banco Itaú" na listagem por loja, alinhando a nomenclatura ao que é utilizado nas consolidações manuais (R$ 106.327,07).

## Contratos de Dados
- Nenhuma alteração estrutural nas RPCs ou Views. O parser injetará o valor de forma fidedigna.

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** O ajuste de parser só afetará novas importações ou fechamentos recalculados.
