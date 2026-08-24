# Design: Alinhamento de Carryover do Pátio no Wizard vs Planilha Excel 24/08 (Spec 277)

## Tabela Comparativa: Planilha Oficial vs Banco de Dados

| Filial | OSs em Aberto na Planilha | Soma Pátio Planilha (OS!D) | Saldo DB (`patio_os`) | Status |
|---|---|---|---|---|
| **Planalto** | 18456, 18455, 18454, 18452, 18433, **18412** | R$ 27.743,80 | R$ 27.743,80 | ✅ 100% Idêntico |
| **Piraporinha** | 40330, 40329, 40323, 40320 | R$ 2.820,00 | R$ 2.820,00 | ✅ 100% Idêntico |
| **Mauá** | 22580, 22566, 22559 | R$ 8.783,84 | R$ 8.783,84 | ✅ 100% Idêntico |
| **Kennedy** | 4405 | R$ 2.076,80 | R$ 2.076,80 | ✅ 100% Idêntico |
| **Rudge Ramos** | 8750, 8745, 8721, **8689**, **8659** | R$ 9.890,50 | R$ 9.890,50 | ✅ 100% Idêntico |
| **Santo André** | **2326** | R$ 9.218,73 | R$ 9.218,73 | ✅ 100% Idêntico |
| **Rei do Módulo** | 1847, 1846, 1845, 1844, 1838, 1818 | R$ 11.170,00 | R$ 11.170,00 | ✅ 100% Idêntico |
| **Jorge Beretta** | 1100, 1099, 1097, 1095, 1089 | R$ 3.515,12 | R$ 3.515,12 | ✅ 100% Idêntico |
| **Dom Pedro I** | 587, 582 | R$ 6.954,00 | R$ 6.954,00 | ✅ 100% Idêntico |
| **Jabaquara** | 393, 387, 368 | R$ 6.039,60 | R$ 6.039,60 | ✅ 100% Idêntico |
| **TOTAL** | **28 OSs em Aberto** | **R$ 88.212,39** | **R$ 88.212,39** | ✅ **BATE PERFEITO** |

---

## Detalhe Crítico das 4 OSs de Carryover

1. **OS #2326 (Santo André - R$ 9.218,73):**
   - É a **ÚNICA** OS em aberto no Pátio de Santo André em 24/08.
   - Todas as outras OSs do dia (#2393, #2392, #2391, #2390, #2378) foram pagas por PIX/Cartão.
   - Se o usuário der baixa na OS #2326, o Pátio de Santo André vai para R$ 0,00 e o Pátio Global cai de R$ 88.212,39 para R$ 78.993,66!
   - Portanto, a OS #2326 **DEVE PERMANECER NO PÁTIO**.

2. **OS #18412 (Planalto - R$ 436,60):**
   - Veículo aberto em 14/08, ainda aguardando finalização. Consta na linha R14 da aba OS do Excel.

3. **OS #8659 (Rudge Ramos - R$ 1.200,00):**
   - Veículo aberto em 14/08, ainda aguardando quitação. Consta na linha R59 da aba OS do Excel.

4. **OS #8689 (Rudge Ramos - R$ 4.140,00):**
   - Veículo de R$ 6.140,00 com R$ 2.000,00 pagos e R$ 4.140,00 restantes. Consta na linha R58 da aba OS do Excel.

---

## Modificações no Frontend

### 1. `src/components/importacoes/MissingPatioOsEditor.tsx`:
- Alterar visual:
  - Header: *"Veículos em Serviço no Pátio (Carryover de Dias Anteriores)"*
  - Badge: `4 veículos preservados no pátio` (Verde / Azul, não alerta agressivo de perigo)
  - Botão de ação rápida principal: **"Manter Todos no Pátio (Padrão Recomendado)"**
  - Subtexto: *"Estes veículos constavam no pátio de dias anteriores e não foram finalizados hoje. Eles permanecem no pátio somando ao estoque operacional."*
- Padrão inicial: `status = item.original_status` (preserva o saldo de cada um).

### 2. `src/components/importacoes/CentralImportWizard.tsx`:
- Garantir que `computedTotalPatioEstoque` reflita a soma exata das OSs em aberto incluindo o carryover legítimo.
