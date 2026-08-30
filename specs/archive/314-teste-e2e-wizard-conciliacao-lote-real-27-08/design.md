# Design: Teste E2E e Execução da Conciliação com Arquivos Reais de 27-08 (314)

## Arquitetura de Execução E2E

`
┌─────────────────────────────────────────────────────────────────────────┐
│                      PIPELINE DE TESTE E2E (PLAYWRIGHT)                 │
├─────────────────────────────────────────────────────────────────────────┤
│ 1. Ler arquivos de C:\Users\admin\Desktop\conciliacao\27-08             │
│ 2. Acessar http://localhost:8080/importacoes?tab=diario                 │
│ 3. Injetar arquivos no input[type='file'] da dropzone                   │
│ 4. Step 1 ➔ Step 2 (OFX, OS, Rede) ➔ Step 3 (Preview)                  │
│ 5. Disparar Auto-Matcher ➔ Step 4 (Tela A) ➔ Step 5 (Tela B)            │
│ 6. Step 6 (Cofre) ➔ Step 7 (Auditoria 5 Pilares)                        │
│ 7. "Confirmar e Gravar" ➔ Step 8 (Gravação & Auto-Healing)              │
│ 8. Capturar screenshots de cada etapa em ./e2e-results/screenshots/     │
│ 9. Validação SQL direta em daily_snapshots, patio_os, reconciliations  │
└─────────────────────────────────────────────────────────────────────────┘
`

---

## Estrutura de Diretórios e Arquivos

- scripts/run-e2e-conciliacao-2708.ts: Script autônomo Playwright E2E.
- e2e-results/screenshots/: Diretório de saída das screenshots de auditoria:
  - step_01_upload_arquivos_processados.png
  - step_02_1_mapeamento_ofx.png
  - step_02_2_mapeamento_os.png
  - step_02_3_mapeamento_rede.png
  - step_03_preview_geral_e_cards.png
  - step_04_vinculo_pagamentos_os.png
  - step_05_justificativas_nao_faturamento.png
  - step_06_conferencia_cofre_daniel.png
  - step_07_auditoria_5_pilares_fechamento.png
  - step_08_importacao_concluida_sucesso.png
  - step_09_cockpit_resumo_dia_27082026.png

---

## Cenários de Verificação (SCAN ➔ INFER ➔ VERIFY ➔ FIX)

### Cenário 1: Ingestão e Mapeamento dos 27 Arquivos Reais
- **SCAN:** 27 arquivos carregados na dropzone do Step 1.
- **INFER:** Parsers devem identificar as 10 filiais, os 10 extratos OFX, os 10 relatórios de OS e os 5 relatórios da Rede.
- **VERIFY:** Step 2 mapeia as lojas sem erro e avança para o Step 3 com todos os cards totalizadores populados.

### Cenário 2: Reconciliação dos 5 Pilares e Gravação Final
- **SCAN:** Execução pelos Steps 4, 5, 6 e 7.
- **INFER:** O semáforo do Step 7 deve acusar conformidade com $\Delta \le \text{R\$}~50,00$.
- **VERIFY:** Step 8 grava o snapshot em daily_snapshots com is_closed: true e exibe o banner de sucesso.
