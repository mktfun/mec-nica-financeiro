# Proposal: Correção de Total da OS vs Saldo Devedor no Pátio e Sincronização com CONCILIAÇÃO 0909.xlsx (383)

## Problema
Ao acessar a tela de importação e conciliação (especificamente a etapa *Veículos em Serviço no Pátio - Carryover* e painéis de OS), o sistema apresenta como **"VALOR TOTAL (R$)"** valores que, na realidade do ERP *Oficina Inteligente* e da planilha oficial de conciliação, correspondem estritamente ao **SALDO DEVEDOR (RESTANTE NA OS)**. Além disso, a coluna **"VALOR PAGO"** aparece zerada (`R$ 0,00`).

### Causa Raiz Identificada
1. **Distorção na Ingestão / Banco `patio_os`:**
   - No banco de dados (`patio_os`), registros de veículos remanescentes em pátio (ex.: OSs de agosto/virada de mês como #8763, #8689, #1818, #8762, #1856, #596) tiveram seu saldo em aberto (`open_value` / restante na loja) gravado erroneamente na coluna `total_value`, enquanto `paid_value` foi persistido como `0.00`.
   - Exemplo concreto: A OS #8763 possui valor total de **R$ 4.691,16** na planilha oficial de 09/09, mas constava no banco com `total_value = 1971.16` e `paid_value = 0.00`.
2. **Exibição Incorreta na UI (`MissingPatioOsEditor.tsx`):**
   - O componente exibe `item.total_value` como "Valor Total" e calcula `saldoRestante = item.total_value - item.paid_value`.
   - Com `paid_value = 0`, a UI projeta a falsa impressão de que a OS nunca teve pagamentos e que seu valor global é apenas a fração em aberto.
3. **Desalinhamento com a Planilha Oficial (`CONCILIAÇÃO 0909.xlsx`):**
   - A planilha oficial de 09/09/2026 em `C:\Users\admin\Downloads\CONCILIAÇÃO 0909.xlsx` possui 60 OSs mapeadas com rigor contábil:
     - Coluna D (`Valor:`): **Saldo Restante em Aberto no Pátio** -> Total exato de **R$ 70.204,89** (que bate ao centavo com a célula `F5` da aba `SALDO` - *"NA LOJA"*).
     - Coluna E (`PAGAMENTOS`): **R$ 39.817,64** em pagamentos realizados (Crédito, Débito, PIX, Dinheiro).
     - Total Bruto das OSs: **R$ 110.022,53**.
   - As OSs no sistema precisam refletir fielmente essa estrutura trifásica: **Valor Total Real**, **Valor Pago** e **Saldo Devedor**.

---

## Solução Proposta (Foco em Reuso e Correção)

1. **Sincronização Canônica de `patio_os` a partir de `CONCILIAÇÃO 0909.xlsx`:**
   - Script de sincronização determinístico para atualizar a base `patio_os` com os dados oficiais de 09/09:
     - `total_value`: Soma do saldo restante com os pagamentos declarados (`total = restante + pago`).
     - `paid_value`: Total dos pagamentos identificados em `PAGAMENTOS`.
     - `credit_value`, `debit_value`, `pix_transfer_value`, `cash_value`: Decompostos conforme as descrições da coluna `PAGAMENTOS`.
     - `status`: `finalizada` se restante for 0; `pago_parcial` se restante > 0 e pago > 0; `em_aberto` se pago for 0.
     - Preservar rigorosamente a soma dos saldos em aberto (`restante > 0`) em **R$ 70.204,89**, garantindo integridade com a aba `SALDO` do Módulo 1.

2. **Ajuste na UI de Pátio (`MissingPatioOsEditor.tsx`):**
   - Atualizar a tabela de veículos em serviço para exibir:
     - **OS / Placa / Loja**
     - **Valor Total da OS (R$)**: Exibe o valor bruto real da OS (`item.total_value`).
     - **Valor Pago (R$)**: Exibe o montante já amortizado (`item.paid_value`).
     - **Saldo Devedor / Na Loja (R$)**: Exibe o valor pendente no pátio (`item.total_value - item.paid_value`).
   - Ao editar o valor restante ou ao dar baixa ("Dar Baixa em Todas" ou individual), atualizar coerentemente `paid_value` e `status` sem corromper o `total_value` histórico.

3. **Revisão no Parser de Detecção e Ingestão (`CentralImportWizard.tsx` & `useOsImportProcessor.ts`):**
   - Na função `detectMissingOs`, assegurar que ao carregar do banco de dados `patio_os`, os campos `original_total_value`, `original_paid_value`, `total_value` e `paid_value` reflitam o contrato corrigido.

---

## Investigação e Análise de Reuso
- **Tabela Existente:** `public.patio_os` já possui todas as colunas necessárias (`total_value`, `paid_value`, `credit_value`, `debit_value`, `pix_transfer_value`, `cash_value`, `status`, `payment_method`). Nenhuma alteração estrutural de DDL é necessária no PostgreSQL.
- **RPC Existente:** `public.batch_upsert_patio_os` em `supabase/migrations/20260902000020_create_batch_upsert_patio_os.sql` já possui a lógica de merge de pagamentos e quitação.
- **Componentes Visuais Existentes:**
  - `src/components/importacoes/MissingPatioOsEditor.tsx` [MODIFY]
  - `src/components/importacoes/CentralImportWizard.tsx` [MODIFY]
  - `src/components/conciliacao/PatioOsDetailModal.tsx` [REUSE/VERIFY]

---

## Contratos de Dados & Resumo dos Totais (09/09/2026)

| Loja | Filial ID | OSs | Saldo Restante (Na Loja) | Valor Pago | Total Bruto da OS |
| :--- | :--- | :---: | :---: | :---: | :---: |
| **Planalto** | `st-06` | 2 | R$ 0,00 | R$ 6.045,00 | R$ 6.045,00 |
| **Piraporinha** | `st-05` | 6 | R$ 2.886,10 | R$ 3.222,80 | R$ 6.108,90 |
| **Mauá** | `3a3dd7ce...` | 5 | R$ 2.354,46 | R$ 663,90 | R$ 3.018,36 |
| **Kennedy** | `st-04` | 0 | R$ 0,00 | R$ 0,00 | R$ 0,00 |
| **Rudge Ramos** | `st-07` | 11 | R$ 14.728,26 | R$ 1.497,34 | R$ 16.225,60 |
| **Santo André** | `st-08` | 8 | R$ 6.507,54 | R$ 12.533,00 | R$ 19.040,54 |
| **Rei do Módulo** | `st-09` | 12 | R$ 26.175,60 | R$ 9.435,60 | R$ 35.611,20 |
| **Jorge Beretta** | `st-03` | 5 | R$ 9.626,83 | R$ 1.000,00 | R$ 10.626,83 |
| **Dom Pedro I** | `st-01` | 6 | R$ 4.922,20 | R$ 4.380,00 | R$ 9.302,20 |
| **Jabaquara** | `st-02` | 5 | R$ 3.003,90 | R$ 1.040,00 | R$ 4.043,90 |
| **TOTAL GERAL** | - | **60** | **R$ 70.204,89** | **R$ 39.817,64** | **R$ 110.022,53** |

---

## Risco Principal e Mitigação
- **Risco:** Ao sincronizar os novos totais brutos, alterar indevidamente o valor de pátio consolidado no Módulo 1 (célula `NA LOJA` = R$ 70.204,89), gerando divergência na equação contábil (`G31 != 0`).
- **Mitigação:** O saldo remanescente em pátio continuará sendo rigorosamente a soma de `total_value - paid_value` para as OSs com status `em_aberto` ou `pago_parcial`. Validaremos via teste de regressão automatizado que a soma resultante é exatamente **R$ 70.204,89**.
