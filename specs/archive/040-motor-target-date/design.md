# Spec 040 - Design de Integração Target Date

## 1. Banco de Dados (Supabase)
### Alteração na tabela `transactions`
Adicionar coluna: `target_date DATE NOT NULL DEFAULT CURRENT_DATE`.

### Alteração na Trigger `update_reconciliation_bank_total`
- Onde antes ela lia: `v_date := DATE(NEW.occurred_at);`
- Passará a ler: `v_date := NEW.target_date;`
Isso garante que o Agrupador Noturno colecionará os valores baseando-se no Lote (Target Date) no qual o usuário enfiou o arquivo, ignorando o passado do calendário.

## 2. Motor de Importação (React)
- **`WizardImportacao.tsx`**: Quando gerar a lista de `txsToInsert`, incluir a propriedade `target_date: targetDate`.
- **`useImportProcessor.ts` (Pátio)**: Na montagem do payload para a tabela `transactions`, incluir a propriedade `target_date: date` e restaurar/manter `occurred_at: new Date().toISOString()` para preservar quando o lançamento ocorreu de verdade.

## 3. Tela de Conciliação
- **`useTransactions.ts`**: Alterar a query `useDailySystemBalance` de `.gte('occurred_at')` para `.eq('target_date', targetDate)`.
- **`conciliacao.tsx`**: Alterar a linha `const totalSistema = detalhes.reduce((acc, r) => acc + (r.financial_total || 0), 0);`
Para: `const totalSistema = Object.values(dailyBalances || {}).reduce((acc, val) => acc + Number(val), 0);`
Isso usa as balanças recém-computadas (Entradas - Saídas) de cada loja em vez de um cache falho.
