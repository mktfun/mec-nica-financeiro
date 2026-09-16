# Original User Request

## 2026-08-24T20:57:50Z

Sistema de conciliação financeira multi-loja (rede de oficinas) possui três bugs críticos ativos em produção que causam discrepâncias silenciosas: (1) dinheiro em caixa sem idempotência correta — na primeira importação o valor registra, mas reimportações podem duplicar, e ao dar baixa o registro some em vez de permanecer com status quitado no histórico; (2) importações duplicadas de rede/POS quebram o match de conciliação e o cálculo de juros; (3) a lógica de deduplicação na reimportação de arquivos falha ao criar registros duplicados. O objetivo desta rodada é **auditar toda a base de código de ponta a ponta** e produzir documentação técnica completa e acionável para um engenheiro de sistemas sênior — sem modificar o código diretamente.

Working directory: `C:\Users\admin\.gemini\antigravity\scratch\financeiro`

Integrity mode: development

---

## Arquivos de Referência (ler antes de qualquer análise)

### Documentação técnica existente
- `manual_tecnico_conciliacao.pdf` — manual técnico de conciliação (leitura obrigatória)
- `specs/280-correcao-definitiva-conciliacao-rpc-duplicidade-pos-e-cofre/proposal.md`
- `specs/280-correcao-definitiva-conciliacao-rpc-duplicidade-pos-e-cofre/design.md`
- `specs/280-correcao-definitiva-conciliacao-rpc-duplicidade-pos-e-cofre/spec-plan.md`
- `specs/281-arquitetura-e-logica-conciliacao-rede-pix-dinheiro/proposal.md`
- `specs/281-arquitetura-e-logica-conciliacao-rede-pix-dinheiro/design.md`
- `specs/281-arquitetura-e-logica-conciliacao-rede-pix-dinheiro/spec-plan.md`

### Banco de Dados / Migrações (PostgreSQL / Supabase)
- `supabase/migrations/20260824000010_drop_overloaded_rpc_and_fix_canonical_reconciliation.sql`
- `supabase/migrations/20260824000009_fix_store_reconciliation_array_in_rpc.sql`
- `supabase/migrations/20260824000008_fix_triple_reconciliation_net_amount.sql`
- `supabase/migrations/20260824000004_auto_cash_vault_window_and_pos_pending.sql`

### Frontend — Páginas & Rotas
- `src/routes/conciliacao.index.tsx`
- `src/routes/conciliacao._lojaId.tsx`
- `src/routes/importacoes.tsx`
- `src/routes/patio.tsx`

### Componentes de UI & Modais
- `src/components/conciliacao/ResumoDiaPanel.tsx`
- `src/components/conciliacao/SaldoBancosDetailModal.tsx`
- `src/components/conciliacao/FechamentoFilialCard.tsx`
- `src/components/conciliacao/PatioOsDetailModal.tsx`
- `src/components/conciliacao/MaquininhaPendenteModal.tsx`
- `src/components/importacoes/CentralImportWizard.tsx`

### Hooks & Processadores de Negócio
- `src/hooks/useBackendConciliacao.ts`
- `src/hooks/useOsImportProcessor.ts`
- `src/hooks/usePosImportProcessor.ts`
- `src/hooks/useCategorizeOrphan.ts`

### Scripts de Diagnóstico
- `scripts/forensic-diagnose-all.cjs`
- `scripts/sync-os-vault-pos.cjs`
- `scripts/generate-conciliacao-pdf.cjs`

---

## Requirements

### R1. Auditoria Forense — Bug do Dinheiro em Caixa (Idempotência & Persistência da Baixa)

Investigar e documentar o fluxo completo de um pagamento em dinheiro dentro do sistema. O comportamento esperado é: (a) na primeira importação, o valor é registrado; (b) em reimportações subsequentes do mesmo arquivo/período, o valor **não deve ser duplicado** — deve existir um mecanismo de idempotência (chave única, upsert, hash) que impeça o registro duplo; (c) ao dar baixa manual, o registro deve ser marcado como quitado mas **permanecer visível** no histórico — não deve desaparecer da OS nem do pátio; (d) após a baixa, reimportações não devem re-registrar o mesmo valor como pendente novamente.

Identificar: onde a idempotência falha (qual campo deveria ser a chave única e não é); por que a baixa some o registro em vez de mantê-lo com status alterado; se há lógica de soft-delete ou status field que deveria ser usado e não está.

