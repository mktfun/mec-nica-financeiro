# 📋 Spec 476 — Calibração da Conciliação de Saídas/Entradas OFX, Eliminação do Falso "Débito Órfão" e Saneamento de Contas

## 1. Problema Diagnosticado
Ao analisar os prints enviados pelo usuário e inspecionar a base de dados em `2026-08-25`:
1. **Falso "Débito Órfão" e Status de Divergência Falsa:**
   - Em lojas como Mauá (`MHE`), Piraporinha (`EMPORIO`), Planalto (`BRASICAR`), Jorge Beretta (`DHJV`) e Rei do Módulo (`MP`), as saídas bancárias no extrato OFX são **R$ 0,00** (`ofx_saidas_total = 0`).
   - Porém, as filiais possuem contas a pagar cadastradas no sistema (`daily_manual_bills`: R$ 844,73 em Mauá, R$ 840,00 em Piraporinha, R$ 1.441,70 em Planalto, R$ 228,73 em Jorge Beretta, R$ 12.236,50 em Rei do Módulo).
   - Na RPC `get_daily_reconciliation_summary`:
     `dif_saidas = ofx_saidas_total - contas_loja` -> resultado: `-R$ 844,73`, `-R$ 840,00`, etc.
   - No frontend `StoreCardModulo1.tsx`:
     O componente verifica `isDifSaidasOk = Math.abs(diferencaSaidas) <= 0.05`. Como é `-R$ 844,73`, rotula a linha como **"Débito Órfão"** em vermelho com `-R$ 844,73` e pinta a lateral do card de vermelho (**DIVERGÊNCIA**)!
   - **Inversão conceitual:** Débito órfão ocorre quando **dinheiro sai do banco** sem documento. Quando `saidas_ofx = 0`, **nenhum centavo saiu da conta corrente**! As contas registradas ou estão em aberto, ou foram pagas via C6 Centralizado, ou em dinheiro. Chamá-las de "Débito Órfão" do banco e exigir justificativa de saída bancária que não existiu confunde totalmente o operador.
