# Design: Alinhamento Matemático Estrito do Fechamento Diário vs Planilha Excel 16/09 (412)

## 1. Arquitetura e Fluxo de Dados

```
[31 Arquivos Brutos (OFX, OS, Rede, Contas)]
               │
               ▼
[Importação & Normalização (Wizard)]
  ├── Pátio OS: Aplica baixa parcial/total de OSs liquidadas fora do relatório
  │     ├── OS 1112 (JB): Abate R$ 3.423,96 (Crédito Link) -> Restante: R$ 150,50
  │     └── OS 422 (JAB): Baixa R$ 1.349,60 (PIX) -> Restante: R$ 0,00
  │     └── Total Pátio: R$ 78.649,98 (Bate com G6 da aba SALDO)
  │
  ├── Bancos & Rede:
  │     ├── Consolidação por Loja: Saldo OFX + Cartões creditados na data
  │     ├── Mauá: -3.981,72 + 4.426,83 = +445,11 (Passa a ser positivo)
  │     ├── Bancos Positivos: R$ 148.044,32 (Bate com G3)
  │     └── Saldo Negativo Itaú: R$ 18.184,30 (Bate com G8)
  │
  ├── Dinheiro MP:
  │     └── Saldo atualizado do cofre central: R$ 28.316,00 (Bate com G4)
  │
  └── DRE & Contas:
        ├── Faturamento: R$ 48.858,41 (Odômetro: 495.168,08 - 446.309,67)
        ├── Caixa Atual: R$ 243.755,67 (Ativos R$ 261.939,97 - Cheque Esp. R$ 18.184,30)
        ├── Fluxo de Caixa: R$ 243.755,67 - R$ 237.345,54 = R$ 6.410,13
        ├── Disponível: R$ 48.858,41 - R$ 6.410,13 = R$ 42.448,28
        ├── Contas + Juros: R$ 40.118,13 + R$ 2.332,92 = R$ 42.451,05
        └── Diferença Final: R$ 42.448,28 - R$ 42.451,05 = -R$ 2,77 (STATUS: APPROVED)
```

---

## 2. Mutações e Ajustes Específicos

### A. Database / RPC `get_daily_reconciliation_summary`
- Implementar suporte ao cálculo de Saldo Efetivo por Loja (`bank_total + card_settled`), permitindo que lojas com saldo bancário compensado por vendas de cartão transitem de devedoras para credoras de forma fidedigna ao modelo de tesouraria do Excel.
- Deduplicar arquivos de importação de cartão pela chave composta `(nsu, autorizacao, estabelecimento, valor_bruto)`.
- Respeitar os abates manuais ou vinculações de pagamentos de OSs em `patio_os`.

### B. Frontend / `CentralImportWizard.tsx` & `PatioManualStoreGrid.tsx`
- No Step 1.5 (Gestão de Pátio), disponibilizar na listagem de OSs abertas o botão de "Abater Pagamento" (informando valor e forma, como o cartão link de R$ 3.423,96 na OS 1112 e o PIX de R$ 1.349,60 na OS 422).
- Atualizar o cálculo de `total_patio` para somar estritamente `SUM(total_value - paid_value)` com as deduções ativas.

### C. Fechamento e Snapshot
- No card de fechamento da tesouraria, permitir que o operador atualize o `dinheiro_mp` para o valor real apurado no cofre (R$ 28.316,00).

---

## 3. Cenários de Verificação (SCAN -> INFER -> VERIFY -> FIX)

### Cenário 1: Reconciliação do Pátio (Carros na Loja)
- **SCAN**: Verificar `total_patio` de todas as lojas após abate da OS 1112 e baixa da OS 422.
- **INFER**: A soma de todas as lojas deve ser exatamente R$ 78.649,98.
- **VERIFY**: Query em `patio_os` filtrando OSs com saldo pendente agrupadas por `store_id`.
- **FIX**: Persistir os valores abatidos e sincronizar o snapshot.

### Cenário 2: Reconciliação do Saldo Geral e Diferença Final
- **SCAN**: Invocar `get_daily_reconciliation_summary('2026-09-16')`.
- **INFER**: `caixa_atual` deve resultar em R$ 243.755,67 e `diferenca_final` deve ser de -R$ 2,77.
- **VERIFY**: Comparação campo a campo com os valores das células `G11` e `G21` da planilha.
