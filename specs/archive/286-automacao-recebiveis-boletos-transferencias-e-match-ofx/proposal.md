# Proposal: Automação de Recebíveis para Boletos e Transferências Bancárias com Match OFX (286)

## Problema
Atualmente, quando uma Ordem de Serviço (OS) é finalizada com formas de pagamento a prazo ou bancárias — tais como **Boleto Bancário** (ex: 2x, 30/60 dias) ou **Transferência Bancária / Débito em Conta / TED / DOC / Depósito Identificado** —, o parser de importação de OSs (`useOsImportProcessor.ts`) extrai a OS mas **não popula a entidade de Recebíveis** (`receivablesArray` fica vazio).

Isso causa dois problemas graves no ecossistema:
1. **Falta de Visibilidade e Intervenção Manual:** Os títulos a receber (boletos e transferências programadas) não aparecem na tela de Recebíveis (`/recebiveis`), exigindo que o operador cadastre manualmente cada boleto e cada transferência bancária.
2. **Divergência e Falha de Conciliação no Extrato:** Quando a transferência bancária ou a liquidação do boleto finalmente cai no extrato bancário OFX da loja (em D+1, D+2 ou na data de vencimento), o sistema de conciliação não tem o recebível registrado para efetuar a baixa automática ou sugerir o vínculo, gerando depósitos órfãos no OFX e mantendo a dívida pendente.

## Solução Proposta
1. **Extrator Inteligente de Formas de Pagamento em OSs (`useOsImportProcessor.ts`):**
   - Identificar automaticamente pagamentos que não sejam à vista imediatos (Dinheiro, PIX instantâneo, Cartão de Crédito ou Cartão de Débito).
   - Classificar e separar em:
     - **Boleto:** Extrair parcelamento (ex: `2x`, `3x`, `30/60`, `1/2`, `2/2`), dividindo o valor total em parcelas numeradas com vencimentos progressivos (D+30, D+60, etc.).
     - **Transferência Bancária / Débito em Conta / TED / DOC / Depósito:** Gerar recebível com prazo de compensação bancária (D+1 dia útil).
2. **Motor de Calendário Bancário e Dias Úteis (Febraban / BACEN):**
   - Utilitário `bankingCalendar.ts` que calcula prazos considerando feriados nacionais brasileiros e finais de semana (prorrogação para o primeiro dia útil subsequente).
3. **Persistência Idempotente no PostgreSQL (`savePatioOsAndReceivables`):**
   - Gravar os títulos gerados na tabela `public.receivables` com `os_number`, `installment`, `store_id`, `description`, `value`, `date` e `due_date`.
   - Garantir idempotência estrita para que re-importações do mesmo arquivo de OS não dupliquem títulos e não sobrescrevam títulos já recebidos.
4. **Isolamento Contábil contra Dupla Contagem:**
   - OSs que geram recebíveis a prazo têm seus valores deduzidos do pátio físico (`patio_os` / Pilar 4 Na Loja OS) e migrados exclusivamente para o **Pilar 3 (A Receber)**.
5. **Motor de Baixa Automática e Match Inteligente (RPC `auto_match_receivables`):**
   - RPC no Supabase que cruza créditos do extrato OFX (`type = 'in'`) com recebíveis pendentes da respectiva loja por valor e janela de data de vencimento, atualizando `status = 'recebido'`, `received_at = ofx.target_date` e `matched_ofx_id = ofx.id`.
   - Na tela de Recebíveis (`/recebiveis`), exibir indicador de match sugerido para confirmação em 1 clique quando o descritivo for genérico (`LIQ COBRANCA`).

## Contratos de Dados
- **Tabela:** `public.receivables` (existente)
  - `id`: uuid (PK)
  - `store_id`: text (FK stores)
  - `store_name`: text
  - `os_number`: text (novo index / preenchimento obrigatório quando oriundo de OS)
  - `installment`: text (ex: '1/2', '2/2', '1/1')
  - `type`: 'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Outros'
  - `value`: numeric(15,2)
  - `paid_value`: numeric(15,2) (preenchido na liquidação)
  - `discount_value`: numeric(15,2) (tarifas bancárias/descontos)
  - `interest_value`: numeric(15,2) (juros/multas)
  - `status`: 'pendente' | 'recebido' | 'vencido' | 'cancelado'
  - `date`: date (data de emissão/abertura da OS)
  - `due_date`: date (data de vencimento calculada em dia útil)
  - `received_at`: timestamptz (data da liquidação no OFX)
  - `matched_ofx_id`: uuid (FK ofx_transactions)
  - `description`: text (Ex: "OS #2326 - Parcela 1/2 - Boleto 30D")

## API / RPCs
- **Nova RPC / Endpoint:** `public.auto_match_receivables(p_store_id text DEFAULT NULL, p_date date DEFAULT NULL)`
  - Varre transações OFX de entrada não conciliadas e títulos de recebíveis pendentes, executando o match de alta confiança.
- **RPC Atualizada:** `public.get_receivables_summary(p_date date)`
  - Mantida agregando 100% no PostgreSQL para a tela de recebíveis e painel de conciliação.

## Features Existentes Impactadas
- `src/hooks/useOsImportProcessor.ts`: Inclusão da extração de `receivablesArray`.
- `src/hooks/useImportProcessor.ts`: Persistência completa com `os_number` e `installment`.
- `src/routes/recebiveis.tsx` e `src/hooks/useRecebiveis.ts`: Exibição de parcelas e integração com o motor de auto-match.
- `public.get_daily_reconciliation_summary`: Preservação matemática do Pilar 3 (A Receber) e Pilar 4 (Na Loja OS).

## Risco Principal
- **Risco:** Falsos positivos no match de boletos com descritivos bancários genéricos (`LIQ.COBRANCA`) quando há múltiplos boletos de mesmo valor na mesma data.
- **Mitigação:** Modelo em 3 camadas: match automático apenas quando houver evidência forte (OS/Nome no memo ou unicidade estrita de valor na data) e sugestão visual 1-click para casos ambíguos.
