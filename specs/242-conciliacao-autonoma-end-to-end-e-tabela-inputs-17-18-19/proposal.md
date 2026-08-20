# Proposta: Conciliação Autônoma End-to-End & Tabela de Inputs dos Dias 17, 18 e 19 (Spec 242)

## 1. Contexto e Diagnóstico do Usuário

O usuário possui pastas de arquivos brutos no Desktop:
- `C:\Users\admin\Desktop\conciliacao\14-08`
- `C:\Users\admin\Desktop\conciliacao\17-08`
- `C:\Users\admin\Desktop\conciliacao\18-08`
- `C:\Users\admin\Desktop\conciliacao\19-08`

E as planilhas oficiais que representam a **Verdade Financeira Absoluta**:
- `CONCILIAÇÃO 1708.xlsx` (Marco Zero de partida ou Fechamento do dia 17)
- `CONCILIAÇÃO 1808.xlsx` (Fechamento do dia 18)
- `CONCILIAÇÃO 1908.xlsx` (Fechamento do dia 19)

O objetivo principal do sistema é **eliminar totalmente o uso dessas planilhas manuais**, permitindo que o operador apenas faça upload dos arquivos brutos (OFX, Rede, OS, Contas) e informe os poucos inputs físicos (Dinheiro em Espécie e Boletos a Receber), obtendo um fechamento automático 100% batido com diferença inferior a R$ 1,00.

---

## 2. Tabela Oficial de Valores & Inputs Manuais (17/08, 18/08, 19/08)

Esta é a tabela exata extraída célula a célula das planilhas oficiais:

| Campo / Métrica | 17/08/2026 (Marco Zero) | 18/08/2026 (Fechamento) | 19/08/2026 (Fechamento) |
| :--- | :--- | :--- | :--- |
| **Pilar 1: Saldo Bancos (+ Maq)** | R$ 190.819,65 | R$ 211.003,28 | R$ 152.608,71 |
| *↳ Extrato OFX (10 Lojas)* | *R$ 186.496,03* | *R$ 199.972,75* | *R$ 150.708,71* |
| *↳ Maquininha / Não Entrou* | *+ R$ 4.323,62* | *+ R$ 11.030,53* | *+ R$ 1.900,00 (OS 8736)* |
| **Pilar 2: Dinheiro MP (Input)** | **R$ 9.066,00** | **R$ 8.466,00** | **R$ 8.466,00** |
| **Pilar 3: A Receber (Input)** | **R$ 10.694,50** | **R$ 10.694,50** | **R$ 10.694,50** |
| **Pilar 4: Na Loja OS (Pátio)** | R$ 88.496,71 | R$ 86.052,07 | R$ 100.153,69 |
| **(-) Saldo Negativo** | R$ 0,00 | R$ 0,00 | R$ 0,00 |
| **= CAIXA ATUAL CONSOLIDADO** | **R$ 299.076,86** | **R$ 316.215,85** | **R$ 271.922,90** |
| **Caixa Anterior (Âncora)** | R$ 289.386,12 (de 14/08) | R$ 299.076,86 (de 17/08) | R$ 316.215,85 (de 18/08) |
| **Fluxo de Caixa** | **+ R$ 9.690,74** | **+ R$ 17.138,99** | **- R$ 44.292,95** |
| **Faturamento do Dia** | **R$ 70.820,43** *(96.172,06 odôm.)* | **R$ 41.857,57** | **R$ 73.813,07** |
| **Disponível para Contas** | **R$ 86.481,32** | **R$ 24.718,58** | **R$ 118.106,02** |
| **Contas Pagas (Manual/Relat.)** | **R$ 81.048,63** | **R$ 21.278,37** | **R$ 114.568,15** |
| **Juros / Encargos (Input)** | **R$ 5.433,13** | **R$ 2.240,56** | **R$ 3.177,07** |
| **Devoluções / Ajustes** | R$ 0,00 | R$ 1.200,00 | R$ 361,46 |
| **= Total Contas a Pagar** | **R$ 86.481,76** | **R$ 24.718,93** | **R$ 118.106,68** |
| **DIFERENÇA FINAL APURADA** | **- R$ 0,44** ✅ | **- R$ 0,35** ✅ | **- R$ 0,66** ✅ |
| **STATUS DE APROVAÇÃO** | **🟢 APROVADO** | **🟢 APROVADO** | **🟢 APROVADO** |

---

## 3. Por Que a Importação Direta Apresentava Divergências? (Causas Raízes)

Ao auditar os arquivos brutos das pastas `17-08`, `18-08` e `19-08`, identificamos 3 motivos técnicos que causavam divergência quando o usuário tentava importar os arquivos sem usar as planilhas:

### 🔍 Causa 1: Padrão de Centavos do Extrato OFX do Itaú
* Nos dias 17/08 e 18/08, os arquivos OFX exportados continham `<BALAMT>1049484` (sem ponto decimal), que representa `R$ 10.494,84`.
* No dia 19/08, os arquivos OFX continham `<BALAMT>3479.25` (com ponto decimal).
* **Solução:** O `ofxParser.ts` deve normalizar de forma robusta os valores do `<BALAMT>` tanto com ponto quanto sem ponto, somando perfeitamente os saldos bancários das 10 contas.

### 🔍 Causa 2: Nomenclatura dos Relatórios de OS da Oficina
* No dia 17 e 18, os arquivos se chamam `PLA 1708.xls`, `PIR 1708.xls`, `MHE 1708.xls`, etc.
* No dia 19, os arquivos se chamam `1688_ConferenciaOSxFinanceiro.xls`, `1780_ConferenciaOSxFinanceiro.xls`, etc.
* O `osParser.ts` precisa ler a Linha 3 de cada arquivo (ex: `MPplanalto`, `MPpiraporinha`, `ReiDoModulo`) para vincular com 100% de precisão à loja correspondente (`st-01` a `st-10`), somando exatamente o pátio de veículos.

### 🔍 Causa 3: Vendas Rede de Finais de Semana e Feriados
* As vendas de cartão de sexta, sábado e domingo caem no extrato bancário de segunda-feira (`17/08`).
* O automatch de maquininhas precisa vincular essas transações de forma consolidada para apontar corretamente o status `ENTROU` e `NÃO ENTROU (A Compensar)`.

---

## 4. Plano de Implementação (Spec 242)

1. **Robustez dos Parsers:**
   - Garantir que `ofxParser.ts`, `osParser.ts` e `redeParser.ts` processem qualquer variação de nome de arquivo ou formato de centavos das pastas `14-08`, `17-08`, `18-08` e `19-08`.
2. **Central de Importações Inteligente:**
   - Ao importar o lote do dia, preencher automaticamente os campos de fechamento com os valores extraídos e solicitar apenas os 2 inputs físicos (`Dinheiro MP` e `A Receber`).
3. **Validação e Teste End-to-End:**
   - Rodar script de importação simulando o upload de todos os arquivos reais das pastas `17-08`, `18-08` e `19-08` e validar que o banco e a tela exibem:
     - 17/08: Diferença **-R$ 0,44** ✅
     - 18/08: Diferença **-R$ 0,35** ✅
     - 19/08: Diferença **-R$ 0,66** ✅
