# Proposal — Spec 426: Blindagem Operacional de Cartões REDE 100% A Compensar por Filial

## Problema Diagnosticado
1. **Divergência Contábil Provocada por Baixa Indevida de Cartões no Mesmo Dia:**
   - No log de auditoria de 18/09 (`auditoria-logs-2026-09-18.json`), o motor `ReconciliadorRedeOFX (Spec 398)` executado na Etapa 4.1 do `CentralImportWizard.tsx` e em `Step4FinalAuditAndClose.tsx` casou créditos de adquirente que caíram no extrato bancário (OFX) contra as vendas de maquininha REDE realizadas na data alvo.
   - O motor atualizou indevidamente `pos_transactions.settlement_status = 'entrou'` para 4 filiais:
     - Rei do Módulo: R$ 9.209,93 baixados como `entrou` (R$ 0,00 a compensar)
     - Rudge Ramos: R$ 12.192,81 baixados como `entrou` (R$ 0,00 a compensar)
     - Jorge Beretta: R$ 6.357,40 baixados como `entrou` (R$ 0,00 a compensar)
     - Santo André: R$ 3.203,50 baixados como `entrou` (R$ 0,00 a compensar)
     - Total baixado erroneamente: **R$ 30.963,64**.
   - Apenas Dom Pedro (R$ 4.126,11) e Jabaquara (R$ 8.480,59) restaram em "A Compensar" (totalizando meros R$ 12.606,70).
2. **Impacto no Fechamento e no Raio-X:**
   - No modal "Raio-X de Saldos Bancários & Dinheiro por Filial", a coluna "A Compensar" exibiu valor zerado (`-`) e badge `CONCILIADO` para as 4 filiais baixadas, omitindo R$ 30.963,64 de ativos da empresa.
   - No fechamento global, `v_cartoes_a_compensar` perdeu esses R$ 30.963,64, resultando na divergência residual acusada no log: `⚠️ Fechamento com divergência residual de R$ 32.518,43`.
3. **Regra de Negócio Real:**
   - Conforme diretriz operacional expressa do usuário: **as vendas de maquininha REDE de cada loja devem ficar 100% a compensar (`settlement_status = 'a_compensar'`)**.
   - As vendas de cartão efetuadas hoje (D+0) não são liquidadas no banco hoje (permanecem com a adquirente para crédito em D+1 ou D+30). Créditos no extrato bancário de hoje são liquidações de competências passadas, já incorporadas ao saldo inicial do banco.

---

## Solução Proposta

### 1. Blindagem de Ingestão e Status de Cartões no Wizard (`CentralImportWizard.tsx`)
- Na Etapa 4.1 do wizard de importação, desativar a mutação automática que alterava `pos_transactions.settlement_status` para `'entrou'`.
- Garantir que 100% das vendas de cartão REDE importadas permaneçam estritamente com `settlement_status = 'a_compensar'`.
- Atualizar os logs visuais do wizard para registrar: `💳 Conciliação de Cartões: 100% das vendas REDE mantidas A Compensar (R$ X em aberto).`

### 2. Blindagem da Auditoria Final (`Step4FinalAuditAndClose.tsx`)
- Desativar a chamada de update para `'entrou'` em `Step4FinalAuditAndClose.tsx`, assegurando que o operador mantenha todas as vendas do dia como ativo a compensar.

### 3. Paridade Contábil no Simulador Sandbox (`sandboxCalculator.ts`)
- Em `sandboxCalculator.ts`, remover a condição que zerava `nao_entrou_valor` quando a loja estava com `isApproved = true` ou quando havia créditos OFX. `nao_entrou_valor` deve computar 100% do valor líquido de vendas REDE (`rede.liquido`), garantindo exata paridade com a conciliação do banco.

### 4. Exibição Transparente no Modal Raio-X (`SaldoBancosDetailModal.tsx`) e Hooks
- Assegurar que `SaldoBancosDetailModal.tsx` e `useBackendConciliacao.ts` apurem todas as filiais com vendas REDE como ativas na coluna verde "A Compensar", com badges informativos e somatório consolidado idêntico ao relatório da maquininha.

---

## Skills Especializadas Aplicadas
- `backend-patterns`: Consistência no fluxo contábil de ativos e liquidação de recebíveis.
- `frontend-design-pro`: Padrões do Design System para badges e colunas segregadas no modal de Raio-X.
- `database`: Integridade de status em `pos_transactions` (`settlement_status IN ('a_compensar', 'nao_entrou')`).

---

## Contratos de Dados Afetados
- `public.pos_transactions`: `settlement_status` mantido estritamente como `'a_compensar'` para as vendas da data alvo.

---

## Arquivos Afetados
### Arquivos Existentes Modificados
1. `src/components/importacoes/CentralImportWizard.tsx`: Manter vendas REDE 100% como `a_compensar` na Etapa 4.1.
2. `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Remover update para `entrou` em vendas do dia.
3. `src/lib/sandbox/sandboxCalculator.ts`: Corrigir `nao_entrou_valor` para manter 100% do líquido REDE no ativo simulado.
4. `src/components/conciliacao/SaldoBancosDetailModal.tsx`: Garantir apresentação uniforme de todas as filiais com valores a compensar.

---

## Plano de Rollback
- Todas as alterações são em componentes frontend e módulos de cálculo sem migrações de DDL destrutivas.
- Em caso de necessidade de reversão, restauração dos arquivos modificados via patch em `.tmp/rollback_spec426/`.

---

## Risco Principal e Mitigação
- **Risco:** Alguma filial ficar com vendas de cartão sem visualização caso não haja registro em `pos_transactions`.
- **Mitigação:** Fallback defensivo que utiliza `rede_liquido` da conciliação quando `pos_transactions` estiver ausente ou ainda não persistido.
