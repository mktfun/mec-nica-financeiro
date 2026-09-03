# Proposal: Workspace Conversacional de Conciliação Financeira com Arquitetura Hydra Especializada (360)

## Problema
O fechamento diário da holding envolve 10 filiais mecânicas, 40 arquivos de extratos bancários (OFX Itaú), relatórios de adquirente (Rede POS), ordens de serviço (Pátio OS) e contas a pagar. Quando há divergências de fechamento (diferença entre o Valor Disponível e o Subtotal de Contas), o operador se depara com um processo manual extenuante, tendo que alternar entre dezenas de tabelas para identificar se a quebra ocorreu por um PIX sem OS, uma despesa não provisionada, um erro de leitura de odômetro ou um descompasso de lote de cartão.

O usuário rejeitou categoricamente interfaces clichês de IA (popovers flutuantes, cards de investigação de "vibecoding", excesso de emojis, robôs ou gradientes roxos). O objetivo é que **a tela principal inteira se torne um Workspace Conversacional Profissional em Tela Cheia**:
- **Design Corporativo e Sóbrio:** Dark UI Zinc-950 rigorosa, sem estética infantil de IA, com tipografia monospaçada para valores contábeis e ícones estritamente funcionais;
- **Divisão Espacial Clássica:** Balões do Agente com raciocínio e ferramentas à esquerda; balões do operador à direita;
- **Domínio Contábil Pleno:** O sistema deve dominar integralmente as regras das 10 filiais, a DRE dos 5 Pilares e a conciliação bicanal;
- **Arquitetura Hydra Multi-Braço:** Decomposição da inteligência em 6 braços analíticos especializados, com fluxo de raciocínio (*think*), ferramentas específicas (*tools*) e prompts governados em XML.

---

## Solução Proposta (Foco em Reuso, Rigor Contábil e Design Corporativo)

Substituir o modelo de wizard manual por um **Workspace Conversacional Fullscreen** integrado à rota `/conciliacao`, reaproveitando as RPCs canônicas do PostgreSQL e a base de componentes de chat:

### 1. Interface Corporativa em Tela Cheia (Zinc-950)
- **Painel Superior (KPIs & Delta ao Vivo):** Placar fixo no topo com os 5 Pilares (`Caixa Atual`, `Faturamento`, `Contas a Pagar`, `Diferença Final Δ`) e o semáforo das 10 filiais (identificando as lojas zeradas e as lojas com divergência).
- **Área Central de Diálogo (Left/Right Stream):**
  - **Lado Esquerdo (Agente):** Balões institucionais do analista com blocos técnicos de execução de ferramentas colapsáveis (`ToolExecutionBlock`) e cartões de decisão inline (`InlineDecisionCard`) contendo botões sóbrios `[ Confirmar ]` e `[ Rejeitar ]` com atalhos de teclado (`1`/`2`/`Enter`/`Esc`).
  - **Lado Direito (Operador):** Respostas, comandos técnicos (`/auto-match`, `/loja maua`, `/auditar despesas`) e envio de comprovantes.
- **Barra Inferior de Entrada:** Reutilização do componente `PromptInput.tsx` despojado de elementos cosméticos de IA, focado em alta velocidade de digitação, histórico e atalhos contábeis.

---

## A Arquitetura Hydra em 6 Braços Especializados

A inteligência da conciliação é particionada em 6 braços funcionais. Cada braço possui seu próprio domínio analítico (*Think*), ferramentas atômicas no banco (*Tools*) e diretrizes formuladas em XML.

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                ARQUITETURA HYDRA MULTI-BRAÇO                                    │
├─────────────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. ARQUITETO DE TESOURARIA      Auditoria de extratos Itaú, saldos patrimoniais e cheque esp.   │
│ 2. INVESTIGADOR DE PÁTIO E OS   Varredura de OSs, batimento de PIX órfão por valor/placa/loja   │
│ 3. CONCILIADOR DE ADQUIRÊNCIA   Batimento D-1 extrato vs D-0 balcão, taxas contratuais MDR Rede │
│ 4. AUDITOR DE CONTAS & DESPESAS Conciliação de saídas bancárias vs títulos ERP e despesas extra │
│ 5. AUDITOR DE FATURAMENTO DRE   Odômetro OI, mapa de metas e receitas corporativas extraordin.  │
│ 6. ANALISTA TRANSVERSAL LOJAS   Diagnóstico das 10 filiais, transferências intercompany         │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Detalhamento dos Braços:

