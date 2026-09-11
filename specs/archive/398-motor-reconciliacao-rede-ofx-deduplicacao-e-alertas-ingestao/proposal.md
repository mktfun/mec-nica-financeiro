# Proposal: Motor de Reconciliação Rede x OFX, Deduplicação e Alertas de Ingestão (398)

## Problema
1. **Falhas Recorrentes no Match de Cartões:** Ao refazer o processo de importação do zero, o motor de conciliação de maquininhas apresentava inconsistências ou não equalizava as vendas com os depósitos bancários, devido a falta de um casamento determinístico bipartido rigoroso (Previsto x Realizado), acoplamento a chamadas assíncronas concorrentes e dependência de dados parciais no banco.
2. **Ausência de Deduplicação e Alertas de Ingestão:**
   - Se o usuário envia arquivos OFX duplicados (mesma conta/período), o sistema não avisa e pode gerar sobreposição de dados.
   - Se o usuário envia planilhas de OS duplicadas da mesma filial, os registros podem sofrer contagem duplicada.
   - Se faltar o extrato OFX ou a planilha de OS de alguma das 10 lojas ativas, o sistema não avisa explicitamente quais lojas estão pendentes antes do fechamento.
   - Arquivos da Rede com movimento zero (R$ 0,00) são ingeridos desnecessariamente, poluindo tabelas e logs.
   - Se um arquivo da Rede for enviado duplicado para a mesma loja, não há notificação nem filtro para manter apenas uma única instância.

## Solução Proposta (Foco em Reuso e Correção)
Implementar a arquitetura técnica descrita na especificação canônica do usuário:
1. **Pipeline ETL de Ingestão e Sanitização Prévia:**
   - **Deduplicação de OFX:** Detecta se a mesma conta/período foi fornecida mais de uma vez. Emite notificação de aviso e retém apenas o extrato mais completo/recente.
   - **Deduplicação de OS:** Agrupa por `storeAlias`/loja. Se houver mais de um arquivo para a mesma filial, notifica e considera apenas o mais recente/completo.
   - **Filtro de Rede sem Movimento:** Se o arquivo da Rede tiver `totalNet <= 0` ou zero transações válidas, descarta a importação e emite aviso informativo ("Rede Loja X sem vendas - ignorada").
   - **Deduplicação de Rede:** Se houver duplicidade de relatórios da Rede para a mesma loja, notifica o usuário e processa estritamente um único arquivo.
   - **Scanner de Cobertura das 10 Lojas:** Painel/banner dinâmico no Step 1/Step 2 informando:
     - Quais lojas têm OFX presente e quais estão com OFX faltando.
     - Quais lojas têm OS presente e quais estão com OS faltando.
2. **Motor de Reconciliação Bipartido Determinístico (`ReconciliadorRedeOFX`):**
   - Implementação em TypeScript puro de acordo com a especificação técnica:
     - **Passo 1 (Filtragem de Negócio):** Isola créditos de adquirente no OFX (TRNTYPE = CREDIT, regex em MEMO/TITLE para `REDE`, `RECEBIMENTO REDE`, `VISA`, `MAST`, `CARTAO`, `CIELO`, etc.) descartando débitos e rendimentos.
     - **Passo 2 (Match Determinístico Greedy 1:1):** Para cada registro de venda prevista (ou lote da bandeira), busca no extrato bancário um registro não pareado onde:
       $$\text{Data}_{\text{Banco}} == \text{Data}_{\text{Prevista}} \quad \land \quad |\text{Valor}_{\text{Banco}} - \text{Valor}_{\text{Previsto}}| \le 0.01$$
     - **Passo 3 (Tolerância MDR / Lote Consolidado):** Se o valor líquido tiver pequena divergência decorrente de taxa MDR flutuante ou antecipação dinâmica, aplica match por lote de bandeira ou banda de tolerância MDR esperada.
     - **Passo 4 (Segregação nos 3 Vetores):**
       - ✅ `conciliados`: Previsto e Realizado bateram perfeitamente ($|\Delta| \le 0.01$).
       - ❌ `nao_entrou`: Transações informadas pela adquirente mas sem crédito no extrato bancário (A Compensar).
       - ❓ `orfaos_banco`: Créditos bancários de adquirente sem lançamento correspondente na planilha.
