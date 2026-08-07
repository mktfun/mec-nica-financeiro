# Design: CorreçÁo de FK na ImportaçÁo e Redesign do Painel de Progresso (fix-import-fk-and-log-ui)

## Arquitetura Técnica

```
[Import Workflow] ──> [CentralImportWizard: Step 3 (Confirmar)]
                              │
                              ▼
           [Step 4: Executive Processing Dashboard]
                              │
                              ├── [1. Salvar OSs (patio_os)]
                              ├── [2. Salvar Transações & Extrato (transactions)]
                              │         └── FK ON DELETE SET NULL em conciliation_matches
                              ├── [3. Salvar Pares (conciliation_matches)]
                              └── [4. Atualizar Histórico (import_logs)]
                              │
                              ▼
           [Visual Progress Cards: 100% Completed]
```

## Estrutura do Novo Step 4 (Painel Executivo de Progresso)

### Layout Visual:
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🚀 Processamento do Lote de ImportaçÁo                        [85%]   │
│ [===========================================================>......]   │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│ 📄 Ordens de Serviço (Pátio)                       [ CONCLUÍDO  ✓ ]   │
│    324 OSs processadas e salvas com sucesso                            │
│                                                                        │
│ 💳 Relatórios de Maquininha (Rede)                 [ CONCLUÍDO  ✓ ]   │
│    12 transações de cartÁo processadas                                 │
│                                                                        │
│ 🏦 Extrato Bancário (OFX)                        [ PROCESSANDO... ⏳] │
│    Gravando 56 lançamentos no banco de dados...                        │
│                                                                        │
│ 🔗 AssociaçÁo de ConciliaçÁo                       [ AGUARDANDO    ]   │
│    Aguardando gravaçÁo das transações de origem...                     │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## Alterações de Banco de Dados & Scripts

```sql
-- Atualizar FK de ofx_transaction_id
ALTER TABLE public.conciliation_matches 
  DROP CONSTRAINT IF EXISTS conciliation_matches_ofx_transaction_id_fkey;

ALTER TABLE public.conciliation_matches 
  ADD CONSTRAINT conciliation_matches_ofx_transaction_id_fkey 
  FOREIGN KEY (ofx_transaction_id) 
  REFERENCES public.transactions(id) 
  ON DELETE SET NULL;

-- Atualizar FK de rede_transaction_id
ALTER TABLE public.conciliation_matches 
  DROP CONSTRAINT IF EXISTS conciliation_matches_rede_transaction_id_fkey;

ALTER TABLE public.conciliation_matches 
  ADD CONSTRAINT conciliation_matches_rede_transaction_id_fkey 
  FOREIGN KEY (rede_transaction_id) 
  REFERENCES public.transactions(id) 
  ON DELETE SET NULL;
```

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)

- **Cenário 1 (Confirmar importaçÁo com substituiçÁo de transações):**
  - Estado inicial: Transações anteriores já existem no banco e têm matches vinculados.
  - AçÁo: Reimportar a planilha e clicar em "Confirmar e Gravar ImportaçÁo".
  - Resultado esperado: Transações e matches sÁo atualizados/desvinculados graciosamente sem erro de violaçÁo de FK (`conciliation_matches_ofx_transaction_id_fkey`).

- **Cenário 2 (Visual do Painel de Progresso):**
  - Estado inicial: Usuário clica em "Confirmar ImportaçÁo".
  - AçÁo: O sistema avança para o Step 4.
  - Resultado esperado: Exibe barra de progresso animada, 4 cards executivos com badges e ícones do sistema, sem nenhum elemento em caixa preta monospaçada (`font-mono` / CMD).
