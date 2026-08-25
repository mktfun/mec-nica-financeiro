## Análise Arquitetural — [Architect]

### 1. Avaliação dos 4 Tópicos

#### Tópico 1 — Ciclo de Vida e Sinalização no Dia do Vencimento (`due_date == target_date`)
* **Diagnóstico Arquitetural:** O erro mais crítico em módulos financeiros é transformar estados puramente temporais (como `vencendo_hoje` ou `vencido`) em estados transacionais persistidos na coluna `status` do banco de dados. Isso gera a clássica **armadilha de estado estagnado** (*State Staleness Trap*), forçando a dependência de cron jobs frágeis para atualizar registros à meia-noite.
* **Solução Canônica:**
  1. A coluna `status` no PostgreSQL deve persistir estritamente eventos de ciclo de vida do negócio: `'pendente'`, `'recebido'`, `'cancelado'`.
  2. Os estados temporais (`a_vencer`, `vencendo_hoje`, `vencido`) são **estados derivados/computados** calculados em tempo de consulta/renderização com base na comparação da `due_date` com a data de competência selecionada (`target_date`).
* **Sinalização UX:** Arquitetura hierárquica em 2 níveis:
  - *Nível Macro:* KPI Card **"A Vencer Hoje"** no topo do dashboard com contagem e valor somado.
  - *Nível Micro:* Badge âmbar pulsante (`bg-amber-500/10 text-amber-400 border-amber-500/30`) na linha do título dentro do card da filial, acompanhado de botão de ação rápida com 1 clique ("Baixar / Confirmar Recebimento").

#### Tópico 2 — Mecânica Contábil e Liquidação Sem Dupla-Contagem
* **Diagnóstico Arquitetural:** A fórmula patrimonial do fechamento diário é:
  $$\text{Caixa Atual} = \underbrace{\text{Saldo Bancos (OFX) + Cofre + Maquininhas}}_{\text{Pilar 1}} + \underbrace{\text{Dinheiro MP}}_{\text{Pilar 2}} + \underbrace{\text{A Receber}}_{\text{Pilar 3}} + \underbrace{\text{Na Loja (OS)}}_{\text{Pilar 4}}$$
  $$\text{Fluxo de Caixa} = \text{Caixa Atual} - \text{Caixa Anterior}$$
  $$\text{Valor Disponível para Contas} = \text{Faturamento do Período} - \text{Fluxo de Caixa}$$
* **O Risco de Dupla-Contagem / Inflação Patrimonial:**
  Quando um boleto (ex: Orion R$ 3.464,83) é creditado na conta Itaú da loja Mauá:
  1. O saldo bancário sobe R$ 3.464,83 no extrato OFX (**Pilar 1** aumenta).
  2. Se o recebível permanecer como pendente no **Pilar 3**, o Caixa Atual é inflado artificialmente em R$ 3.464,83, distorcendo o Fluxo de Caixa e gerando falsa divergência no Fechamento.
  3. No extrato OFX haverá uma transação de crédito correspondente. Se o operador categorizá-la como novo faturamento, haverá **dupla contagem de receita**, pois a receita já foi reconhecida na emissão original da OS/serviço.
* **Modelo Canônico de Liquidação (Modelo Híbrido Reconciliado com Vínculo Bilateral):**
  - Adição da FK `matched_ofx_id UUID REFERENCES ofx_transactions(id) ON DELETE SET NULL` na tabela `receivables`.
  - A liquidação contábil é uma **mera mutação patrimonial** (permutação de ativo circulante: Realizável a Curto Prazo $\rightarrow$ Disponibilidades imediatas).
  - Quando o recebível é baixado com vínculo ao OFX (`matched_ofx_id`), a transação do OFX é sinalizada como `reconciliation_type = 'receivable_settlement'` e **não entra no cômputo de faturamento operacional do dia**, garantindo integridade estrita das partidas dobradas.

#### Tópico 3 — Isolamento Temporal, Imutabilidade Histórica e Timezone
* **Diagnóstico da Regra Lógica Retroativa:**
  A expressão `WHERE (date <= v_target_date) AND (status = 'pendente' OR (status = 'recebido' AND received_at > v_target_date))` é a base matemática correta para reconstrução *Point-in-Time*. Contudo, apresenta duas vulnerabilidades críticas de engenharia:
  1. **Armadilha de Timezone (UTC vs America/Sao_Paulo):** O PostgreSQL armazena `received_at` como `TIMESTAMPTZ` (UTC). Uma baixa realizada às 22:30 de 24/08 em São Paulo (UTC-3) é gravada como `2026-08-25 01:30:00+00`. Se a query comparar `received_at::date > v_target_date` sem converter o fuso, o sistema atribuirá o recebimento incorretamente a 25/08!
     - *Mitigação Obrigatória:* `(received_at AT TIME ZONE 'America/Sao_Paulo')::date > v_target_date` ou registro da coluna explícita `received_date DATE`.
  2. **Imutabilidade de Snapshots Fechados:** Para conciliações onde `daily_snapshots.is_closed = true`, o valor do Pilar 3 **deve ser imutável**. A RPC deve priorizar o snapshot persistido para datas fechadas, garantindo que baixas ou manutenções posteriores nunca alterem o passado contábil auditado.