2. **Badges de `1` ou `2 VERIFICAÇÕES PENDENTES` nas Lojas:**
   - Os badges vermelhos não decorrem de saídas OFX (que têm 0 pendências), mas sim de:
     a) `os_payments.pending`: 15 observações de OS em Mauá (4), Piraporinha (3), Planalto (1), Rei do Módulo (4), Jorge Beretta (1), Kennedy (1) e Rudge Ramos (1) que vieram de veículos com entrada no Pátio em dias anteriores (`baseline_source: existing_patio`), sem pagamentos novos no dia 25/08.
     b) `rede_os.pending`: 5 transações de cartão da Rede em Dom Pedro (1), Piraporinha (1), Rei do Módulo (1), Rudge Ramos (1) e Santo André (1) que ainda não foram vinculadas à OS correspondente (como a OS #1849 de R$ 3.490 no Rei do Módulo).

---

## 2. Solução Proposta
1. **Calibração Matemática da RPC `get_daily_reconciliation_summary`:**
   - Redefinir `dif_saidas` e `diferenca_saidas`:
     `dif_saidas = GREATEST(0, COALESCE(sofx.ofx_saidas_total, 0) - COALESCE(sofx.saidas_justificadas, 0))` (estritamente igual a `sofx.saidas_orfas`).
   - Se `ofx_saidas_total = 0`: a diferença a justificar no extrato bancário de saídas é `R$ 0,00` (100% Conciliado no Banco).
   - Preservar `contas_loja` como campo informativo das contas cadastradas da filial.
   - Calibrar o `status` da filial na RPC: uma loja só fica em `divergence` se houver lançamentos bancários órfãos (`saidas_orfas > 0.05` ou `entradas_orfas > 0.05`) ou cartões não entrados (`nao_entrou_valor > 0.05`).
2. **Correção Semântica e Visual no Frontend (`StoreCardModulo1.tsx`):**
   - Se `saidasOfxValor === 0`:
     - Se `contasLojaValor === 0`: exibir `Sem Mov. Saídas`.
     - Se `contasLojaValor > 0`: exibir `Sem Débito no Banco` (ou `100% Conciliado`) com `dif_saidas = 0` em tom neutro/verde, e sub-rótulo de contas `A Pagar / Não debitado hoje` (ou `Centralizado C6`), NUNCA "Débito Órfão" em vermelho.
   - "Débito Órfão" em vermelho só aparece se `saidasOfxValor > 0` E `diferencaSaidasValor > 0.05`.
   - A barra lateral de status só fica vermelha (`DIVERGÊNCIA`) se houver divergência real de extrato ou cartões.
3. **Saneamento Global de OSs Históricas de Pátio (`os_payments`):**
   - Atualizar `baseline_source` para `'historical_patio_carryover'` para as observações de 25/08 cujos pagamentos já existiam antes de 25/08, zerando os falsos alarmes de `os_payments` em todas as lojas restantes.
4. **Auto-Match e Vinculação de Cartões da Rede (`Rede -> OS`):**
   - Realizar o auto-match determinístico da venda da Rede de R$ 3.490 com a OS #1849 no Rei do Módulo (`st-09`), e viabilizar vinculação limpa nas demais filiais.

---

## 3. Skills Especializadas Aplicadas
- `database`: DDL da migration, idempotência, integridade referencial e calibração de CTEs na RPC `get_daily_reconciliation_summary`.
- `frontend-design-pro`: Padrões de design Zinc-950, eliminação de falsos alarmes visuais vermelhos, badges semânticos e tipografia tabular.
- `backend-patterns`: Resiliência em consultas, tipagem de retorno e invalidação de cache reativo.

---

## 4. Contratos de Dados & RPCs
- **RPC `public.get_daily_reconciliation_summary(p_date date, p_force_dynamic boolean)`**:
  - `dif_saidas`: `COALESCE(sofx.saidas_orfas, 0)`
  - `diferenca_saidas`: `COALESCE(sofx.saidas_orfas, 0)`
  - `contas_loja`: soma de `daily_manual_bills`
  - `status`: `'conciliado'` quando extratos e cartões estiverem cobertos.
- **Tabela `os_import_observations`**:
  - `baseline_source`: saneamento de registros históricos de pátio para `'historical_patio_carryover'`.
- **Tabela `pos_transactions`**:
  - `matched_os_number`: vinculação para vendas da Rede identificadas.

---

## 5. Arquivos Afetados
### Arquivos Existentes Modificados:
1. `supabase/migrations/20261003000004_calibracao_saidas_ofx_e_saneamento_contas_loja.sql` `[NEW]`
   - Nova migration versionada substituindo `get_daily_reconciliation_summary` com as fórmulas corretas de saídas e status.
2. `src/components/conciliacao/StoreCardModulo1.tsx` `[MODIFY]`
   - Ajuste das condições de rótulo para saídas (`Sem Débito no Banco` vs `Débito Órfão`) e cálculo de cor da barra lateral.

---

## 6. Evidência e Decisão
| Caminho do Arquivo | Símbolo / Trecho | Decisão | Motivo | Verificação |
|---|---|---|---|---|
| `supabase/migrations/20261003000004_...sql` | `get_daily_reconciliation_summary` | Criar Migration | Corrigir `dif_saidas` e `status` sem quebrar o contrato do payload JSON | Executar RPC no terminal e validar payload |
| `src/components/conciliacao/StoreCardModulo1.tsx` | Linhas 25-30, 285-305 | Modificar | Eliminar o badge vermelho de "Débito Órfão" quando `saidasOfxValor == 0` | Build Vite sem erros (`npm run build`) |
| `os_import_observations` | `baseline_source` | Atualizar dados | Eliminar falsos alarmes de pagamentos antigos de pátio | Query SQL verificando `pending = 0` |

---

## 7. Plano de Rollback
- Reaplicar a migration `20261003000003_alinhamento_filosofia_os_dia_e_eliminacao_falsos_alarmes.sql` caso a nova RPC apresente qualquer comportamento inesperado.
- Reverter cirurgicamente o arquivo `StoreCardModulo1.tsx` via Git.

---

## 8. Risco Principal
- **Risco:** Ocultar um débito bancário real que precise de justificativa.
- **Mitigação:** `dif_saidas` mantém estritamente `sofx.saidas_orfas`. Se houver qualquer saída bancária no OFX sem conta ou justificativa, ela continuará sendo apontada como débito órfão com 100% de rigor pericial. Apenas contas sem saída bancária deixam de ser falsamente chamadas de débitos órfãos.
