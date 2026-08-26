# Proposal: Preservação Total de Transações OFX e Herança de Conciliações Anteriores/Posteriores (291)

## Problema
Durante a importação de extratos bancários (OFX), especialmente após finais de semana, feriados prolongados ou períodos sem fechamento contínuo:
1. **Limitação de Regras "D-1":** Transações de sexta-feira, sábado ou feriados de 3 a 5 dias atrás vinham no lote de segunda-feira. Tratar apenas "D-1" quebrava o fluxo em segundas-feiras e pós-feriados.
2. **Perda de Rastreabilidade:** Transações que já foram conciliadas ou justificadas em uma **conciliação anterior (ou posterior)** reapareciam no lote como "Pendentes / Não Identificadas", gerando retrabalho do operador.
3. **Risco de Quebra Contábil:** Se o operador alterasse uma transação já homologada em outra data contábil, isso desbalanceava o Caixa e os relatórios históricos.

## Solução Proposta (Foco em Conciliações Anteriores e Posteriores)
1. **Zero Descarte de Lançamentos no Import:**
   - O assistente de importação (`CentralImportWizard.tsx`) e o parser (`ofxParser.ts`) processam 100% das transações contidas no arquivo OFX, preservando lançamentos de qualquer data (finais de semana, feriados ou datas retroativas).
2. **Herança Inteligente de Conciliações Anteriores e Posteriores:**
   - Para qualquer transação bancária (`fitid` / `store_id`):
     - O sistema consulta o histórico de conciliações (`transactions`, `justified_transactions`, `ofx_transactions`).
     - Se o lançamento já foi justificado ou vinculado a uma OS em **qualquer outra data contábil**:
       - Herda automaticamente o vínculo da OS, a categoria manual e o texto de justificativa.
3. **Trava de Segurança (Read-Only / Lock 🔒):**
   - Transações pertencentes a conciliações de outras datas recebem o status:
     - **`🔒 Conciliado em [DD/MM/AAAA]: [Categoria / OS]`**
   - Os botões de edição ("Vincular OS" e "Justificar") ficam bloqueados (somente leitura), exibindo o aviso de que o lançamento pertence ao fechamento daquela data específica.
4. **Filtro Nativo no Extrato:**
   - Barra de filtros com botão: **`[ 🔒 Outras Conciliações (N) ]`**, permitindo isolar instantaneamente transações que vieram de outras datas e já estão resolvidas.

## Contratos de Dados
- **Tabelas Envolvidas:** `public.transactions`, `public.ofx_transactions`, `public.justified_transactions`, `public.reconciliations`.
- **Chave de Cruzamento:** `fitid` + `store_id` ou chave determinística de transação.

## API / Interface
- `src/lib/parsers/ofxParser.ts`
- `src/components/importacoes/CentralImportWizard.tsx`
- `src/components/conciliacao/StoreExtratoBancarioView.tsx`

## Features Existentes Impactadas
- `StoreExtratoBancarioView.tsx` (exibição de lock de outras datas)
- Zero impacto no fechamento master e zero quebra em outros módulos.

## Risco Principal
- **Risco:** Confusão do operador ao ver lançamentos de 3 dias atrás na tela de hoje.
- **Mitigação:** Indicação visual clara com a data de conciliação original (`DD/MM/AAAA`) e badge com ícone de cadeado.
