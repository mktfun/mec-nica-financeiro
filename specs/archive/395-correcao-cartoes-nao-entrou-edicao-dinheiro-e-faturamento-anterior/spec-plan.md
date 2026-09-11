# Spec Plan — Spec 395: Correção de Cartões (Rede Não Entrou), Edição/Salvamento de Dinheiro e Encadeamento de Odômetro Anterior

## Tasks

- [x] **Task 1: Correção do Motor de Cartões na Tela de Importação (`CentralImportWizard.tsx`)**
  - [x] 1.1 Localizar o trecho pós-`reconcileRedeWithOfxDeterministic` onde `pos_transactions` é atualizado.
  - [x] 1.2 Mudar a query de update para localizar transações pelos atributos reais (`store_id`, `target_date`, `net_amount`, `brand`) ou `dedup_hash` ao invés do `saleId` sintético.
  - [x] 1.3 Garantir que transações conciliadas sejam marcadas com `settlement_status = 'entrou'` e apenas as não conciliadas (Piraporinha) permaneçam como `nao_entrou`.

- [x] **Task 2: Correção da Coluna "Maquininhas (Rede)" e Dinheiro no Modal Raio-X (`SaldoBancosDetailModal.tsx`)**
  - [x] 2.1 Atualizar a extração de `maquininhaNaoEntrou` com fallbacks defensivos (`s.nao_entrou_valor ?? s.cartao_nao_entrou ?? (s.status_compensacao === 'nao_entrou' ? s.maquininha : 0)`).
  - [x] 2.2 Garantir que o valor de Piraporinha (R$ 4.642,10) seja exibido na coluna e computado no Saldo Consolidado e no card "A Compensar".
  - [x] 2.3 Validar que o Dinheiro no Cofre apresente tanto Mauá (R$ 380,00) quanto Jabaquara (R$ 500,00), totalizando R$ 880,00.

- [x] **Task 3: Desbloqueio e Persistência Confiável de Dinheiro (`ResumoDiaPanel.tsx` & `CentralImportWizard.tsx`)**
  - [x] 3.1 Em `ResumoDiaPanel.tsx`, refinar a trava `isStoreBreakdownCorrupted` para não desabilitar o botão de salvar quando o usuário estiver ajustando inputs manuais legítimos.
  - [x] 3.2 Em `CentralImportWizard.tsx`, remover o bloqueio indevido de inputs ou garantir que a edição de `manualDinheiroMp` seja sempre mantida e sincronizada sem sobrescrita fantasma por `useEffect`.
  - [x] 3.3 Garantir que a mutação de fechamento persista `dinheiro_mp` no snapshot do banco sem perda de dados.

- [x] **Task 4: Correção do Odômetro Anterior vs Faturamento do Dia (`ResumoDiaPanel.tsx` & `CentralImportWizard.tsx`)**
  - [x] 4.1 Substituir a busca de `previousSnapshot?.faturamento` por `previousSnapshot?.metadata?.odometro_hoje` (ou `faturamento_odometro`) como fonte primordial de `(-) ANT.`.
  - [x] 4.2 Para 10/09/2026, ancorar:
    - Odômetro Hoje: R$ 281.317,68
    - (-) Odômetro Anterior: R$ 235.023,20
    - (=) Faturamento Líquido do Dia: R$ 46.294,48.
  - [x] 4.3 Implementar sanitização `sanitizeDelta` com `Math.round` para eliminar definitivamente qualquer resíduo de notação científica flutuante (`4.5474735088646...`).

- [x] **Task 5: Sincronização e Equalização no Supabase para 10/09/2026**
  - [x] 5.1 Atualizar `daily_snapshots` para 10/09/2026 com os valores exatos:
    - `faturamento`: R$ 46.294,48
    - `metadata.odometro_hoje`: R$ 281.317,68
    - `metadata.faturamento_anterior`: R$ 235.023,20
    - `metadata.faturamento_oi_base`: R$ 46.294,48
    - `metadata.faturamento_periodo`: R$ 46.294,48
    - `cartoes_a_compensar`: R$ 4.642,10
    - `metadata.dinheiro_lojas`: R$ 880,00
    - `saldo_bancario`: R$ 138.818,89
    - `metadata.saldo_bancos_positivo`: R$ 149.272,57
  - [x] 5.2 Equalizar `pos_transactions` de 10/09/2026: marcar transações de Dom Pedro, Jorge Beretta, Mauá, Rudge Ramos e Rei do Módulo como `entrou`, mantendo unicamente Piraporinha como `nao_entrou`.

- [x] **Task 6: Validação de Terminal (Build Gate)**
  - [x] 6.1 Executar `npm run build` para garantir zero erros de compilação ou linter.
  - [x] 6.2 Verificar visualmente os cálculos e emitir o relatório de prontidão para homologação do usuário.
