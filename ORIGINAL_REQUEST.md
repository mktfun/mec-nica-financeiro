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
