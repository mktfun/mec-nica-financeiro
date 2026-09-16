# Design: Correção do Faturamento com Despesas Indevidas, Idempotência do Cofre e Desduplicação do Dinheiro Manual (405)

## 1. Arquitetura e Fluxo de Dados

```
                     ┌─────────────────────────────────────────────────┐
                     │          Origem dos Dados Financeiros           │
                     └────────────────────────┬────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
┌──────────────────┐               ┌───────────────────────┐            ┌──────────────────────┐
│  Extrato OFX     │               │  Conferência OSs      │            │  Entradas Manuais    │
│  Itaú (Bancos)   │               │  Oficina Inteligente  │            │  Conferidas          │
└────────┬─────────┘               └──────────┬────────────┘            └──────────┬───────────┘
         │                                    │                                    │
         │ (Saldo Real das Contas)            │ (Vendas / Odômetro)                │ (Dinheiro MP / Caixa)
         ▼                                    ▼                                    ▼
┌──────────────────┐               ┌───────────────────────┐            ┌──────────────────────┐
│ Card 1:          │               │ Faturamento Oficial   │            │ Card 2:              │
│ Saldo Bancos OFX │               │ Odômetro / OI Base:   │            │ Dinheiro MP Manual   │
│ + Maquininhas    │               │ R$ 46.931,21          │            │ R$ 19.526,00         │
│ Pendentes        │               │ (Salários de R$ 24k   │            │ (Sem duplicação com  │
│ (Sem sobrepor    │               │  estritamente fora!)  │            │  o cofre no Card 1)  │
│  cofre duplicado)│               │                       │            │                      │
└────────┬─────────┘               └──────────┬────────────┘            └──────────┬───────────┘
         │                                    │                                    │
         └────────────────────────────────────┼────────────────────────────────────┘
                                              │
                                              ▼
                           ┌─────────────────────────────────────┐
                           │    ResumoDiaPanel.tsx (Cálculo SSOT)│
                           │                                     │
                           │    Caixa Atual Consolidado          │
                           │    Fluxo de Caixa Líquido           │
                           │    Diferença Final Canônica         │
                           └─────────────────────────────────────┘
```

---

## 2. Mutações em Arquivos Existentes [MODIFY]

### 2.1. `src/hooks/useJustifiedTransactions.ts` [MODIFY]
- **Adicionar coluna `type` na query de `ofx_transactions`:**
  `.select('id, store_id, bank_name, counterpart_name, amount, type, occurred_at, target_date, manual_category, manual_justification, matched_os_number')`
- **Inversão do Paradigma de Impacto no Faturamento (Estritamente Opt-In):**
  ```typescript
  const checkImpactsRevenue = (cat?: string, just?: string, isCredit?: boolean) => {
    // 1. Se for débito/saída (despesas, contas pagas, salários, tarifas), NUNCA impacta faturamento
    if (!isCredit) return false;

    const c = String(cat || '').toLowerCase();
    const j = String(just || '').toLowerCase();

    // 2. Modelo opt-in: apenas transações de crédito expressamente marcadas como Receita Extra somam ao Faturamento
    if (c.includes('receita extra') || j.includes('[receita extra]') || c.includes('venda avulsa')) {
      return true;
    }

    // Por padrão, justificativas em extrato servem para conciliação contábil e NÃO inflam o faturamento
    return false;
  };
  ```

---

### 2.2. `src/components/conciliacao/ResumoDiaPanel.tsx` [MODIFY]
- **Desduplicação entre Card 1 (`derivedBankTotals`) e Card 2 (`dinheiroMpValor`):**
  - No cálculo de `derivedBankTotals.totalPositivoConsolidado`:
    Se o fechamento possui `dinheiroMpValor > 0` (input manual do operador conferido), o `dinheiro_lojas` do cofre não deve ser somado cumulativamente no Card 1 para evitar contagem dupla de dinheiro físico.
    Assim, quando o operador dá baixa nas OSs do cofre, o cofre sai de pendente sem causar oscilações artificiais no banco nem duplicar com o manual.

---

### 2.3. `src/components/conciliacao/BaixaDinheiroModal.tsx` [MODIFY]
- **Eliminar atualização manual duplicada em `reconciliations`:**
  - Remover o trecho `await supabase.from('reconciliations').update({ bank_total: ... })` (linhas 184-189).
  - Garantir que a RPC `dar_baixa_dinheiro` apenas marque as entradas em `store_cash_vault` como `depositado` sem inflar indevidamente o extrato bancário se este já estiver conciliado via OFX.

---

### 2.4. `src/hooks/useImportProcessor.ts` [MODIFY]
- **Preservação de status de cofre em reimportações:**
  - Ao processar OSs pagas em dinheiro físico, verificar se a OS já existe na tabela `store_cash_vault`.
  - Se já existir com status `'depositado'`, **NÃO reabrir como `'em_transito'`**, garantindo que baixas já efetuadas persistam mesmo após reprocessamento do arquivo.

---

### 2.5. `src/hooks/useBackendConciliacao.ts` [MODIFY]
- **Incluir `is_closed` na query de `daily_snapshots`:**
  - Linha 298: adicionar `is_closed` no `.select()`, blindando snapshots fechados e o Marco Zero (15/09/2026).

---

## 3. Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Expurgo de Salários e Faturamento Limpo em 16/09/2026
- **[SCAN]:** Abrir o dia 16/09/2026.
- **[INFER]:** Com o modelo opt-in, os R$ 24.966,67 de salários SISPAG não devem ser classificados como receita.
- **[VERIFY]:** O Faturamento do Dia no painel exibe exatamente **R$ 46.931,21** (valor oficial do Odômetro).

### Cenário 2: Desduplicação do Dinheiro Manual vs Cofre
- **[SCAN]:** Verificar se há valor preenchido em `Dinheiro MP` (ex: R$ 19.526,00) e simultaneamente registros em `store_cash_vault`.
- **[INFER]:** O sistema não deve somar R$ 19.526 + R$ 23.578 no Caixa Atual. O dinheiro manual é o montante físico real sob custódia.
- **[VERIFY]:** Ao dar baixa no cofre, os itens mudam para `depositado`, sumindo da lista de pendências sem duplicar no banco nem alterar o Caixa Atual indevidamente.

### Cenário 3: Idempotência de Reimportação
- **[SCAN]:** Marcar uma OS como `depositado` em `store_cash_vault`.
- **[INFER]:** Reimportar o arquivo de OSs daquela data.
- **[VERIFY]:** O registro permanece com status `depositado`, não retornando para `em_transito`.

### Cenário 4: Imunidade de Regressão no Marco Zero (15/09/2026)
- **[SCAN]:** Acessar a data 15/09/2026.
- **[VERIFY]:** Todos os valores (Caixa R$ 237.345,54, Faturamento R$ 45.879,99, Diferença -R$ 10,70) permanecem 100% congelados e íntegros.
