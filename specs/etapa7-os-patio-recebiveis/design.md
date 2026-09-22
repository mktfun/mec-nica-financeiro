# Design — Etapa 7: Estruturação de OS (Pátio & Recebíveis)

## 1. Arquitetura do Pátio & Caixa Atual
O Caixa Atual é a soma dos 4 ativos circulantes menos os passivos de curto prazo:
```text
Caixa Atual = (Saldo Bancos Positivo + Dinheiro MP + A Receber + Pátio na Loja OS) - Cheque Especial Itaú
```
Para o dia 17/09/2026:
- Saldo Bancos Positivo: R$ 166.170,25
- Dinheiro MP: R$ 28.316,00
- A Receber: R$ 6.929,67
- **Pátio na Loja OS: R$ 74.433,57**
- Cheque Especial Itaú: (-) R$ 15.306,84
- **Total Caixa Atual: R$ 260.542,65**
- Caixa Anterior (16/09): R$ 243.755,67
- **Fluxo de Caixa: +R$ 16.786,98**

> [!IMPORTANT]
> O valor de **R$ 74.433,57** reflete rigorosamente as 35 ordens de serviço em aberto ou parcialmente pagas na oficina. Alterar ou zerar esse valor desequilibra toda a equação contábil.

## 2. Modelagem Estruturada de Pagamento na Tabela `os_orders` / `patio_os`
```sql
ALTER TABLE patio_os
  ADD COLUMN IF NOT EXISTS payment_dinheiro numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_debito numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_credito numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_pix numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_boleto numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_transferencia numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_em_aberto numeric DEFAULT 0;
```

## 3. Lógica de Pátio na RPC `get_daily_reconciliation_summary`
```sql
-- Pátio Ativo (WIP): Apenas OSs não finalizadas/não canceladas com saldo devedor
SELECT COALESCE(SUM(total_value - paid_value), 0) INTO v_na_loja_os
FROM patio_os
WHERE status IN ('em_aberto', 'pago_parcial')
  AND opened_at::date <= v_target_date::date;

-- Fallback protetivo de snapshot:
IF v_na_loja_os = 0 AND v_snapshot_found AND COALESCE(v_snapshot.total_patio, 0) > 0 THEN
    v_na_loja_os := v_snapshot.total_patio;
END IF;
```

## 4. Cenários Obrigatórios
- **Happy Path:** Usuário abre a Conciliação de 17/09/2026. O card exibe `R$ 74.433,57`. Ao clicar em "Ver OSs", abre a gaveta detalhando as 35 ordens que compõem o saldo. O Caixa Atual bate R$ 260.542,65 e o Fluxo de Caixa bate R$ 16.786,98.
- **Edge Case (Importação de Planilha do Dia):** Durante a importação de novas planilhas `ConferenciaOSxFinanceiro.xls`, o sistema não sobrescreve o saldo histórico com zero caso a planilha contenha apenas OSs faturadas (status FIN).

## 5. Critérios de Aceitação Verificáveis
1. O valor de `na_loja_os` retornado pela RPC para 17/09/2026 é exatamente `R$ 74.433,57`.
2. A soma `(Saldo Bancos + Dinheiro MP + A Receber + Pátio) - Cheque Especial` totaliza exatamente `R$ 260.542,65`.
3. `npm run build` passa sem erros de tipagem.