### R2. Auditoria Forense — Bug de Duplicatas de Rede/POS e Cálculo de Juros

Investigar e documentar o fluxo completo de importação de dados da rede (POS/maquininha). Identificar: (a) em qual etapa do processador (`usePosImportProcessor.ts`) e/ou RPC duplicatas entram sem serem filtradas; (b) como a presença de duplicatas quebra a lógica de match ("entrou ou não na maquininha"); (c) como duplicatas afetam especificamente o cálculo de juros — identificar a fórmula/query afetada; (d) se a deduplicação existe onde ela está implementada e por que falha em certos cenários; (e) a condition de guarda (guard clause) que está faltando ou está errada.

### R3. Auditoria Forense — Bug de Reimportação e Deduplicação de Arquivos

Investigar e documentar o mecanismo completo de deduplicação de importações no `useOsImportProcessor.ts` e `usePosImportProcessor.ts`. Identificar: (a) qual é a chave de deduplicação utilizada (hash, ID do arquivo, combinação de campos) e se ela é suficientemente única; (b) em que cenários a reimportação do mesmo arquivo cria registros duplicados no banco; (c) se a lógica de "upsert vs insert" está correta nas RPCs envolvidas; (d) se o `CentralImportWizard.tsx` tem algum papel no problema (ex: chamadas duplas, falta de debounce/guard).

### R4. Entrega de Documentação Técnica Sênior

Produzir um documento técnico completo em Markdown (`C:\Users\admin\.gemini\antigravity\scratch\financeiro\docs\auditoria_conciliacao_senior.md`) cobrindo: (a) mapa de fluxo de dados de cada bug (entrada → processamento → banco → exibição); (b) root cause analysis (RCA) para cada um dos três bugs com evidência de código (citando arquivo + linha exata); (c) tabela de impacto por bug (severidade, frequência estimada, dados afetados); (d) proposta de correção concreta para cada bug (SQL ou TypeScript, pseudocódigo aceitável se a mudança exigir revisão humana antes de aplicar — NÃO criar migrations reais); (e) checklist de testes de regressão para validar cada correção.

---

## Acceptance Criteria

### Cobertura da Auditoria
- [ ] Cada um dos três bugs tem um RCA com evidência de código (arquivo + linha citados)
- [ ] O fluxo completo de dados para cada bug está documentado (não apenas a causa raiz)
- [ ] Os casos em que o bug se manifesta vs. não se manifesta estão distinguidos

### Qualidade da Documentação Técnica
- [ ] O documento `docs/auditoria_conciliacao_senior.md` existe e está escrito em Markdown válido
- [ ] Cada bug tem: (1) descrição do problema, (2) RCA com evidência, (3) proposta de correção, (4) testes de regressão sugeridos
- [ ] A tabela de impacto por bug está preenchida com severidade e frequência estimada
- [ ] Um engenheiro sênior sem contexto prévio consegue entender e agir com base no documento

### Limites (o time NÃO deve fazer)
- [ ] Nenhuma migration SQL deve ser criada ou aplicada — apenas proposta como pseudocódigo/diff comentado
- [ ] Nenhum código de produção deve ser modificado — somente leitura e documentação
- [ ] Nenhuma dependência nova deve ser instalada para fins da auditoria

## 2026-09-16T18:42:41Z

This is a single self-contained fix; keep it small and focused.

Garantir o fechamento contábil rigoroso da data 16/09 utilizando estritamente os 31 arquivos físicos fornecidos (extratos bancários OFX, planilhas de conferência de OS, relatórios de vendas Rede a compensar e contas a pagar), preservando as OSs manuais acordadas, implementando a rastreabilidade total do dinheiro físico em cofre com visualização detalhada de cada fração, persistência imutável no snapshot diário e um motor de recomendação inteligente (não-automático) que pré-disponibiliza contas do contas a pagar sem débito bancário no OFX para baixa rápida como saídas em dinheiro físico.

Working directory: c:/Users/admin/.gemini/antigravity/scratch/financeiro
Integrity mode: development

## Requirements

