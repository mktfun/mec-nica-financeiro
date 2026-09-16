# 📋 Proposta Atualizada — Spec 409: Sincronização do Pátio Real (Com OSs Manuais) no Card de Fechamento

## 1. Contexto e Esclarecimento Fundamental

O usuário confirmou expressamente a regra de negócio contábil:
> *"e ta certo [...] é as que tem que atualizar manual porra. ta certo essas manuais mano"*

### O que isso significa:
1. **As OSs Manuais são 100% legítimas e intencionais:**
   - **Rei do Módulo (`st-09`):**
     - 5 OSs importadas da planilha física oficial = R$ 11.595,95
     - 2 OSs mantidas/atualizadas manualmente (#1856: R$ 4.000,00 e #1818: R$ 4.241,30) = R$ 8.241,30
     - **PÁTIO REAL TOTAL DA FILIAL:** $$11.595,95 + 8.241,30 = \mathbf{R\$\ 19.837,25}$$
   - **Dom Pedro I (`st-01`):**
     - 4 OSs importadas da planilha física oficial = R$ 10.269,20
     - 1 OS mantida/atualizada manualmente (#596: R$ 8.822,46) = R$ 8.822,46
     - **PÁTIO REAL TOTAL DA FILIAL:** $$10.269,20 + 8.822,46 = \mathbf{R\$\ 19.091,66}$$
   - **Pátio Consolidado Total (10 Filiais):** **R$ 83.423,57**.

2. **A Causa-Raiz da Incongruência:**
   - A tela interna de OS (`StoreOrdensServicoView`) lê diretamente de `patio_os`, por isso já exibia o valor correto: **R$ 19.837,25**.
   - O Card de Fechamento da loja na listagem geral (`StoreCardModulo1`) consumia `reconciliations.na_loja_os` via RPC, onde estava gravado apenas o valor cru da planilha física de 16/09 (**R$ 11.595,95**), ignorando as OSs manuais!
   - Essa omissão gerava a divergência visual entre as duas telas.

---

## 2. Escopo da Solução

1. **Preservar 100% as OSs Manuais em `patio_os`:**
   - Nenhuma OS manual será alterada ou baixada indevidamente.
2. **Sincronizar a Tabela `reconciliations`:**
   - `st-09` (Rei do Módulo): atualizar `na_loja_os = 19837.25`.
   - `st-01` (Dom Pedro I): atualizar `na_loja_os = 19091.66`.
3. **Sincronizar a RPC `get_daily_reconciliation_summary` e Cards:**
   - Com `reconciliations` atualizado, o Card de Fechamento (`StoreCardModulo1`) exibirá **R$ 19.837,25**, igualando 100% à tela de Ordens de Serviço.
4. **Alinhar o Fechamento Geral (`daily_snapshots`):**
   - Garantir `total_patio = 83423.57` no snapshot de 16/09 para que o painel de 5 pilares reflita o valor real consolidado com as manuais.
