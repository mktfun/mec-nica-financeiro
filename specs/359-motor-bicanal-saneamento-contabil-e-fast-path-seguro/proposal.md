# Proposal: Motor Bicanal, Saneamento Contábil e Fast-Path Seguro (359)

## Problema
O motor de conciliação atual sofre de quatro patologias críticas identificadas e arbitradas pelo *The True Council* (`/council-debate`):
1. **Distorção Conceitual (Pilar 4 somado na Liquidez Imediata):** Veículos desmontados no pátio da oficina (com ciclo de 2 a 15 dias) são computados como dinheiro disponível no Caixa Atual. A cada orçamento ou entrada de frota, o "caixa" patrimonial sobe artificialmente e o "Disponível para Pagar Contas" despenca em dezenas de milhares de reais, gerando divergências falsas e obrigando o operador a cadastrar receitas extras fictícias.
2. **Quádrupla Deriva Contábil e Bug Aritmético de `Math.abs`:**
   - Em `src/lib/modulo1Calculations.ts` (L60 e L144), `const diferenca = Math.abs(valor_disp_contas) - valor_contas;` converte déficits graves (ex: -R$ 50.000) em valores positivos, aprovando caixas com rombo real de R$ 100.000.
   - Cálculos paralelos no JavaScript de `CentralImportWizard.tsx` divergem do PostgreSQL: quando o odômetro é igual ao dia anterior, o frontend calcula o faturamento como o acumulado total (R$ 350.000), enquanto o SQL calcula R$ 0,00.
3. **Colisão no Auto-Match por Valor (`ORDER BY opened_at DESC LIMIT 1`):** No Tier 4 da RPC `auto_match_daily_transactions`, depósitos bancários de serviços de preço padronizado (ex: troca de óleo de R$ 250) aplicam `LIMIT 1` cego e quitam a primeira OS que encontrarem, com risco de dar baixa indevida na OS de um devedor.
4. **Sobrecarga Cognitiva e Fricção Operacional:** O fechamento exige navegar por 11 passos e subpassos, investigar dezenas de transações órfãs repetitivas e corre o risco de perder todo o progresso se a página for recarregada (F5).

---

## Solução Proposta (Foco em Reuso e Correção)

1. **Correção Imediata de Aritmética e SSOT Única:**
   - [MODIFY] `src/lib/modulo1Calculations.ts`: Substituir `Math.abs(valor_disp_contas) - valor_contas` pela subtração algébrica direta `valor_disp_contas - valor_contas`.
   - [MODIFY] `src/components/importacoes/CentralImportWizard.tsx` e `Step4FinalAuditAndClose.tsx`: Desativar reducers de faturamento e odômetro no React; consumir 100% dos valores consolidados da RPC `get_daily_reconciliation_summary`.
2. **Evolução para a Arquitetura Bicanal na RPC `get_daily_reconciliation_summary`:**
   - [MODIFY] `supabase/migrations/...`: Atualizar a RPC para retornar e segregar:
     - **Canal 1 (Tesouraria Líquida Real):** $\text{Caixa Real} = \text{Bancos OFX} + \text{Dinheiro Cofre} - \text{Descoberto Itaú}$. Tolerância: **R$ 0,00**.
     - **Canal 2 (Balanço de Produção e Neutralização Temporal):** $\Delta P_4 = \text{Pátio Hoje} - \text{Pátio Ontem}$. O ajuste temporal neutraliza o impacto de orçamentos em andamento sobre o faturamento do odômetro, garantindo balanço perfeito sem plugs forçados.
3. **Desativação do `LIMIT 1` Cego no Auto-Match:**
   - [MODIFY] `supabase/migrations/...`: Na RPC `auto_match_daily_transactions`, condicionar o match do Tier 4 (apenas valor) à unicidade estrita no dia (`COUNT(*) = 1`). Se houver mais de uma OS com o mesmo valor na mesma filial, gerar pendência em vez de quitação cega.
