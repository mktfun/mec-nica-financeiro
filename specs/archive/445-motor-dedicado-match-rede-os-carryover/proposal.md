# Spec 445 — Motor Dedicado de Match Rede × OS por Loja (Valor Bruto Direto)

## 1. Problema Real

No fluxo diário, o operador sobe os relatórios de OS da oficina e os relatórios de vendas da Rede (maquininhas).
Dentro dos relatórios de OS, existem lançamentos novos e atualizações de ordens em aberto: pagamentos em Dinheiro, PIX ou Cartão (Crédito/Débito).
Ao mesmo tempo, cada transação da Rede possui um **Valor Bruto** (`gross_amount`) registrado na maquininha daquela loja específica.

Hoje, o matching automático falha ou deixa transações órfãs porque:
1. **Regras temporais arbitrárias e restritivas:** Existiam filtros rígidos de "7 dias de fechamento" (`closed_at >= target - 7 days`), impedindo que OSs abertas no início do mês ou faturadas no período do relatório casassem com a transação de cartão.
2. **Mistura de responsabilidades:** O batimento de cartão estava embutido dentro de rotinas que misturam OFX, despesas e transferências entre contas.
3. **Falta de clareza do que sobrou:** Quando uma venda de cartão da Rede não casa, o operador precisa saber com 100% de certeza se:
   - Houve **colisão** (duas OSs com o mesmo valor exato na mesma loja), ou
   - **Não existe nenhuma OS** cadastrada naquela loja com aquele valor (venda de balcão sem OS ou OS ainda não lançada pelo consultor).

---

## 2. Solução Direta e Objetiva

Criar/evoluir a função dedicada de matching de cartões:
`public.match_stage2_rede_os(p_target_date date, p_store_id text DEFAULT NULL)`

### Regra Central de Negócio:
Para cada transação de cartão da Rede do dia/lote da loja X:
1. Pegar o **Valor Bruto (`gross_amount`)** da transação da Rede.
2. Buscar na tabela `patio_os` da **MESMA LOJA** (`store_id = store_id`):
   - A OS possui lançamento de cartão cujo valor bate com o Bruto da Rede?
     - `ABS(credit_value - gross_amount) <= 0.05` OU
     - `ABS(debit_value - gross_amount) <= 0.05` OU
     - `ABS(credit_debit_value - gross_amount) <= 0.05` OU
     - `ABS(total_value - paid_value - gross_amount) <= 0.05` (saldo em aberto da OS)
   - **Sem corte artificial de 7 dias:** Se a OS existe no sistema para aquela loja, não está casada (`match_status <> 'MATCHED'`) e tem o valor do cartão, ela é elegível.
3. **Decisão Determinística:**
   - **Match Único (1:1):** Exatamente 1 OS encontrada $\to$ Vincula imediatamente:
     - `pos_transactions.matched_os_number = patio_os.os_number`
     - `patio_os.match_status = 'MATCHED'`
     - `pos_transactions.settlement_status` permanece `'a_compensar'` (não mexe no saldo do banco).
   - **Colisão (>1 OSs com mesmo valor):** O sistema **NÃO chuta**. Registra o status `collision` com a lista das OSs candidatas para o operador clicar e escolher com 1 clique na interface.
   - **Órfão Comprovado (0 OSs encontradas):** O sistema confirma e carimba:
     `PROVADO_INEXISTENTE: Nenhuma OS nesta loja possui lançamento de cartão com o valor R$ X`.

---

## 3. Contratos de Dados & Retorno da RPC

```sql
CREATE OR REPLACE FUNCTION public.match_stage2_rede_os(
    p_target_date date,
    p_store_id text DEFAULT NULL
)
RETURNS jsonb
```

### Formato do Retorno JSON:
```json
{
  "success": true,
  "target_date": "2026-09-16",
  "matched_count": 14,
  "collisions_count": 1,
  "exhausted_orphans_count": 3,
  "collisions": [
    {
      "pos_id": "...",
      "store_id": "st-emporio",
      "gross_amount": 2000.00,
      "payment_method": "Crédito à Vista",
      "candidates": [
        { "os_number": "40342", "client_name": "...", "total_value": 2000.00 },
        { "os_number": "40370", "client_name": "...", "total_value": 2694.00 }
      ]
    }
  ],
  "exhausted_orphans": [
    {
      "pos_id": "...",
      "store_id": "st-jabaquara",
      "gross_amount": 89.90,
      "reason": "PROVADO_INEXISTENTE: Nenhuma OS na loja Jabaquara possui lançamento de cartão de R$ 89,90"
    }
  ],
  "totals": {
    "rede_bruto": 48234.98,
    "rede_liquido": 46800.12,
    "rede_taxas": 1434.86
  }
}
```

---

## 4. Blast Radius (Arquivos Afetados)

1. **`supabase/migrations/20260929000001_evolve_match_stage2_rede_os.sql` (Novo)**
   - Remove o corte artificial de 7 dias (`closed_at >= target - 7d`).
   - Implementa busca direta de Valor Bruto da Rede $\leftrightarrow$ Cartão da OS na mesma loja.
   - Gera lista de colisões reais e lista de órfãos comprovados com garantia formal de inexistência.
   - Vinculação informativa: marca `matched_os_number` e `match_status = 'MATCHED'`, sem liquidar indevidamente o banco.

2. **`src/components/importacoes/manual/Fase2RedeVsOsReview.tsx`**
   - Atualiza a recepção do resultado da RPC para ler `exhausted_orphans` e exibir badges claros:
     - Verde: Casado direto.
     - Amarelo: Colisão (com botão de escolha rápida de OS).
     - Cinza escuro: Órfão comprovado (com garantia de inexistência de OS na loja).

3. **`src/components/importacoes/CentralImportWizard.tsx`**
   - Garante que ao rodar o motor na Fase 2 ou ao finalizar a ingestão, a RPC seja chamada passando a data contábil do lote.

---

## 5. Verificação e Critérios de Sucesso

1. **Terminal Gate:** `npm run build` executando com zero erros de tipagem.
2. **Teste contra Benchmark Real (17-09):**
   - Venda de R$ 1.768,50 em Santo André $\to$ Casa com OS #2438.
   - Venda de R$ 694,00 em Piraporinha $\to$ Casa com OS #40370.
   - Venda de R$ 2.000,00 em Piraporinha $\to$ Registra colisão (#40342 e #40370) sem chutar.
   - Vendas avulsas sem OS na loja $\to$ Marcadas como `exhausted_orphan` com garantia categórica.
