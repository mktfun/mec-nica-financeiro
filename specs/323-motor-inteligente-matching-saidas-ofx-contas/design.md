# Design: Motor Inteligente de Matching de Saídas OFX x Contas a Pagar e Sincronização Reativa (323)

## Arquitetura e Fluxo de Dados

```
1. CentralImportWizard (Step 3: Preview -> Avançar)
   │
   ▼ [Processar e Conciliar com IA]
   ├── 1. Inserção no banco: patio_os, pos_transactions, ofx_transactions, daily_manual_bills
   ├── 2. RPC auto_match_transactions (Pareia PIX -> OS e REDE -> OS)
   ├── 3. RPC auto_match_saidas (Pareia Débitos OFX -> Contas a Pagar em 4 Camadas)  <-- [NOVO]
   └── 4. Gemini IA Reconciliação Pericial
   │
   ▼
2. Step 5: Step2NonRevenueJustifications (Tela B)
   │
   ▼ [React Query: Busca Transações Reais Pendentes no Supabase]
   ├── SELECT * FROM ofx_transactions WHERE target_date = :date AND type = 'out' AND matched_bill_id IS NULL
   │
   ├── Se todas as 47 saídas casaram no auto_match_saidas:
   │    └── Exibe: "Nenhuma saída bancária órfã pendente! (0/47)"
   │
   └── Se houver débitos residuais não listados no contas a pagar:
        └── Exibe apenas os débitos reais para categorização / despesa extra / vínculo manual
```

## Mutações em Arquivos Existentes [MODIFY]

### 1. `supabase/migrations/20260831000009_enhanced_auto_match_saidas.sql`
- Implementa motor heurístico de 4 camadas na RPC `public.auto_match_saidas`.

### 2. `src/components/importacoes/CentralImportWizard.tsx`
- Adiciona execução de `auto_match_saidas(targetDate)` no pipeline de processamento em lote.

### 3. `src/components/importacoes/wizard/Step2NonRevenueJustifications.tsx`
- Substitui a leitura de `results.ofxResults` em memória por consulta reativa ao Supabase de débitos e créditos com `matched_bill_id IS NULL` e `matched_os_number IS NULL`.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)

### Cenário 1: Auto-Matching em Lote de 47 Boletos com Débitos OFX
- **SCAN:** 47 contas importadas de `BuscaContasAPagar.xls` (total R$ 48.563,79) e 47 débitos nos extratos bancários de 2026-08-28.
- **INFER:** O pipeline executa `auto_match_saidas`. O motor de 4 camadas correlaciona valores e nomes de fornecedores (`OFICINA INTELIGENTE`, `RAVEN`, `PRPK`, `SISPAG`, etc.).
- **VERIFY:** A RPC retorna `matched_saidas_count >= 40`. No Step 5, a contagem de "Saídas Órfãs" cai para 0 (ou apenas o resíduo não cadastrado).
- **FIX:** Nenhuma despesa duplicada ou classificada incorretamente.

### Cenário 2: Débito com Juros / Variação Leve de Centavos
- **SCAN:** Débito de R$ 2.398,90 para PRPK e conta cadastrada de R$ 2.395,00.
- **INFER:** A Camada 2 identifica o token "PRPK" e variação $le 	ext{R$} 5{,}00$.
- **VERIFY:** O débito é casado automaticamente com a conta a pagar.