#### Braço 1: Arquiteto de Tesouraria e Extratos (Bancos & Passivos)
- **Think:** Analisa a variação de saldo bancário de cada conta corrente Itaú (`ledger_balance`), valida créditos e débitos brutos do extrato OFX e quantifica o saldo devedor holding (`saldo_negativo_itau`). A tolerância na tesouraria é sempre R$ 0,00.
- **Tools:** `get_raw_ofx_data`, `get_daily_reconciliation_summary`.
- **System Prompt (XML):**
```xml
<specialist_role name="arquiteto_tesouraria">
  <mandate>Garantir que a variação de tesouraria imediata seja exata e coincida centavo a centavo com os extratos OFX.</mandate>
  <invariants>
    <rule>O Saldo Bancos Positivo é a soma de saldos bancários maiores que zero mais dinheiro em loja e a compensar.</rule>
    <rule>O Cheque Especial Itaú é a soma estrita do passivo das filiais devedoras.</rule>
    <rule>Diferença de conciliação bancária primária tem tolerância zero (R$ 0,00).</rule>
  </invariants>
  <tool_calling>Chama get_daily_reconciliation_summary para validar os saldos bancários.</tool_calling>
</specialist_role>
```

#### Braço 2: Investigador de Pátio e Ordens de Serviço (PIX x OS)
- **Think:** Varre as OSs em aberto na tabela `patio_os` da filial com divergência. Cruza recebimentos PIX do extrato contra valores de OS, nomes de clientes e placas. Detecta colisões de valor (mesma quantia em serviços tabelados) e proíbe quitações cegas.
- **Tools:** `auto_match_daily_transactions`, `create_and_link_manual_os`, `batch_upsert_patio_os`.
- **System Prompt (XML):**
```xml
<specialist_role name="investigador_patio_os">
  <mandate>Localizar e conciliar recebimentos PIX com ordens de serviço pendentes no pátio sem gerar falsos-positivos.</mandate>
  <matching_heuristics>
    <tier_1>Chave unívoca: número da OS explícito no FITID ou descrição do PIX.</tier_1>
    <tier_2>Valor exato com cardinalidade 1:1 na mesma filial no dia.</tier_2>
    <tier_3>Similaridade fonética de cliente ou placa veicular.</tier_3>
    <collision_guard>Se houver 2 ou mais OSs de mesmo valor, exigir confirmação manual via InlineDecisionCard.</collision_guard>
  </matching_heuristics>
</specialist_role>
```

#### Braço 3: Conciliador de Adquirência (Rede POS x D+1)
- **Think:** Diferencia vendas brutas do balcão ($D-0$) de lotes de crédito liquidados em conta corrente ($D-1$ / $D-2$). Valida o desconto contratual de taxa MDR (débito ~1,1%, crédito 1x ~2,3%, parcelado ~3,4%).
- **Tools:** `get_raw_rede_data`, `auto_match_daily_transactions`.
- **System Prompt (XML):**
```xml
<specialist_role name="conciliador_adquirencia">
  <mandate>Auditar conciliação de cartões e identificar pendências de compensação.</mandate>
  <rules>
    <rule>Vendas de crédito/débito não creditadas no dia constituem Ativo Circulante a Compensar.</rule>
    <rule>A diferença entre valor bruto e líquido creditado deve ser justificada como Juros/Taxas Rede.</rule>
  </rules>
</specialist_role>
```

#### Braço 4: Auditor de Contas a Pagar e Despesas (Base x Extras)
- **Think:** Cruza débitos bancários do extrato OFX contra títulos do ERP em `daily_manual_bills`. Débitos sem provisão são enquadrados como Despesa Extra operacional (afetando o caixa da loja e o subtotal) ou despesa não operacional holding (sem impacto no caixa da filial).
- **Tools:** `resolve_orphan_saida_ofx`, `resolve_orphan_transaction`.
- **System Prompt (XML):**
```xml
<specialist_role name="auditor_contas_despesas">
  <mandate>Garantir que todas as saídas bancárias possuam lastro documental no Contas a Pagar.</mandate>
  <classification_logic>
    <condition type="operacional">Debito relativo a fornecedor/peca da loja -> Criar despesa extra (is_extra = true).</condition>
    <condition type="corporativo">Tarifa bancaria, pro-labore, transferencia holding -> Justificar sem inflar despesa da loja.</condition>
  </classification_logic>
</specialist_role>
```

