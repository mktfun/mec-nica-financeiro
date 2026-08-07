﻿# Design: Database Cleanup & Split Architecture (119)

## Arquitetura Técnica
A camada de dados abandona a tabela universal \	ransactions\ para o que nÁo for lançamento manual e cria instâncias tipadas rígidas, removendo a necessidade do campo \source\. A tabela \	ransactions\ se tornará \manual_transactions\ (ou semelhante) dedicada apenas ao que for digitado/XLSX.
As auditorias da plataforma perderÁo 10 tabelas legadas e usarÁo uma única \system_logs\ com expiraçÁo via \pg_cron\.

**Fluxo de ImportaçÁo:**
1. \CentralImportWizard\ processa OFX -> Chama \ulkInsertOfx\ -> Salva em \ofx_transactions\.
2. \CentralImportWizard\ processa Rede -> Chama \ulkInsertPos\ -> Salva em \pos_transactions\ (e \eceivables\ se a regra for manter duplo).
3. \CentralImportWizard\ / Bot / Edge Functions -> Enviam eventos de telemetria para \system_logs\.
4. Uma query agendada de banco limpa os logs todos os dias à meia-noite (TTL).

## Interfaces Supabase

`sql
-- 1. CriaçÁo da Tabela de Extratos Bancários Reais
CREATE TABLE ofx_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES stores(id),
    bank_name TEXT NOT NULL,
    type TEXT CHECK (type IN ('in', 'out')),
    amount NUMERIC NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    fitid TEXT NOT NULL,
    counterpart_name TEXT,
    cnpj_cpf TEXT,
    matched_os_number TEXT,
    import_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(store_id, fitid)
);

-- 2. CriaçÁo da Tabela de Maquininhas (Crédito/Débito)
CREATE TABLE pos_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id TEXT REFERENCES stores(id),
    machine_name TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    gross_amount NUMERIC NOT NULL,
    net_amount NUMERIC NOT NULL,
    fee_amount NUMERIC NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    matched_os_number TEXT,
    import_batch_id UUID,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CriaçÁo do Central Logger com TTL
CREATE TABLE system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL,
    context TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- pg_cron para TTL de 1 dia em logs
SELECT cron.schedule('clean_system_logs', '0 0 * * *', 'DELETE FROM system_logs WHERE created_at < now() - interval ''1 day'';');
`

## Cenários de VerificaçÁo (SCAN -> INFER -> VERIFY -> FIX)
- **Cenário 1 (MigraçÁo):** Tentar aplicar o \DROP\ em massa e falhar por Constraints (ex: Foreign Keys presas em outras tabelas). *SoluçÁo:* Mapear as dependências e derrubar CASCADE, e reescrever a \	ransactions\ legada para \manual_transactions\.
- **Cenário 2 (Dashboard quebrado):** As métricas financeiras (DashboardV2, RPC) ficarem nulas pois tentam ler da tabela \	ransactions\. *SoluçÁo:* Reescrever \get_dashboard_metrics\ para somar \mount\ das 3 tabelas (\ofx_transactions\, \pos_transactions\, e \manual_transactions\) com \UNION ALL\ ou subqueries específicas.
