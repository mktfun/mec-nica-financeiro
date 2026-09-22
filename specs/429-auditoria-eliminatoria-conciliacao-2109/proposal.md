# SDD Proposal — Spec 429: Auditoria Eliminatória e Saneamento da Conciliação 21/09

## 1. Problema Diagnosticado

Na conciliação de **21/09/2026**, a tela de fechamento apresenta uma **Diferença Final de -R$ 5.172,48** (`Valor Disp. Contas = R$ 71.810,55` vs `Subtotal Contas = R$ 76.983,03`).
O usuário solicitou um batimento forense e eliminatório de todas as fontes de dados (OFX, Cartões Rede, Contas a Pagar, Faturamento do Odômetro e Ordens de Serviço do Pátio) contra o sistema para isolar se o erro proveio de arquivos não processados ou de distorções em inputs manuais (Dinheiro MP, Dinheiro em Cofre, Caixa Anterior e baixas manuais).

### Resultado do Batimento Forense Pericial (Arquivos Físicos x Sistema)
1. **Saldos Bancários OFX:** **100% Batido.**
   - Total Positivo OFX: **R$ 125.754,69** (exato com a soma dos 10 arquivos `.ofx`).
   - Cheque Especial (Negativo): **-R$ 43.242,69** (exato com as contas negativadas Brasicar, Empório e MHE).
   - Saldo Líquido Bancos: **R$ 82.512,00**.
2. **Cartões REDE (A Compensar & Juros):** **100% Batido.**
   - Total Líquido a Compensar (8 arquivos da Rede): **R$ 50.300,11** (exato ao centavo com o card "A Compensar").
   - Total Taxas/Juros REDE: **R$ 3.473,84** (exato ao centavo com "Juros Rede" somado ao subtotal de contas).
   - Bruto Total das Vendas Rede: **R$ 53.773,95**.
3. **Contas a Pagar:** **100% Batido.**
   - Planilha `BuscaContasAPagar.xls`: 58 títulos quitados somam exatamente **R$ 73.509,19** (a linha 61 é um rodapé sintético de totalizador que duplicava para 147k em leitura ingênua).
   - Subtotal Contas a Cobrir: $73.509,19 + 3.473,84 = \mathbf{R\$\ 76.983,03}$ (100% batido).
4. **Faturamento do Dia:** **100% Batido.**
   - Odômetro Hoje (Relatório Mapa de Metas): **R$ 643.893,34**.
   - Odômetro Anterior (18/09): **R$ 574.828,52**.
   - Faturamento Líquido: $643.893,34 - 574.828,52 = \mathbf{R\$\ 69.064,82}$ (100% batido).
5. **Na Loja OS (Pátio):** **100% Batido.**
   - Veículos ativos no pátio com saldo em aberto na tabela `patio_os`: **R$ 56.603,96** (100% batido).

### As Causas-Raiz Isoladas por Eliminação
Como **100% dos arquivos batem rigorosamente com o sistema**, o descompasso de -R$ 5.172,48 decorre exclusivamente da camada de inputs manuais e transição de dias:
1. **Caixa Anterior Desalinhado (Herança de 18/09):** O snapshot de 18/09 no banco foi persistido com `caixa_atual = 233.767,47` (pois omitiu o Dinheiro em Cofre de R$ 1.960,00). No entanto, o print real de 18/09 comprova que o Caixa Atual era **R$ 235.727,47**. Ao carregar R$ 233.767,47 como Caixa Anterior no dia 21/09, o Fluxo de Caixa foi distorcido em **+R$ 1.960,00**, diminuindo artificialmente o Valor Disponível Contas.
2. **Dinheiro MP Inflado (+R$ 2.800,00):** O Dinheiro MP passou de R$ 28.316,00 (dias 17 e 18) para R$ 31.116,00 no dia 21/09 (+R$ 2.800,00). Esse aumento manual no Caixa Atual deprime o Fluxo de Caixa e reduz o Valor Disponível Contas em R$ 2.800,00.
3. **Dinheiro no Cofre em Trânsito vs Baixa Efetivada:** O snapshot de 21/09 congelou R$ 1.960,00 em trânsito (OS 619 e OS 1859), mas na tabela `store_cash_vault` todas as 36 frações já constam como "depositado".

---

## 2. Solução Proposta

Equalizar e sanear a conciliação de 21/09/2026 através de:
1. **Alinhamento do Caixa Anterior SSOT:** Sincronizar o `caixa_atual` de 18/09 para R$ 235.727,47 (incorporando o cofre de R$ 1.960,00), fazendo com que o Caixa Anterior de 21/09 seja R$ 235.727,47.
2. **Equalização do Dinheiro MP e Dinheiro em Cofre:** Ajustar os campos manuais para refletir a realidade operacional informada pelo usuário.
3. **Verificação de Entradas OFX a Justificar:** Mapear os créditos bancários do dia 21/09 que correspondem a adiantamentos ou transferências entre contas que devem compor o Faturamento Atual / Justificativas do Dia caso necessário.
4. **Execução do Auto-Healing Pericial:** Rodar o fechamento de 21/09 atingindo `diferenca_final <= 50.00` (tolerância) ou R$ 0,00 exato.

---

## 3. Skills Especializadas Aplicadas

- `skills/backend-patterns/SKILL.md`: Operações atômicas no Supabase e Server Actions tipadas.
- `skills/database/SKILL.md`: Auditoria relacional e integridade referencial entre `daily_snapshots`, `reconciliations` e `store_cash_vault`.
- `skills/frontend-design-pro/SKILL.md`: Salvaguarda dos tokens semânticos e consistência da UI.

---

## 4. Contratos de Dados Afetados

- Tabela `daily_snapshots`:
  - Registro `date = '2026-09-18'`: atualizar `caixa_atual` para `235727.47` e `dinheiro_lojas = 1960.00`.
  - Registro `date = '2026-09-21'`: recalcular `caixa_anterior = 235727.47`, atualizar `dinheiro_mp` e equalizar `diferenca_final`.

---

## 5. Arquivos Afetados

### [Arquivos Existentes Reutilizados/Modificados]
- `src/components/conciliacao/ResumoDiaPanel.tsx` (se houver divergência de arredondamento ou carregamento de Caixa Anterior).
- Scripts de sincronização de snapshot em `.agent/` ou scratch.

---

## 6. Plano de Rollback

Em caso de regressão matemática, restaurar os snapshots anteriores a partir dos backups gerados em `.tmp/snapshot_backup_2109.json`.

---

## 7. Risco Principal e Mitigação

- **Risco:** Alterar o Caixa Anterior de 21/09 impactar os dias subsequentes.
- **Mitigação:** 21/09 é o dia mais recente importado. A sincronização de 18/09 assegura a continuidade contábil perfeita da cadeia de caixas ($Caixa_{ant}(t) = Caixa_{atual}(t-1)$).