4. **Fast-Path Condicional (1-Clique Seguro) & Smart Resolution Strip:**
   - [MODIFY] `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Habilitar botão destacado `[⚡ FECHAR DIA AUTOMATICAMENTE (1-CLIQUE)]` se as 4 invariantes do conselho forem verdadeiras (10 lojas equilibradas, zero órfãos, zero colisões, zero plugs).
   - [NEW] `src/components/importacoes/wizard/SmartResolutionStrip.tsx`: Componente compacto de desambiguação rápida via teclado (teclas `1` e `2`) para quando houver OSs com mesmo valor.

---

## Investigação e Análise de Reuso (Relatório dos Subagentes)

- **Tabelas / RPCs Existentes Encontradas:**
  - `get_daily_reconciliation_summary` (`supabase/migrations/20260902000024_equalize_canonical_0209.sql`): Será atualizada via `CREATE OR REPLACE FUNCTION` para incorporar os campos bicanais (`caixa_tesouraria`, `variacao_patio_p4`, `status_tesouraria`) sem romper a interface consumida pelo dashboard.
  - `auto_match_daily_transactions` (`supabase/migrations/20260901000015_auto_match_finalized_os_and_corporate_routing.sql`): Será atualizada para substituir o cursor com `LIMIT 1` por verificação de unicidade.
  - `daily_snapshots`: Campos existentes (`caixa_atual`, `total_patio`, `metadata`) acomodam perfeitamente a segregação bicanal sem necessidade de novas tabelas.
- **Componentes / Hooks Existentes Encontrados:**
  - `src/lib/modulo1Calculations.ts`: Módulo de cálculo matemático canônico — será higienizado removendo os `Math.abs`.
  - `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`: Já possui os 5 cards e semáforo — será adaptado para receber o Gatekeeper do Fast-Path e a barra bicanal.
  - `src/components/conciliacao/ResumoDiaPanel.tsx` e `ConciliacaoLojasView.tsx`: Consomem a RPC e já possuem os fallbacks necessários.
- **Justificativa para Artefatos Novos:**
  - `SmartResolutionStrip.tsx`: Necessário como componente atômico e ergonômico (< 80 linhas) para desambiguação rápida com atalho de teclado, substituindo modais pesados de múltiplos cliques.

---

## Contratos de Dados & SQL (Supabase)

### RPC: `get_daily_reconciliation_summary(p_date text, p_force_dynamic boolean DEFAULT false)`
Parâmetros e retorno JSONB estendido:
```json
{
  "caixa_atual": 341123.41,
  "caixa_tesouraria": 307757.45,
  "patio_wip": 33365.96,
  "variacao_patio_delta_p4": -23430.67,
  "valor_disp_contas": 113484.37,
  "contas_manual": 113495.51,
  "diferenca_final": -11.14,
  "status_geral": "approved",
  "fast_path_eligible": true,
  "stores": [ ... ],
  "stores_detail": [ ... ]
}
```

---

## API & Componentes (Frontend)

- **[MODIFY] `src/lib/modulo1Calculations.ts`:**
  - Subtração direta em `resultado_final_g31` e `diferenca`.
- **[MODIFY] `src/components/importacoes/wizard/Step4FinalAuditAndClose.tsx`:**
  - Adição do Gatekeeper do Fast-Path com validação das 4 invariantes.
  - Exibição de aba bicanal: *Tesouraria Imediata (Boletos)* vs *Balanço de Produção*.
- **[NEW] `src/components/importacoes/wizard/SmartResolutionStrip.tsx`:**
  - Props: `{ collision: ValueCollisionItem; onResolve: (osId: string) => void; onDismiss: () => void }`.
  - Escuta atalhos de teclado `1`, `2`, `Escape`.

---

## Risco Principal e Mitigação

- **Risco Principal:** A alteração na fórmula da RPC quebrar os valores de snapshots passados homologados (`is_closed = true`).
- **Mitigação:** Preservação estrita do **Ramal 1** da RPC `get_daily_reconciliation_summary` para dias fechados. A neutralização bicanal atua no cálculo dinâmico e consolidação de novos fechamentos, mantendo a imutabilidade histórica do passado.
