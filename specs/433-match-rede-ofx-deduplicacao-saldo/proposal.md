# 📋 SDD Proposal — Calibração do Match Rede x OFX e Deduplicação no Saldo Consolidado

- **Spec ID:** `433-match-rede-ofx-deduplicacao-saldo`
- **Data:** 2026-09-22
- **Autor:** Antigravity 2.0 (Single-Agent Direto)

---

## 1. Problema Diagnosticado

Nas filiais **Jorge Beretta (DHJV)** e **Mauá (MHE)**, o valor de vendas da Rede de 21/09 que caiu na conta Itaú na manhã de 22/09 foi somado em duplicidade no Saldo Consolidado:

1. **Jorge Beretta (DHJV):**
   - No OFX, o cabeçalho `<LEDGERBAL>` já trouxe o saldo de 22/09: **R$ 48.111,02** (que já inclui a venda de **R$ 382,00** da Rede creditada no Itaú + R$ 4,08 de rendimento).
   - O matcher não marcou o lote de R$ 382,00 como `entrou` (porque o filtro de data em `llm-matcher.ts` exigia `cleanDate === cleanTarget` estrito de D0, ou porque a linha de extrato estava em D+1).
   - O modal `SaldoBancosDetailModal.tsx` tratou o valor como "A Compensar" (+ R$ 382,00) e somou por cima do saldo do banco:
     $$\text{Saldo Consolidado} = 48.111,02 + 382,00 = \text{R\$} 48.493,02$$
     *(Enquanto no extrato em papel o saldo real é R$ 48.111,02).*

2. **Mauá (MHE):**
   - No OFX, o cabeçalho `<LEDGERBAL>` trouxe **-R$ 12.964,64** (que já inclui os primeiros **R$ 992,20** de débito da Rede já compensados sobre o saldo anterior de -R$ 13.956,84).
   - O sistema somou a coluna "Maquininhas (Rede)" inteira de **+R$ 4.671,32** (que continha os R$ 992,20 + R$ 3.679,12 da segunda parcela).
   - Resultado: `-12.964,64 + 4.671,32 = -R$ 8.293,32`.
   - Os R$ 992,20 foram somados duas vezes. Com os dois lotes creditados (conforme extrato em papel das 09:13), o saldo real disponível em conta é **-R$ 9.285,52** (-9k).

3. **Bug Crítico de Fallback em `SaldoBancosDetailModal.tsx`:**
   - Na linha 90: `if (rawNaoEntrou !== undefined && rawNaoEntrou > 0)`.
   - Quando `rawNaoEntrou === 0` (ou seja, 100% da Rede compensada no banco), a condição `> 0` falhava e caía no `else if (redeLiquidoVal > 0)`, forçando `maquininhaNaoEntrou = redeLiquidoVal`!
   - Isso impedia que qualquer filial tivesse R$ 0,00 a compensar, mesmo quando o crédito já tinha entrado.

---

## 2. Solução Proposta

1. **Ajuste Cirúrgico no Matcher (`src/lib/llm-matcher.ts`):**
   - Permitir que créditos de adquirente em janela contígua (D0 e D+1) sejam elegíveis para casar com lotes da Rede de D0 (tolerância de 1 dia).
   - Se o lote da Rede tiver contrapartida no extrato OFX (ex: R$ 382,00 ou R$ 992,20), marcar as transações daquele lote com `status: 'entrou'` e abater do `aCompensarReal`.
   - Se o `<LEDGERBAL>` do OFX já absorveu o lote (detectável pela diferença entre `ledgerBalance` e `closingDayBalance`), reconhecer a liquidação do lote no saldo bancário.

2. **Correção do Guardrail de Compensação em `SaldoBancosDetailModal.tsx`:**
   - Respeitar estritamente o valor apurado quando `rawNaoEntrou !== undefined` (inclusive se for `0`):
     ```ts
     const maquininhaNaoEntrou = (rawNaoEntrou !== undefined) 
       ? Math.max(0, rawNaoEntrou)
       : (rawCartaoNaoEntrou !== undefined) 
         ? Math.max(0, rawCartaoNaoEntrou) 
         : redeLiquidoVal;
     ```
   - Se o valor que não entrou for `0`, exibir `-` ou `R$ 0,00` na coluna "Maquininhas (Rede)" e NÃO somar nada ao saldo bancário.

3. **Sincronização em `CentralImportWizard.tsx`:**
   - Persistir corretamente `settlement_status = 'entrou'` para lotes casados com créditos de D0/D+1.

---

## 3. Skills Especializadas Aplicadas
- `backend-patterns`: Sincronização determinística de status de liquidação.
- `database`: Respeito ao schema de `pos_transactions.settlement_status`.
- `frontend-design-pro`: Preservação dos tokens Zinc-950 no modal.

---

## 4. Arquivos Afetados

### [Arquivos Existentes Modificados]
- `src/lib/llm-matcher.ts`
- `src/components/conciliacao/SaldoBancosDetailModal.tsx`
- `src/components/importacoes/CentralImportWizard.tsx`

### [Arquivos Novos]
- Nenhum. ZERO criação de novos arquivos, RPCs ou tabelas.

---

## 5. Critérios de Aceitação Verificáveis
1. Jorge Beretta: Saldo Consolidado = R$ 48.111,02 (Maquininhas a compensar: R$ 0,00).
2. Mauá: Saldo Consolidado = -R$ 9.285,52 (-9k, sem duplicação de R$ 992,20).
3. Build limpo via `npm run build`.

---

## 6. Plano de Rollback
- Reversão atômica via Git dos 3 arquivos.
