# Proposal: Correção de OSs Rejeitadas (Planalto, Rei do Módulo) e Modo "Apenas Fora do Relatório" (362)

## Problema
1. **Rejeição Silenciosa de Planilhas de OS de Filiais Específicas**:
   - Arquivos de OS válidos de lojas como **Planalto - BRASICAR** e **Rei do Módulo - MP** foram rejeitados na Fase 1 do Fechamento Manual. Como consequência, essas filiais aparecem zeradas no painel:
     - `Planalto - BRASICAR: Total: R$ 0,00 | Pago: R$ 0,00 | Aberto: R$ 0,00`
     - `Rei do Módulo - MP: Total: R$ 0,00 | Pago: R$ 0,00 | Aberto: R$ 0,00`
   - **Causa Raiz 1 (Cabeçalho)**: Em `src/hooks/useOsImportProcessor.ts`, a busca do cabeçalho era travada em `Math.min(20, data.length)`. Em relatórios exportados do ERP com metadados/filtros nas primeiras linhas, o cabeçalho fica nas linhas 21 a 35. Além disso, a checagem exigia estritamente as palavras `'os'` e `'status'`. Se o arquivo contiver `'Situação'`, `'Situacao'`, `'Ordem de Serviço'` ou `'N° OS'` (com símbolo de grau), a detecção falhava e lançava erro.
   - **Causa Raiz 2 (Mapeamento de Loja)**: No dicionário de aliases `KNOWN_ACCOUNT_DEFAULTS` (`useStoreFileMappings.ts`), faltavam aliases frequentes dessas lojas (`BRASICAR`, `brasicar`, `Planalto (BRASICAR)`, `Rei do Módulo`, `REI DO MODULO`). Se o parser capturasse `res.storeAlias = "BRASICAR"`, o `mapping[res.storeAlias]` falhava, caindo no fallback `'st-default'`, desvinculando as OSs da loja `st-06` (Planalto) ou `st-09` (Rei do Módulo).
   - **Causa Raiz 3 (Mascaramento de Erro)**: Em `centralImportManager.ts`, quando `processOsFiles` falhava, o erro original da OS era descartado e o arquivo caía em cascata para maquininha genérica, emitindo a mensagem genérica: *"Arquivo ignorado: Não é OS, Rede, Contas nem Maquininha reconhecida"*.

2. **Poluição Visual na Tela de Atualização Manual de OSs**:
   - Atualmente, no Fechamento Manual (`Fase1PatioOsReview.tsx` / `PatioExcelStoreAccordion.tsx`), a sanfona carrega e renderiza **todas as OSs da loja** (incluindo 50+ OSs normais já finalizadas que vieram no relatório importado).
   - O operador precisa rolar por dezenas de OSs desnecessárias apenas para encontrar as 2 ou 3 OSs que **NÃO vieram no relatório** (OSs remanescentes em pátio, OSs antigas em aberto ou veículos sem relatório) para dar baixa ou atualizar valores manualmente.

---

## Solução Proposta (Foco em Reuso e Correção)

### 1. Robustez no Parser de OS (`useOsImportProcessor.ts`)
- Aumentar o escopo de busca de cabeçalho de 20 para 60 linhas (`Math.min(60, data.length)`).
- Flexibilizar a identificação de cabeçalho:
  - Coluna de OS: `/^(os|n[ºo°.]?\s*os|n[ºo°.]?\s*da\s*os|n[úu]mero\s*(?:da\s*)?os|ordem\s*de\s*servi[çc]o|c[óo]d(?:igo)?(?:\s*os)?)$/i`.
  - Coluna de Situação: `/^(status|situa[çc][ãa]o|sit\b|estado|fase)$/i`.
- Normalizar matching de colunas numéricas (remover pontuações como `Vlr. Total`, `Vl. Total`, `Valor (R$)`).
- Ampliar regex de captura de `storeAlias` para extrair corretamente `BRASICAR`, `Planalto`, `Rei do Módulo`.

### 2. Dicionário de Aliases Completo (`useStoreFileMappings.ts` e `storeMapping.ts`)
- Adicionar explicitamente as variantes:
  - `st-06` (Planalto): `'BRASICAR'`, `'brasicar'`, `'Brasicar'`, `'Planalto (BRASICAR)'`, `'Mecanica Brasicar'`, `'06 - PLANALTO'`.
  - `st-09` (Rei do Módulo): `'Rei do Módulo'`, `'Rei do Modulo'`, `'REI DO MODULO'`, `'Mecanica Rei do Modulo'`, `'09 - REI DO MODULO'`.
