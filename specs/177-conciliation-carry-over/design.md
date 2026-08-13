# Design: Conciliation Infinite Carry-Over (177)

## Arquitetura Técnica
A mudança ocorre puramente no nível do Banco de Dados PostgreSQL (via migration do Supabase), corrigindo as RPCs de leitura.

1. Em `calculate_daily_conciliation(p_date date)`:
Substituir:
```sql
        IF v_has_historical THEN
            SELECT COALESCE(bank_total, 0), COALESCE(na_loja_os, NULL) 
            INTO v_faturamento_banco, v_historical_na_loja
            FROM reconciliations 
            WHERE store_id = store_record.id AND date = p_date
            LIMIT 1;
```
Por uma busca do último saldo conhecido (histórico do pátio já foi resolvido):
```sql
        SELECT EXISTS(SELECT 1 FROM reconciliations WHERE store_id = store_record.id AND date <= p_date) INTO v_has_historical;
        IF v_has_historical THEN
            SELECT COALESCE(bank_total, 0), COALESCE(na_loja_os, NULL) 
            INTO v_faturamento_banco, v_historical_na_loja
            FROM reconciliations 
            WHERE store_id = store_record.id AND date <= p_date
            ORDER BY date DESC
            LIMIT 1;
```

2. Em `get_conciliation_breakdown(p_store_id text, p_date date)`:
Substituir a checagem pontual por uma busca retroativa segura:
```sql
  SELECT EXISTS(
    SELECT 1 FROM reconciliations 
    WHERE store_id = p_store_id AND date <= p_date::text
  ) INTO v_has_snapshot;

  IF v_has_snapshot THEN
    SELECT COALESCE(bank_total, 0) INTO v_bank_total
    FROM reconciliations
    WHERE store_id = p_store_id AND date <= p_date::text
    ORDER BY date DESC
    LIMIT 1;
```

## Cenários de Verificação
- **Cenário 1:** Marco zero inserido dia 10 (Saldo Banco: R$ 5000). Dia 11 nenhum extrato é inserido (vazio). O usuário abre a conciliação do dia 12. O sistema deve puxar o saldo de R$ 5000 como `bank_total_source: snapshot_reconciliations` ao invés de pular para `realtime_ofx_transactions` e zerar.
