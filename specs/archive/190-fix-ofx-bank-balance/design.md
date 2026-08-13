# Design: fix-ofx-bank-balance-and-os-pending-values (190)

## Arquitetura Técnica
O fluxo ajustado consiste em duas pontas principais: 
1. **Frontend Parser (OFX)**: O momento da leitura do arquivo OFX no lado do cliente será interceptado por uma verificação condicional que detecta a ausência de decimais e saldos inflacionados. Se `<BALAMT>` for importado sem vírgula/ponto, será submetido a uma divisão protetora (por `100.0`). O valor viaja para o backend sanitizado na chave `storeBankBalances`.
2. **Backend Postgres (Agregação RPC)**: Ao executar a consolidação do dia (`calculate_daily_conciliation` ou `get_dashboard_metrics`), a CTE temporária de agregação da tabela `patio_os` filtra ativamente OSs em estado morto/finalizado (`'finalizado'`, `'PAGO'`, `'cancelado'`, `'em_separacao'`, etc) para extrair o valor líquido pendente, mantendo a integridade da equação.

## Interfaces TypeScript
Nenhuma mudança na interface. Apenas lógica condicional no `ofxParser.ts`.

## Componentes / Hooks / Funções
- `src/lib/parsers/ofxParser.ts`: Na função `parseOFXFile`, capturar `balStr` antes de passar pro `extractNumber` e validar a presença de ponto decimal. 
- `supabase/migrations/<timestamp>_fix_ofx_bank_balance.sql`:
  - Substituição (CREATE OR REPLACE) das funções `calculate_daily_conciliation(p_date date)` e `get_dashboard_metrics(p_date date)` adicionando `AND LOWER(status) IN ('em_aberto', 'pago_parcial', 'pendente')` ou `NOT IN ('finalizada', 'pago', 'cancelada')` (de acordo com os status vigentes na base de dados, checaremos no apply).
  - Script UPDATE de sanitização de saldos corrompidos em `reconciliations` (onde `bank_total > 500000`).

## Fluxo de UI
A experiência do usuário (UX) e as métricas visuais voltarão a apresentar normalidade, permitindo a finalização dos dias pendentes da implantação do Marco Zero sem falsos pânicos.

## Infra / Deploy
Sem necessidade de alteração na infra. O deploy padrão via Lovable + backend Supabase prossegue inalterado.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Importar arquivo OFX com `<BALAMT>1309322`. O sistema reconhece como centavos literais e armazena R$ 13.093,22.
- **Cenário 2:** Importar arquivo OFX da loja Kennedy com `<BALAMT>4585.00` ou `<BALAMT>4585`. O sistema armazena R$ 4.585,00 sem reduzir para 45,85.
- **Cenário 3:** Executar `calculate_daily_conciliation` com uma OS marcada como "finalizada" mas com valor pendente 100 reais de resquício na modelagem. O sistema agregará como peso 0, ignorando o "Na Loja OS" morto.
