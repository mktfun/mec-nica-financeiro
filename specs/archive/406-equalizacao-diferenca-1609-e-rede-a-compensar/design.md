# Design: Spec 406 — Equalização da Diferença de R$ 11.764,11 em 16/09/2026 e Auditoria da Adquirente Rede "A Compensar"

## 1. Arquitetura Técnica

```
[Importação de Transações Rede]
        │
        ▼ (Sem extrato do dia / Teste D-1)
┌────────────────────────────────────────────────────────┐
│ Ingestão Segura: settlement_status = 'a_compensar'     │
│ (Nunca NULL, Nunca 'entrou' prematuro ao casar com OS) │
└────────────────────────────────────────────────────────┘
        │
        ├──► [RPC / Backend SSOT]
        │       • v_cartoes_a_compensar = SUM(nao_entrou + a_compensar) = R$ 29.198,28
        │       • Fallback: Se ofx_maquininhas = 0 e rede_liquido > 0 => nao_entrou_valor = rede_liquido
        │
        ├──► [Card 1: ResumoDiaPanel]
        │       • Bancos Positivos: R$ 129.709,49
        │       • Sub-chip "A Compensar": + R$ 29.198,28
        │       • Total Card 1: R$ 158.907,77
        │
        └──► [Modal Raio-X & StoreCartaoMaquininhaView]
                • Piraporinha & Kennedy: 0 vendas de cartão => '-' (Sem pendências)
                • Demais 8 Lojas: 18 transações => 'A COMPENSAR'
                • Desacoplamento de isSettled: zero contaminação de linhas individuais
```

---

## 2. Detalhamento dos Componentes Afetados

### 2.1. `src/hooks/useTransactions.ts`
- **Problema:** Na montagem do payload de `pos_transactions`, o campo `settlement_status` não é passado, resultando em gravação como `NULL`. Se a RPC ou hook filtrar estritamente por `.in('settlement_status', ['nao_entrou', 'a_compensar'])`, linhas com `NULL` seriam desconsideradas.
- **Solução:** Injetar `settlement_status: t.settlement_status || 'a_compensar'` no mapeamento antes do upsert.

### 2.2. `src/components/importacoes/manual/Fase2RedeVsOsReview.tsx`
- **Problema:** Na linha 267 (`handleResolveCollision`), ao casar uma transação da Rede com a OS, o código executa:
  ```tsx
  await supabase.from('pos_transactions').update({
    matched_os_number: chosenCandidate.osNumber,
    settlement_status: 'entrou' // ERRO: Casar com OS não é liquidação bancária!
  }).eq('id', collisionId);
  ```
- **Solução:** Remover a alteração de `settlement_status`. Quem dita se o dinheiro caiu na conta bancária é exclusivamente o extrato bancário OFX.

### 2.3. `src/components/conciliacao/StoreCartaoMaquininhaView.tsx`
- **Problema:** A linha 119 define `isSettled` com base no consolidado da loja. Na linha 283, `(row.is_settled || isSettled)` força o badge verde `LIQUIDADO NO BANCO` para todas as linhas da tabela se `isSettled` for verdadeiro, contaminando transações que ainda não caíram no banco.
- **Solução:** Se `totalCreditadoBanco === 0` (como no teste do usuário sem extrato de hoje), nenhuma linha pode receber badge `LIQUIDADO NO BANCO`. Todas devem exibir `A COMPENSAR`.

### 2.4. `src/components/conciliacao/SaldoBancosDetailModal.tsx` & `useBackendConciliacao.ts`
- **Garantia de Resiliência:** No mapeamento de cada loja:
  Se `ofx_maquininhas === 0` e `rede_liquido > 0`:
  `maquininhaNaoEntrou` assume automaticamente `s.rede_liquido` e o status fica `'A Compensar'`.

---

## 3. Modelo Contábil de Equalização (Opções para o Usuário)

Como o usuário está em ambiente de teste com o extrato de ontem:
1. **Cenário A (Importação dos Extratos Reais de 16/09):**
   Ao importar os extratos bancários de 16/09 com os créditos de clientes e faturamento, os saldos das contas sobem e cobrem os R$ 11.764,11 faltantes, zerando a diferença.
2. **Cenário B (Equalização de Simulação / Ajuste de Teste):**
   Permitir que o usuário insira a contrapartida fiduciária (ex.: ajuste de saldo bancário de teste ou contrapartida de receita em trânsito) no modal de fechamento para zerar a diferença e testar a gravação do snapshot com `Diferença = R$ 0,00`.
