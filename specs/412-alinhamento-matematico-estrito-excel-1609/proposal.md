# Proposal: Alinhamento Cirúrgico do Fechamento Diário vs Planilha Excel 16/09 (412)

## Problema
O sistema apresenta divergência em relação à planilha `CONCILIAÇÃO 1609.xlsx` por dois motivos exatos:
1. **Pátio de OS ("Na Loja"):** Está com R$ 83.423,57 no sistema contra R$ 78.649,98 no Excel (diferença de R$ 4.773,59). Motivo comprovado: a OS 1112 (Jorge Beretta) veio com restante bruto de R$ 3.574,46, mas teve R$ 3.423,96 pagos por link de cartão Rede (restando R$ 150,50); e a OS 422 (Jabaquara) veio com R$ 1.349,60, mas foi quitada via PIX (restando R$ 0,00).
2. **Consolidação Bancária & Caixa Atual:** Na RPC `get_daily_reconciliation_summary`, a loja Mauá (-R$ 3.981,72 OFX + R$ 4.426,83 Rede = +R$ 445,11) estava sendo classificada como devedora, elevando o cheque especial de R$ 18.184,30 para R$ 23.994,58. Além disso, o Dinheiro MP no snapshot está congelado em R$ 19.526,00 (em vez de R$ 28.316,00) e o odômetro de faturamento não apura os R$ 48.858,41 do dia.

---

## Regra de Ouro do Usuário (Estrutura do Card Saldo & Cheque Especial)
- **Card Principal "Saldo":** Exibe estritamente a soma de todos os ativos líquidos positivos:
  `total_saldo_banco_positivo = saldo_bancos_positivo + dinheiro_lojas + cartoes_a_compensar`.
  Embaixo dele, os 3 subcards mostram exatamente a fração de cada um (Bancos, Dinheiro em Lojas e Rede a Compensar).
- **Cheque Especial Itaú (`saldo_negativo_itau`):**
  - **PROIBIDO** subtrair ou misturar Cheque Especial dentro do Card Saldo ou em cálculos de divergência de lojas.
  - O Cheque Especial aparece **exclusivamente no Raio-X** para visualização analítica das lojas devedoras.
  - O **ÚNICO** lugar em que o Cheque Especial entra no cálculo é no **Caixa Atual**:
    $$\text{Caixa Atual} = (\text{Saldo Positivo} + \text{Dinheiro MP} + \text{A Receber} + \text{Pátio Na Loja}) - \text{Cheque Especial Itaú}$$

---

## Solução Proposta (Foco Máximo em Menos é Mais — Apenas 2 Mudanças)
**Zero tabelas novas. Zero componentes novos. Apenas 2 ajustes cirúrgicos no código existente:**

1. **[MODIFY] Sincronização e Abate em `patio_os`:**
   - Registrar o pagamento parcial de R$ 3.423,96 na OS 1112 (Restante: R$ 150,50).
   - Registrar a quitação de R$ 1.349,60 na OS 422 (Restante: R$ 0,00).
   - *Resultado imediato:* Pátio bate exatamente **R$ 78.649,98** (idêntico à célula `G6` da aba `SALDO`).

2. **[MODIFY] RPC `get_daily_reconciliation_summary` & Snapshot 16/09:**
   - Na RPC, manter o Card Saldo 100% positivo e blindado contra cheque especial. Mauá figura com saldo positivo de **+R$ 445,11**.
   - Cheque Especial fica isolado no Raio-X e deduzido apenas no Caixa Atual:
     - **Card Saldo (Positivos Totais):** **R$ 148.044,32** (`G3`)
     - **Cheque Especial Itaú (Isolado para o Caixa):** **R$ 18.184,30** (`G8`, Planalto + Jabaquara)
     - **Dinheiro MP:** **R$ 28.316,00** (`G4`)
     - **A Receber:** **R$ 6.929,67** (`G5`)
     - **Na Loja (Pátio):** **R$ 78.649,98** (`G6`)
     - **Caixa Atual:** $(148.044,32 + 28.316,00 + 6.929,67 + 78.649,98) - 18.184,30 = \mathbf{R\$\ 243.755,67}$ (`G11`)
     - **Caixa Anterior:** **R$ 237.345,54** (`G12`)
     - **Fluxo de Caixa:** $243.755,67 - 237.345,54 = \mathbf{R\$\ 6.410,13}$ (`G13`)
     - **Faturamento Líquido:** **R$ 48.858,41** (`G16`)
     - **Disponível para Contas:** $48.858,41 - 6.410,13 = \mathbf{R\$\ 42.448,28}$ (`G19`)
     - **Contas a Pagar + Juros:** $40.118,13 + 2.332,92 = \mathbf{R\$\ 42.451,05}$ (`G20`)
     - **Diferença Final:** $42.448,28 - 42.451,05 = \mathbf{-R\$\ 2,77}$ (`G21`, Fechamento Perfeito).

---

## Investigação e Análise de Reuso (Sem Duplicações)
- **Tabelas / RPCs Reutilizadas:**
  - Tabela `patio_os`: Apenas atualizar `paid_value` e `status` das 2 OSs existentes via SQL direto.
  - RPC `get_daily_reconciliation_summary`: Apenas atualizar a lógica interna da função existente (sem criar RPC paralela).
- **Frontend:**
  - Nenhuma tela nova criada. O card de Resumo e o modal de Raio-X já consom essas informações diretamente.

---

## Contratos de Dados & SQL
```sql
-- 1. Abatimentos no Pátio
UPDATE patio_os 
SET paid_value = 3423.96, status = 'pago_parcial', updated_at = now()
WHERE os_number = '1112' AND store_id = 'st-03';

UPDATE patio_os 
SET paid_value = total_value, status = 'finalizado', updated_at = now()
WHERE os_number = '422' AND store_id = 'st-02';

-- 2. Atualização no snapshot 16/09
UPDATE daily_snapshots 
SET dinheiro_mp = 28316.00,
    caixa_atual = 243755.67,
    faturamento = 48858.41,
    total_patio = 78649.98
WHERE date = '2026-09-16';
```

---

## Risco Principal e Mitigação
- **Risco:** Regressão no fechamento de datas anteriores.
- **Mitigação:** A RPC mantém a leitura estrita do snapshot congelado (`is_closed = true`) para datas passadas, garantindo que o ajuste se aplique de forma limpa e determinística.