#### Braço 5: Auditor de Faturamento DRE & Odômetro (Receitas Corporativas)
- **Think:** Apura o Faturamento Base do Odômetro OI ($O_t - O_{t-1}$) e consolida as receitas corporativas extraordinárias (Aluguel Rei do Módulo, Custo Master Holding, Estorno de Seguro) em `daily_revenue_adjustments`.
- **Tools:** `upsert_daily_revenue_adjustment`, `get_daily_reconciliation_summary`.
- **System Prompt (XML):**
```xml
<specialist_role name="auditor_faturamento_dre">
  <mandate>Assegurar a correta apuração da receita bruta e receitas extras da DRE.</mandate>
  <rules>
    <rule>Faturamento Total = Faturamento Odometro Base + Ajustes Corporativos.</rule>
    <rule>Receitas extraordinarias exigem identificacao da contraparte e filial beneficiada.</rule>
  </rules>
</specialist_role>
```

#### Braço 6: Analista Transversal Intercompany & Lojas (Matriz 10 Filiais)
- **Think:** Analisa a matriz consolidada das 10 lojas. Identifica repasses de peças entre unidades (ex: Mauá efetuando pagamento de peça utilizada em Santo André) para que a divergência não seja tratada como sumiço de caixa, mas como ajuste intercompany simétrico.
- **Tools:** `get_daily_reconciliation_summary`.
- **System Prompt (XML):**
```xml
<specialist_role name="analista_intercompany_filiais">
  <mandate>Isolar a filial causadora da divergência e detectar compensações entre unidades.</mandate>
  <rules>
    <rule>A soma das divergências individuais das 10 filiais deve equalizar a divergência global da holding.</rule>
    <rule>Transferências entre contas bancárias de filiais distintas devem ser neutralizadas como intercompany.</rule>
  </rules>
</specialist_role>
```

---

## Contratos de Dados & SQL (Supabase)

### 1. Extensão das Tabelas Canônicas de Chat (`conversations` e `messages`)
```sql
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_date DATE NOT NULL DEFAULT CURRENT_DATE,
    title TEXT DEFAULT 'Conciliação Diária',
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS target_date DATE NOT NULL DEFAULT CURRENT_DATE;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool', 'data')),
    content TEXT NOT NULL DEFAULT '',
    tool_invocations JSONB,
    parts JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS tool_invocations JSONB;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS parts JSONB;

CREATE INDEX IF NOT EXISTS idx_conversations_target_date ON public.conversations(target_date);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);
```

### 2. RPC Unificada de Execução: `resolve_orphan_transaction`
```sql
CREATE OR REPLACE FUNCTION public.resolve_orphan_transaction(
    p_tx_id UUID,
    p_action TEXT, -- 'link_os' | 'revenue_adjustment' | 'expense_bill' | 'justify_only'
    p_params JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
-- Implementação atômica que aplica o vínculo ou ajuste contábil
-- e recalcula imediatamente o novo Delta consolidado via get_daily_reconciliation_summary
$$;
```

---

## API & Componentes (Frontend)

- **[MODIFY] `src/routes/conciliacao.index.tsx`:**
  - Adição do seletor institucional `[ Painel Clássico | Workspace Conversacional ]`.
  - Renderização do `ReconciliationChatWorkspace` em tela cheia com persistência da preferência em `localStorage`.
- **[EXTEND] `src/components/chat/MessageList.tsx`:**
  - Remoção de emojis e badges informais.
  - Renderização de blocos técnicos de auditoria e botões inline de decisão `[ Confirmar ]` e `[ Rejeitar ]`.
- **[NEW] `src/components/conciliacao/chat/ReconciliationChatWorkspace.tsx`:**
  - Layout full-viewport com cabeçalho de KPIs dos 5 Pilares, Live Delta Tracker e Semáforo das 10 filiais.
- **[NEW] `src/components/conciliacao/chat/InlineDecisionCard.tsx`:**
  - Card compacto Dark UI Zinc-950 com impacto quantitativo no Delta e atalhos de teclado (`1`, `2`, `Enter`, `Esc`).
- **[NEW] `src/hooks/useReconciliationChat.ts`:**
  - Hook gerenciador da sessão conversacional, streaming da Edge Function e mutações no PostgreSQL.

---

## Risco Principal e Mitigação

- **Risco Principal:** A IA realizar sugestões arbitrárias que não correspondam à verdade contábil (ex: vincular um PIX a uma OS de outro cliente apenas para zerar o saldo).
- **Mitigação:** Cada sugestão gerada pela Hydra exige aderência às heurísticas probatórias (mesma filial, compatibilidade de valor, validação de cliente) e aprovação explícita do operador no `InlineDecisionCard`. Nenhuma mutação é persistida no PostgreSQL sem comando humano consciente.
