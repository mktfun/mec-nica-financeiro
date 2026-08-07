# Proposal: CorreçÁo de Crash ao Importar Arquivos do Dia 23 (fix-day23-crash)

## Problema
Ao tentar importar a pasta de arquivos do dia 23 (`concilia1`), a página do navegador travava completamente ("Página nÁo responde" / crash). A causa raiz foi identificada: a pasta continha uma planilha consolidada manual (`CONCILIAÇÁO 2307.xlsx`) de **2.915 linhas** dividida em abas (`SALDO`, `OS`, `RECEBIVEIS `, `CARTORIO`). O motor de importaçÁo tentava parsear essa planilha consolidada como se fosse um relatório bruto da Rede/Pátio em um loop síncrono no event loop, estourando a memória e congelando a UI.

## SoluçÁo Proposta
1. **Filtro Inteligente de Planilhas Consolidadas:**
   - Detectar e ignorar automaticamente planilhas cujo nome inicie por `CONCILIAÇÁO`, `CONCILIACAO`, `RESUMO` ou que possuam a estrutura de abas de fechamento (`SALDO`, `CARTORIO`).
   - Exibir aviso amigável informando que a planilha consolidada foi ignorada para segurança do navegador.
2. **Filtragem Estrita por Modo de ImportaçÁo (Step 1):**
   - **Modo `rede`:** Processar exclusivamente arquivos do relatório da Rede (`Rede_Rel_Vendas...` ou com marca `EXTRATO PARA SIMPLES CONFERÊNCIA`).
   - **Modo `os`:** Processar exclusivamente planilhas de OS do pátio (`.xls` por loja).
   - **Modo `ofx`:** Processar exclusivamente arquivos `.ofx`.
3. **Async Chunking & ProteçÁo de Performance:**
   - Devolver o controle da UI ao event loop (`await new Promise(r => setTimeout(r, 0))`) a cada lote de linhas lidas.
   - Adicionar trava de limite de linhas para evitar estouro de heap do V8.

## Contratos de Dados
- Nenhuma alteraçÁo no schema do Supabase. Apenas resiliência de parsing no Frontend.

## Features Existentes Impactadas
- `src/hooks/useCentralImport.ts`
- `src/hooks/useOsImportProcessor.ts`
- `src/lib/parsers/redeParser.ts`
- `src/components/importacoes/CentralImportWizard.tsx`

## Risco Principal
Garantir que relatórios legítimos da Rede ou OSs com nomes incomuns nÁo sejam ignorados incorretamente (apenas planilhas consolidadas manuais como `CONCILIAÇÁO 2307.xlsx` serÁo filtradas).
