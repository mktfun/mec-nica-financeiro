# Proposal: Alinhamento de Carryover do Pátio no Wizard vs Planilha Excel 24/08 (Spec 277)

## Problema

Ao realizar o fluxo de importação no `CentralImportWizard.tsx`, o usuário deparou-se com duas divergências alarmantes:

1. **Card de Alerta "OSs do Pátio Ausentes nos Arquivos de Hoje":**
   * O Wizard listou 4 OSs que estavam no pátio ontem mas não vieram no relatório diário do ERP de hoje:
     - Planalto: `OS #18412` (R$ 436,60)
     - Rudge Ramos: `OS #8659` (R$ 1.200,00)
     - Rudge Ramos: `OS #8689` (R$ 4.140,00)
     - Santo André: `OS #2326` (R$ 9.218,73)
   * O card alertou que estavam ausentes e sugeriu dar baixa. O usuário clicou em "Dar Baixa" na OS #2326 (Santo André).
   * **ERRO DE DOMÍNIO:** No arquivo oficial do Excel do dia 24/08 (`CONCILIAÇÃO 2408 (1).xlsx`), **todas essas 4 OSs constam legitimamente no Pátio (aba OS: R14, R58, R59, R69)** porque são veículos em conserto de dias anteriores (carryover legítimo). Elas **NÃO** foram quitadas no dia 24/08.

2. **Divergência no Painel de Auditoria Pré-Fechamento:**
   * A Auditoria Pré-Fechamento exibiu `Pátio: R$ 91.993,66` em vez do valor canônico da planilha (`R$ 88.212,39`).
   * Isso ocorreu porque o Wizard tentou recalcular localmente o pátio somando os arquivos brutos sem considerar as OSs que já foram liquidadas por cartão no mesmo dia, ao mesmo tempo em que aplicou a baixa manual indevida da OS #2326.

---

## Solução Proposta

### 1. UX e Lógica do `MissingPatioOsEditor.tsx` & `CentralImportWizard.tsx`:
- Mudar o tom do componente de "Alerta de Ausência / Dar Baixa" para **"Veículos em Andamento no Pátio (Carryover de Dias Anteriores)"**.
- O status padrão de todas as OSs ausentes no arquivo de hoje deve ser **`MANTER NO PÁTIO (em_aberto / pago_parcial)`**, e nunca incentivar baixa acidental.
- Adicionar explicação clara: *"Estes veículos deram entrada em dias anteriores e continuam em serviço na oficina. Seus saldos são preservados no pátio automaticamente."*

### 2. Sincronização Canônica de `patio_os` para 24/08:
- Garantir que as 4 OSs permaneçam ativas com seus saldos canônicos exatos da planilha:
  - Planalto `OS #18412`: Saldo R$ 436,60
  - Rudge Ramos `OS #8659`: Saldo R$ 1.200,00
  - Rudge Ramos `OS #8689`: Saldo R$ 4.140,00
  - Santo André `OS #2326`: Saldo R$ 9.218,73
- Garantir que o Pátio Consolidado resulte exatamente em **`R$ 88.212,39`** (soma idêntica à célula G16 da aba `SALDO` do Excel).

### 3. Alinhamento dos Indicadores Pré-Fechamento:
- O cálculo do `computedTotalPatioEstoque` no Wizard deve ser alinhado com as regras do backend para refletir o saldo real em aberto das 10 lojas (`R$ 88.212,39`).

---

## Contratos de Dados
- **`patio_os`**: `os_number`, `store_id`, `total_value`, `paid_value`, `status`, `opened_at`, `closed_at`
- **RPC `get_daily_reconciliation_summary('2026-08-24')`**:
  - `na_loja_os`: `88212.39`
  - `total_saldo_banco`: `102999.61` (OFX) + `dinheiro_em_lojas` + `cartoes_a_compensar`
  - `dinheiro_mp`: `13278.00`
  - `a_receber`: `10694.50`
  - `caixa_atual`: `175685.99`
  - `fluxo_caixa`: `25085.70`
  - `diferenca_final`: `6.20` (Conciliado)

## Risco Principal
- O usuário reimportar os arquivos e clicar em "Dar Baixa em Todas" nas OSs do pátio, desconfigurando o caixa. Mitigado transformando o carryover em comportamento padrão não-destrutivo.
