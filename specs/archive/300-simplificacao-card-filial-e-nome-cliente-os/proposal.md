# Proposal: Simplificação do Card de Filial e Nome do Cliente na Importação de OS com Match Inteligente (300)

## Problema

1. **Poluição Visual no Card de Filial:**
   - Na tela de conciliação diária (`conciliacao.index.tsx` e `conciliacao.$lojaId.tsx`), o primeiro bloco do card executivo de cada loja exibia o título longo `Saldo Bancos + Cartões` acompanhado de múltiplos subtextos empilhados (`OFX: R$ ...`, `+ Maq: + R$ ...`, `+ Cofre: + R$ ...`). Isso poluía visualmente o card e dificultava a leitura rápida do saldo consolidado de cada loja.

2. **Ausência do Nome do Cliente na Importação de OS / Carros em Pátio:**
   - Na importação de planilhas de Ordens de Serviço (`ConferenciaOSxFinanceiro.xls`), a tabela `patio_os` no banco de dados não possuía a coluna `client_name`. O parser ignorava a coluna "Cliente" da planilha e o modal de vinculação bancária (`ManualMatchOsModal.tsx`) exibia o texto genérico `"Cliente"` em vez do nome real da pessoa/empresa (ex: `"CAIQUE VINICIOS SALES LIMA"`).
   - O algoritmo de vinculação não conseguia comparar o nome do cliente da OS com a contraparte do PIX no extrato bancário, dificultando a localização e o match automático.

---

## Solução Proposta

1. **Simplificação Executiva do Card de Fechamento por Filial:**
   - Alterar o título do primeiro item do card para **`SALDO TOTAL`**.
   - Se o saldo for **positivo (>= 0)**: exibir em **verde** (`text-emerald-400`).
   - Se o saldo for **negativo (< 0)**: exibir em **vermelho** (`text-rose-400`) com o sinal negativo explícito.
   - Remover os subtextos de detalhamento intermediário do card principal, mantendo a interface limpa, minimalista e de leitura instantânea.

2. **Persistência de `client_name` em `patio_os`:**
   - Criar migration SQL adicionando a coluna `client_name text` na tabela `patio_os` (e `estoque_os_pendente`).
   - Atualizar os parsers (`useOsImportProcessor.ts`, `useImportProcessor.ts`, etc.) para detectar a coluna `Cliente` / `Razão Social` / `Nome` e persistir o nome do cliente no Supabase.
   - Executar backfill automático para as OSs já importadas a partir dos arquivos presentes em disco.

3. **Exibição e Match Inteligente por Nome no Modal de Vinculação:**
   - No modal `ManualMatchOsModal.tsx`, exibir o nome do cliente em destaque principal e a placa abaixo em tipografia discreta.
   - Implementar algoritmo de similaridade textual (tokens de nome) entre a contraparte do PIX/OFX e o `client_name` da OS.
   - Elevar para o topo com badge especial de alta confiança quando houver **Match por Nome & Valor** ou **Match por Nome**.

---

## Contratos de Dados

### Supabase Table: `patio_os`
- Nova coluna: `client_name text null`
- Nova coluna: `estoque_os_pendente.client_name text null`

---

## API / Interface

- **`useAvailableStoreOs(storeId, date)`:** Buscar e retornar `client_name` de `patio_os`.
- **`ManualMatchOsModal.tsx`:** Ordenação por score composto:
  1. Match de Nome + Match Exato de Valor (Score 100)
  2. Match de Nome (Score 80)
  3. Match Exato de Valor (Score 70)
  4. Menor diferença de valor.

---

## Features Existentes Impactadas

- `src/routes/conciliacao.index.tsx`
- `src/routes/conciliacao.$lojaId.tsx`
- `src/components/conciliacao/ManualMatchOsModal.tsx`
- `src/hooks/useManualMatch.ts`
- `src/hooks/useOsImportProcessor.ts`
- `src/hooks/useImportProcessor.ts`
- `src/lib/supabase.ts` (Type `PatioOSRow`)

---

## Risco Principal

- **Risco:** Algum arquivo de importação ter variações no cabeçalho do cliente (ex: "Razão Social", "Nome", "Cliente/Contato").
- **Mitigação:** Regex abrangente no detector de cabeçalho contemplando todas as variações conhecidas dos ERPs mecânicos.