### R1. Fechamento Estrito Baseado nos Arquivos Físicos (Sem Manipulações Arbitrárias)
- Os saldos bancários positivos (R$ 129.709,49) e cheque especial (-R$ 23.994,58) devem refletir 100% os 10 arquivos OFX físicos sem edições forçadas.
- As vendas da Rede (R$ 29.198,28 líquido / R$ 2.332,92 taxas) devem ser mantidas 100% a compensar, refletindo a foto das 19h.
- As contas a pagar devem bater 100% com BuscaContasAPagar.xls (R$ 40.118,13) + Juros da Rede (R$ 2.332,92) = R$ 42.451,05.
- O Pátio de Carros deve conter as 30 OSs físicas apuradas (R$ 66.359,76) somadas exclusivamente às 3 OSs manuais legítimas mantidas pelo usuário (#596 em Dom Pedro: R$ 8.822,46; #1856 em Rei do Módulo: R$ 4.000,00; #1818 em Rei do Módulo: R$ 4.241,30), totalizando R$ 83.423,57.

### R2. Módulo de Rastreabilidade e Composição do Dinheiro em Cofre (CashVaultCompositionModal.tsx)
- Criar interface acessível pelo card de "Dinheiro em Lojas / Cofre" que exiba a composição detalhada de cada fração de dinheiro:
  - Loja de origem, número da OS vinculada, cliente/placa, data de recebimento e valor.
  - Status individual de cada fração: em_transito (no cofre da loja) ou depositado.
- Permitir registrar pagamentos e saídas em dinheiro vivo da loja com categoria, loja e descrição, abatendo automaticamente do saldo em cofre.
- Atualização em tempo real dos valores de dinheiro no card de fechamento e no Caixa Atual ao registrar baixas ou saídas.

### R3. Sugestão Inteligente de Baixas de Contas em Dinheiro (Contas sem Saída no OFX)
- O modal de Dinheiro em Cofre deve pré-listar de forma clara as contas a pagar da data (daily_manual_bills) que não possuem débito correspondente no extrato bancário OFX (match_status = 'unmatched').
- Ação não-automática em 1 clique: o usuário pode revisar cada conta não-bancária sugerida e decidir:
  - "Dar Baixa como Saída em Dinheiro": debita o valor do saldo em cofre da loja selecionada, vinculando a conta e sanando a despesa.
  - "Ignorar / Manter Aberto": se for um lançamento pendente para outro dia ou erro do sistema.

### R4. Blindagem e Isolamento Temporal do Snapshot Diário
- O snapshot diário (daily_snapshots) deve armazenar no campo metadata.cash_vault_snapshot o estado exato de todas as frações de dinheiro e movimentações daquela data no momento do fechamento.
- Ao navegar para datas passadas que já foram fechadas (is_closed: true), a aplicação deve ler o estado congelado do snapshot, sem recalcular dinamicamente ou permitir que movimentações de dias posteriores alterem o histórico já conciliado.
- Descongelamento controlado: quando o usuário estiver trabalhando no dia ativo (ainda aberto), qualquer baixa de dinheiro ou edição de OS manual deve refletir imediatamente na RPC e na tela sem ser bloqueada por flags de snapshot fechado.

## Acceptance Criteria

### Integridade dos Dados Físicos
- [ ] O confronto de cada uma das 30 OSs físicas com o banco de dados apresenta 0 divergências de valores totais, pagos e restantes.
- [ ] Os 10 extratos OFX conferem ao centavo com os saldos registrados no sistema (R$ 105.714,91 líquido).
- [ ] Os arquivos de vendas Rede conferem ao centavo com os cartões a compensar (R$ 29.198,28) e juros (R$ 2.332,92).
- [ ] As 3 OSs manuais (#596, #1856, #1818) estão visíveis e editáveis na tela de ordens de serviço.

### Rastreabilidade e Sugestão de Baixas em Dinheiro
- [ ] Ao clicar no card de dinheiro em loja, abre o modal de composição exibindo cada fração com loja, OS, data e status.
- [ ] O modal exibe a seção "Contas Importadas sem Débito no OFX" com opção de dar baixa manual como saída de dinheiro em 1 clique.
- [ ] Ao dar baixa em uma conta sugerida, é gerada uma saída em store_cash_vault e o saldo em cofre é recalculado na hora.

### Persistência e Isolamento Histórico
- [ ] Ao fechar a conciliação do dia, a composição detalhada do dinheiro é gravada em daily_snapshots.metadata.
- [ ] Ao reabrir um dia passado fechado, a tela exibe rigorosamente a foto histórica congelada daquele dia.