3. **Persistência Idempotente e Confiável:**
   - Gravação atômica em `pos_transactions` com `settlement_status` ('entrou' / 'nao_entrou') e vinculação direta do FITID do banco, com chave única `dedup_hash` impedindo duplicidade em reimportações.

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - `pos_transactions`: Já possui colunas `settlement_status`, `settled_date`, `matched_os_number`, `dedup_hash` e `brand`. Não é necessário alterar schema no banco!
  - `ofx_transactions`: Já possui `fitid`, `target_date`, `store_id`.
  - `daily_snapshots`: Já armazena `cartoes_a_compensar` e `metadata` canônico.
- **Componentes / Hooks Existentes Encontrados:**
  - `src/lib/parsers/centralImportManager.ts`: Ponto central de ingestão de arquivos. Será estendido com as regras de sanitização, deduplicação e filtro de arquivos sem movimento.
  - `src/components/importacoes/CentralImportWizard.tsx`: Interface do wizard de importação. Receberá os alertas de cobertura (OFX/OS faltando ou duplicado) e disparará o motor bipartido.
  - `src/lib/llm-matcher.ts` / `src/lib/matchers/reconciliadorRedeOfx.ts`: O motor determinístico será encapsulado na classe pura `ReconciliadorRedeOFX`, substituindo fallbacks frágeis.
  - `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Painel de auditoria final que consome os 3 vetores (`conciliados`, `nao_entrou`, `orfaos_banco`).

## Contratos de Dados & SQL (Supabase)
- Nenhuma alteração DDL necessária. As tabelas `pos_transactions` e `ofx_transactions` já possuem todos os campos necessários.
- Garantia de idempotência via índices únicos existentes:
  - `ofx_transactions(store_id, fitid)`
  - `pos_transactions(store_id, dedup_hash)`

## API & Componentes (Frontend)
- **[EXTEND] `src/lib/parsers/centralImportManager.ts`:**
  - Adicionar função `sanitizeAndDeduplicateImports(results, activeStores)`.
  - Descartar planilhas Rede com `totalNet <= 0`.
  - Gerar avisos estruturados: `warnings: { duplicates: string[]; missing: string[]; ignoredEmpty: string[] }`.
- **[NEW] `src/lib/matchers/reconciliadorRedeOfx.ts`:**
  - Implementação da classe `ReconciliadorRedeOFX` com os métodos:
    - `parseEFiltrarOfx()`
    - `executarReconciliacao()`
    - Retorno dos 3 vetores: `conciliados`, `nao_entrou`, `orfaos_banco`.
- **[MODIFY] `src/components/importacoes/CentralImportWizard.tsx`:**
  - Integrar a checagem de deduplicação e cobertura das 10 lojas ativas.
  - Exibir banner/notificações de aviso para OFX/OS duplicados ou ausentes.
  - Integrar o motor `ReconciliadorRedeOFX` na etapa de gravação e auditoria.
- **[MODIFY] `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`:**
  - Exibir visualmente os 3 vetores resultantes: Conciliados, Não Entrou (A Compensar) e Órfãos no Banco.

## Risco Principal e Mitigação
- **Risco:** O usuário pode subir um extrato OFX onde os lançamentos da adquirente usam descrições fora do padrão (ex: `LANC CARTAO` ou número de terminal puro).
- **Mitigação:** O regex de filtro de crédito da adquirente cobre todas as variantes conhecidas (`REDE`, `REDECARD`, `MAST`, `VISA`, `ELO`, `HIPER`, `CIELO`, `GETNET`, `STONE`, `CARTAO`, `ADQ`) e permite inclusão configurável de palavras-chave adicionais.
