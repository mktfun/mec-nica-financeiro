# Spec 420 — Design: Arquitetura de Idempotência e Ciclo de Vida do Cofre

## Arquitetura de Fluxo Ponta a Ponta

```
[Importação de Planilhas de OS (*ConferenciaOSxFinanceiro.xls)]
                         │
                         ▼
        [savePatioOsAndReceivables (useImportProcessor.ts)]
                         │
                         ├─► Filtra OSs com pagamento em Dinheiro
                         │
                         ▼
         [Checagem de Idempotência Global no Cofre]
         supabase.from('store_cash_vault')
           .select('id, status, amount')
           .eq('store_id', storeId)
           .eq('os_number_ref', osNumRef)  // SEM FILTRO DE DATA!
                         │
        ┌────────────────┴────────────────┬────────────────┐
        ▼                                 ▼                ▼
[Já Existe: 'depositado']        [Já Existe: 'em_transito']   [Não Existe]
        │                                 │                │
        ├─► IGNORA (Já baixada!)          ├─► Atualiza R$  ├─► Insere 'em_transito'
        └─► ZERO DUPLICATAS!              └─► Não duplica  └─► Data real da OS
                         │
                         ▼
             [Step 3: Wizard Cofre]
                         │
                         ├─► Lista APENAS o dinheiro verdadeiramente novo/em aberto
                         │   (ex: Apenas OS 620 de R$ 500,00 da Dom Pedro)
                         │
                         ▼
             [Confirmar Recolhimento]
                         │
                         ├─► supabase.update({ status: 'depositado' })
                         ├─► queryClient.invalidateQueries(['store-cash-vault-em-transito'])
                         └─► Tela atualiza na hora com feedback visual imediato!
```

---

## Interfaces TypeScript Reais

### `StoreCashVaultRow`
```typescript
export interface StoreCashVaultRow {
  id: string;
  store_id: string;
  os_number_ref?: string | null;
  amount: number;
  description: string;
  entry_date: string;
  status: 'em_transito' | 'depositado' | 'pending';
  notes?: string | null;
  created_at: string;
  updated_at?: string | null;
}
```

---

## Cenários Obrigatórios

### 1. Happy Path (Importação de Dia Seguinte com OSs Anteriores Já Baixadas)
- **Cenário:** O usuário importa no dia 18/09 a planilha `1848_ConferenciaOSxFinanceiro.xls` (Piraporinha). Ela contém a OS 40357 (R$ 3.000 em dinheiro), fechada em 17/09 e já baixada/depositada.
- **Comportamento Esperado:** O importador detecta que a OS 40357 na loja Piraporinha já existe com `status: 'depositado'`. Ela **NÃO** é inserida novamente. O Step 3 não exibe essa OS e o valor do cofre não é duplicado.

### 2. Edge Case (Nova OS em Dinheiro Fechada Hoje)
- **Cenário:** A planilha `897_ConferenciaOSxFinanceiro.xls` contém a OS 620 (R$ 500,00 em dinheiro), fechada em 18/09.
- **Comportamento Esperado:** O importador não encontra nenhuma entrada prévia para a OS 620 na loja Dom Pedro. Ela é inserida com `status: 'em_transito'`. No Step 3, o usuário vê com clareza **apenas** a OS 620 como pendente de conferência. Ao dar baixa, a lista é limpa reativamente via React Query.

---

## Critérios de Aceitação Verificáveis
1. **Idempotência no Re-Processamento:** Executar a importação de planilhas contendo OSs antigas não gera nenhuma nova linha em `store_cash_vault` para OSs já existentes.
2. **Saneamento do Banco:** As 16 linhas duplicadas geradas acidentalmente em 18/09 para OSs que já estavam depositadas em 17/09 são removidas, mantendo apenas o registro original de 17/09 e o registro legítimo da OS 620 em 18/09.
3. **Reatividade no Wizard:** Ao clicar em "Confirmar Recolhimento" no `Step3CashVaultDaniel.tsx`, o cache é invalidado e a tabela reflete o novo estado instantaneamente.
4. **Build Limpo:** `npm run build` passa com exit code 0.
