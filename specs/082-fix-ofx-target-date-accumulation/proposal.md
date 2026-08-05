# Proposal: Fix OFX Target Date Accumulation (082)

## O Problema (Root Cause Analysis)
O usuário relatou que, mesmo após a remoção da duplicação da maquininha, o "Entradas OFX (Fechamento)" continua em R$ 107.163,34, criando uma disparidade irreal com o "Apurado Sistema" que é apenas R$ 16.656,10 para o dia selecionado (04/08/2026).

Após uma investigação minuciosa somando o conteúdo bruto dos arquivos OFX providos, confirmou-se que o valor R$ 107.163,34 **não é um bug de duplicação** (pois a soma de todas as entradas válidas dos 10 arquivos OFX é exatamente R$ 107.163,34). O problema é um **bug de atribuição de datas (Accumulation Bug)**.

Os arquivos OFX do usuário contêm transações de múltiplos dias (ex: 02/08 a 04/08).
Atualmente, o `CentralImportWizard.tsx` atribui cegamente o dia que o usuário selecionou na tela (ex: `target_date = "2026-08-04"`) para **todas** as transações contidas no arquivo, não importa quando elas realmente aconteceram.

Isso significa que as vendas liquidadas nos dias 02, 03 e 04 estão sendo concentradas e somadas artificialmente no dia 04. Quando o Dashboard do dia 04 abre, ele puxa todas as `transactions` onde `target_date = "2026-08-04"`, resultando num faturamento hiper-inflado (3+ dias de vendas em 1 só dia).

### A UI Confusion (Aba Resumo Dia)
Outro erro grave de UI agrava o pânico: Na aba de Conciliação Diária (`ResumoDiaPanel.tsx`), o Card principal diz `SALDO BANCO ITAÚ`. No entanto, o valor exibido não é o saldo da conta (`rawBalance`), mas sim a SOMA DAS ENTRADAS (`totalBancarioIn` -> 107.163,34). O usuário lê o card achando que é o saldo real, mas vê o somatório de vendas do mês inteiro acumuladas naquele dia.

## A Solução (Step-by-Step)

1. **Backend (CentralImportWizard.tsx)**:
   - Alterar a propriedade `target_date` do `.push()` na tabela `transactions`. 
   - Ao invés de forçar `targetDate` para tudo, usaremos a data real da transação (`tx.date.split('T')[0]`), usando `targetDate` apenas como fallback caso o OFX venha quebrado.
   - Isso distribui as transações corretamente no tempo. Ao acessar o Dashboard do dia 04, apenas as transações do dia 04 serão somadas.
2. **Frontend (ResumoDiaPanel.tsx)**:
   - Corrigir a UI enganosa. O Card `SALDO BANCO ITAÚ` deve exibir `totalBancarioRaw` (o saldo final real da conta informado pela tag `<LEDGERBAL>` do OFX), e não a soma das entradas (`totalBancarioIn`). 

## Riscos e Mitigações
- **Risco**: Transações passadas de conciliações já fechadas podem mudar de data ao serem reimportadas? 
  - **Mitigação**: O `upsert` na tabela `transactions` protege isso se a constraint existir, mas a re-distribuição é de fato o comportamento correto (arrumando dados do passado).
- **Risco**: E se a data da transação do OFX for `undefined`?
  - **Mitigação**: Fallback para `targetDate` (como ocorre hoje).

---
*Gerado por Antigravity (Vibe Coding)*
