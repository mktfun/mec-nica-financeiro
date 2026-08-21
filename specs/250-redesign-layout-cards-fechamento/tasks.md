# Tasks: Spec 250 - Conciliação Estrita de Maquininhas & Redesign de Cards

- [ ] **1. Validação da RPC no PostgreSQL (Supabase)**
  - [ ] Garantir que `get_store_pos_triple_reconciliation` avalie o matching sem gerar falso positivo de R$ 2.997,82.
  - [ ] Validar que `get_daily_reconciliation_summary` entregue `total_saldo_banco = 26.503,63` e `cartoes_a_compensar = 0` para 21/08.

- [ ] **2. Redesign do Layout em `ResumoDiaPanel.tsx`**
  - [ ] Reestruturar a linha superior em grid de 5 colunas no desktop (`grid-cols-1 md:grid-cols-5`).
  - [ ] Configurar o Card 1 (Saldo Bancos) com `md:col-span-2` e layout horizontal para as sub-métricas (Extrato OFX e Dinheiro no Cofre em chips horizontais lado a lado).
  - [ ] Nivelar a altura e padding dos Cards de Dinheiro MP, A Receber e Na Loja OS.
  - [ ] Mover o Card de Contas (Manual) para a seção de Consolidação do Dia.
  - [ ] Ajustar o grid da Consolidação do Dia para acomodar Caixa Atual, Caixa Anterior, Fluxo de Caixa, Faturamento e Contas a Pagar.

- [ ] **3. Validação Visual & Testes de Build**
  - [ ] Rodar `npm run build` e confirmar 0 erros.
  - [ ] Validar fidelidade visual dos cards horizontais e abertura dos 4 modais.