#### Tópico 4 — Arquitetura de Interface (UX/UI) & Componentização
* **Avaliação da Estrutura:**
  - A substituição da listagem linear por uma arquitetura orientada ao domínio (**Grid das 10 Filiais**) espelha com fidelidade a operação física e a planilha oficial da diretoria (`RECEBIVEIS `).
  - **Componentes Modulares Independentes:**
    - `src/routes/recebiveis.tsx`: Cockpit mestre com Header de data, KPIs consolidados e alternador de abas (Contas a Receber vs Auditoria MDR).
    - `StoreReceivablesCard.tsx`: Card de filial autocontido com lista de títulos, subtotal da loja e ações contextuais.
    - `ReceivableFormModal.tsx` & `ImportRecebiveisModal.tsx`: Modais isolados para cadastro e extração Excel via `recebiveisParser.ts`.
  - **Integração no `ResumoDiaPanel.tsx`:** O card do Pilar 3 ("A RECEBER") deve abrir o `RecebiveisDetailModal.tsx` (seguindo o mesmo padrão de excelência de `SaldoBancosDetailModal` e `PatioOsDetailModal`), permitindo ao operador auditar a composição dos títulos sem sair da conciliação.

---

### 2. Modelo Contábil & FSM de Estados

#### 2.1 Máquina de Estados Finitos (FSM) de Recebíveis
O ciclo de vida separa rigorosamente **Estado Transacional Persistido** de **Estado Visual/Temporal Derivado**:

```
[Cadastro / Importação Excel]
             │
             ▼
     ┌───────────────┐
     │   PENDENTE    │ ──(due_date > target_date)──► [Badge Azul: A Vencer]
     │ (Persistido)  │ ──(due_date == target_date)─► [Badge Âmbar: Vence Hoje (Pulsante)]
     │               │ ──(due_date < target_date)──► [Badge Vermelho: Vencido (X dias)]
     └───────┬───────┘
             │
     ┌───────┴──────────────────────────────┐
     │ [Ação: Baixar / Match OFX]           │ [Ação: Cancelar]
     ▼                                      ▼
┌───────────────────────────┐    ┌───────────────────────────┐
│         RECEBIDO          │    │         CANCELADO         │
│ (received_at, matched_id) │    │       (cancelled_at)      │
│ [Badge Verde: Liquidado]  │    │  [Badge Cinza: Cancelado] │
└───────────────────────────┘    └───────────────────────────┘
```

#### 2.2 Mecânica Contábil da Liquidação (Partidas Dobradas)

```
CENÁRIO: Liquidação de Boleto Orion (R$ 3.464,83) em 25/08/2026

1. MOMENTO DA EMISSÃO DA OS (Competência do Faturamento):
   D - Ativo Circulante: Contas a Receber (Pilar 3)  ................ R$ 3.464,83
   C - Receita Operacional Bruta (Faturamento) ...................... R$ 3.464,83

2. MOMENTO DA LIQUIDAÇÃO BANCÁRIA (Mutação Patrimonial):
   D - Ativo Circulante: Banco Itaú c/c MHE (Pilar 1) ............... R$ 3.464,83
   C - Ativo Circulante: Contas a Receber (Pilar 3)  ................ R$ 3.464,83
   
   Impacto no Caixa Total: Δ Caixa = (+3.464,83) + (-3.464,83) = R$ 0,00 (Neutro)
   Impacto no Faturamento do Dia 25/08: R$ 0,00 (Não infla a receita)
```

---

### 3. Riscos Estruturais e Dívida Técnica

| Risco Estrutural | Severidade | Impacto Arquitetural | Mitigação Mandatória |
| :--- | :---: | :--- | :--- |
| **Divergência de Timezone UTC** | 🔴 ALTA | Baixas noturnas (após 21h BRT) caem no dia UTC seguinte, corrompendo a conciliação. | Utilizar `(received_at AT TIME ZONE 'America/Sao_Paulo')::date` ou coluna `received_date DATE`. |
| **Quebra de Snapshots Fechados** | 🔴 ALTA | Edições ou exclusões retroativas em `receivables` alteram caixas já homologados e fechados. | Na RPC, se `daily_snapshots.is_closed = true`, congelar valor de `a_receber_manual` / snapshot. |
| **Dupla Contagem de Receita no OFX** | 🟠 MÉDIA | Entrada bancária do boleto ser categorizada como faturamento extra no `ResumoDiaPanel`. | Vínculo bidirecional `matched_ofx_id` excluindo a transação do cálculo de faturamento avulso. |
| **Inconsistência de Nomes de Lojas** | 🟡 MÉDIA | Falha no parser Excel ao mapear `Recebiveis BRASICAR` vs `st-01` / Planalto. | Criar dicionário canônico de normalização de lojas em `recebiveisParser.ts` com testes unitários. |

---

### 4. Recomendação Final

**Veredicto:** **GO**  
**Confiança:** **0.95**  
**Justificativa:** A proposta da Spec 284 possui uma fundação arquitetural sólida, eliminando a digitação manual vulnerável e modelando com precisão o domínio multi-filiais da empresa. Com a adoção da FSM baseada em estados derivados (evitando cron jobs), a blindagem de timezone (`America/Sao_Paulo`), o vínculo contábil via `matched_ofx_id` e a proteção de imutabilidade dos snapshots fechados, o sistema atinge nível bancário de integridade patrimonial e excelente ergonomia operacional.