- Normalização prévia (lowercase e remoção de acentos) para evitar quebras por discrepâncias cosméticas.

### 3. Modo "Apenas Fora do Relatório" no Accordion (`PatioExcelStoreAccordion.tsx` e `Fase1PatioOsReview.tsx`)
- Ao importar os arquivos na Fase 1, computar o conjunto de OSs que vieram no relatório (`importedOsKeys = Set<"${store_id}_${os_number}">`).
- Marcar em cada item:
  - `isMissingFromReport: !importedOsKeys.has(`${store_id}_${os_number}`)`
  - `isFromReport: importedOsKeys.has(`${store_id}_${os_number}`)`
- No `PatioExcelStoreAccordion.tsx`:
  - Adicionar um **Segmented Control / Pílulas de Filtro**:
    - `[⚠️ Apenas Fora do Relatório (X)]` (Default quando houver OSs fora do relatório)
    - `[📋 Todas as OSs (Y)]`
  - No modo "Apenas Fora do Relatório", a sanfona de cada loja exibe apenas as ordens que necessitam de intervenção/atualização manual.
  - Se todas as OSs daquela loja vieram no relatório, exibe empty state elegante:
    *"✅ Todas as OSs desta filial vieram no relatório. Nenhuma pendência manual."*
  - Botões de ação rápida em cada linha: **"Dar Baixa"** (quitar OS) e **"Manter no Pátio"**, além do popover de formas de pagamento.
  - **Garantia Arquitetural**: Os KPIs de topo e da loja continuam somando a totalidade das OSs (o filtro é exclusivamente visual na tabela).

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)
- **Tabelas / RPCs Existentes Encontradas:**
  - `public.patio_os`: tabela canônica de ordens de serviço.
  - `public.batch_upsert_patio_os`: RPC atômica em `supabase/migrations/20260902000020_create_batch_upsert_patio_os.sql` já realiza merge não-regressivo de OSs e quitação de saldo.
  - **Zero novas tabelas ou migrations necessárias**: 100% de reuso de backend.
- **Componentes / Hooks Existentes Encontrados:**
  - `src/hooks/useOsImportProcessor.ts`: parser oficial de OS, será estendido com tolerância de cabeçalho e aliases.
  - `src/hooks/useStoreFileMappings.ts`: catálogo de mapeamento de filiais, será enriquecido com as variações de Planalto e Rei do Módulo.
  - `src/components/importacoes/manual/Fase1PatioOsReview.tsx`: orquestrador da Fase 1, passará a computar `importedOsKeys` e carregar passivo pendente.
  - `src/components/importacoes/patio/PatioExcelStoreAccordion.tsx`: sanfona visual estilo Excel, ganhará segmented control de filtro e empty state por filial.

---

## Contratos de Dados & SQL (Supabase)
- Nenhuma alteração de schema DDL é necessária.
- A persistência continua utilizando a RPC canônica:
  ```sql
  SELECT public.batch_upsert_patio_os(
    p_store_id := 'st-06',
    p_target_date := '2026-09-03',
    p_os_records := '[{"os_number": "1663", "total_value": 7400, ...}]'::jsonb
  );
  ```

---

## API & Componentes (Frontend)

### Tipagem em `PatioExcelStoreAccordion.tsx`:
```typescript
export type PatioFilterMode = 'outside_report' | 'all';

export interface EditablePatioOsItem {
  id: string;
  os_number: string;
  store_id: string;
  store_name: string;
  client_name: string;
  plate: string;
  total_value: number;
  paid_value: number;
  pending_value: number;
  days_open: number;
  opened_at: string;
  status: 'em_aberto' | 'pago_parcial' | 'finalizada' | 'cancelada';
  payment_method: PaymentMethodOption;
  debit_value?: number;
  credit_value?: number;
  pix_transfer_value?: number;
  cash_value?: number;
  isModified?: boolean;
  isNewManual?: boolean;
  // Campos de controle de relatório
  isMissingFromReport?: boolean;
  isFromReport?: boolean;
}
```

---

## Risco Principal e Mitigação
- **Risco**: Filtrar a lista visual e acidentalmente corromper o cálculo de totalizadores de faturamento da loja ou salvar apenas as OSs filtradas, descartando as outras.
- **Mitigação**: Segregação estrita no React:
  1. `osItems` permanece a fonte master de verdade e totalizadores agregam sempre sobre a lista completa.
  2. A filtragem `filterMode` atua exclusivamente dentro de `useMemo` na lista de linhas renderizadas (`filteredItems`).
  3. O salvamento `handleSaveChanges` itera sobre `osItems.filter(i => i.isModified)`, garantindo persistência atômica e independente da visualização ativa.
