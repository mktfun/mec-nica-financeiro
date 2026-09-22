# Design: Alinhamento Cirúrgico do Fechamento Diário vs Planilha Excel 16/09 (412)

## 1. Fluxo de Dados e Regra Estrita de Segregação

```
[Arquivos Físicos 16/09]
        │
        ├── Pátio: Abatimento de OS 1112 (-3.423,96) e OS 422 (-1.349,60)
        │     └── Pátio Líquido = R$ 78.649,98 (G6)
        │
        ├── Card Principal "Saldo" (100% Positivos Líquidos):
        │     ├── Bancos Positivos: R$ 148.044,32 (G3) [Inclui Mauá: +445,11]
        │     ├── Dinheiro em Lojas (Cofre): [Exibido no subcard]
        │     └── Rede a Compensar: [Exibido no subcard]
        │     └── TOTAL DO CARD = Soma estrita de positivos
        │
        ├── Raio-X Modal (Visibilidade Analítica):
        │     └── Cheque Especial Itaú: R$ 18.184,30 (G8, Planalto: 17.442,24 + Jabaquara: 742,06)
        │         * Não subtrai do card Saldo
        │         * Não interfere no cálculo de divergência das lojas
        │
        ├── Dinheiro MP:
        │     └── Saldo de Cofre Central: R$ 28.316,00 (G4)
        │
        └── Caixa Atual (ÚNICO lugar onde o Cheque Especial é deduzido):
              ├── Ativos: 148.044,32 + 28.316,00 + 6.929,67 + 78.649,98 = 261.939,97 (G7)
              ├── Dedução Cheque Especial: 261.939,97 - 18.184,30 = 243.755,67 (G11)
              │
              └── Consolidação DRE:
                    ├── Caixa Anterior: 237.345,54 (G12)
                    ├── Fluxo de Caixa: 243.755,67 - 237.345,54 = 6.410,13 (G13)
                    ├── Faturamento: 48.858,41 (G16)
                    ├── Disponível: 48.858,41 - 6.410,13 = 42.448,28 (G19)
                    ├── Contas + Juros: 40.118,13 + 2.332,92 = 42.451,05 (G20)
                    └── Diferença Final: 42.448,28 - 42.451,05 = -R$ 2,77 (G21)
```

---

## 2. Mutações em Arquivos Existentes [MODIFY]

### A. `supabase/migrations/20260916000002_fix_reconciliation_math_excel_alignment.sql`
- Modificação na RPC `public.get_daily_reconciliation_summary`:
  - Card Saldo (`total_saldo_banco_positivo`) retém estritamente os ativos positivos.
  - Cheque Especial (`saldo_negativo_itau`) é retornado isolado para o Raio-X e deduzido exclusivamente no cálculo de `v_caixa_atual`.
  - Mauá apurada com saldo positivo (+R$ 445,11) em `stores_detail` e na soma positiva.

### B. `supabase/` (Atualização direta nos registros existentes)
- Atualização em `patio_os`:
  - `os_number = '1112'`: `paid_value = 3423.96`, `status = 'pago_parcial'`.
  - `os_number = '422'`: `paid_value = 1349.60`, `status = 'finalizado'`.
- Atualização em `daily_snapshots`:
  - `date = '2026-09-16'`: `dinheiro_mp = 28316.00`, `caixa_atual = 243755.67`, `faturamento = 48858.41`, `total_patio = 78649.98`.
