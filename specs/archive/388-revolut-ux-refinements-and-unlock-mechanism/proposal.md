# Proposal: Refinamentos Revolut UX, Contraste Cromático e Mecanismo de Desbloqueio de Transações D-1 (388)

## Problema

1. **Confusão Cromática e Ausência de Semântica Visual:**
   - Atualmente, as saídas/débitos (boletos, pagamentos a fornecedores) estão usando avatares com ícone em tom **teal/verde** (`bg-teal-500/10 text-teal-300`) e o valor numérico em **branco** (`text-zinc-100`).
   - As entradas/créditos usam verde (`text-emerald-400`).
   - O resultado visual é que a tela parece um mar de verde homogêneo; o operador bate o olho e não consegue discernir instantaneamente o que é entrada (+) e o que é saída (-).

2. **Poluição Visual por Badges Concorrentes e Repetição de Nomes:**
   - Badges de 40+ caracteres como `[TRANSFERÊNCIA ENTRE LOJAS [APENAS CONCILIAR]]` e `[CONTA: ABC AUTO PEÇAS]` são renderizados diretamente ao lado do título da transação em caixas chamativas, ofuscando a razão social.
   - Nomes bancários do OFX ainda contêm repetições grotescas herdadas do padrão Itaú (ex.: `AUTO PECAS L AUTO PECAS LUDIO ABC LTDA ME`, `PRPK DISTRIB PRPK DISTRIBUIDORA`, `LELO LELO`) ou aparecem como um simples traço `-` (para tarifas e juros do limite da conta).

3. **Bloqueio Cego de Transações D-1 ("Somente Leitura"):**
   - Transações bancárias ocorridas ontem à noite após o fechamento da conciliação (ex.: PIX de cliente ou recebimentos que caíram às 19h-21h) foram marcadas automaticamente pelo motor como `Transferência Entre Lojas [Apenas Conciliar]`.
   - A interface identifica que `occurred_at < date` e bloqueia a linha como `🔒 Leitura`, removendo todos os botões de ação (`[Justificar]`, `[Vincular OS]`, `[Editar]`).
   - O operador precisa contabilizar esse valor no faturamento da conciliação de hoje (`09/09`) ou vinculá-lo a uma OS, mas está de mãos atadas porque o sistema travou o registro.

---

## Solução Proposta (Foco em Reuso e Correção)

1. **Semântica Visual Estrita de Alto Contraste (Inflows vs Outflows):**
   - **Débitos / Saídas (-):**
     - Valor obrigatoriamente em tom rose/vermelho nítido: `text-rose-400 font-bold font-mono` (`- R$ 490,50`).
     - Avatar Squircle: fundo neutro escuro com acento em rose/coral (`bg-rose-500/10 border-rose-500/20 text-rose-400`) e ícone direcional `<ArrowUpRight size={18} />` ou ícone de boleto em rose. NUNCA teal/verde.
   - **Créditos / Entradas (+):**
     - Valor em verde vibrante: `text-emerald-400 font-bold font-mono` (`+ R$ 3.000,00`).
     - Avatar Squircle: `bg-emerald-500/10 border-emerald-500/20 text-emerald-400` com `<ArrowDownLeft size={18} />` (ou azul para lotes consolidados de cartão).

2. **Hierarquia Limpa de Nomes e Eliminação de Badges Poluentes:**
   - **De-duplicação Algorítmica:** Função que higieniza os nomes do banco, removendo prefixos repetidos de 10 a 15 caracteres (ex.: `AUTO PECAS L AUTO PECAS LUDIO...` -> `Auto Peças Lúdio ABC LTDA`).
   - **Tratamento de Strings Vazias / Traço `-`:** Se o título for `-`, inspecionar o `fitid` ou `counterpart_name` para extrair nome humano (ex.: `ofx_..._juroslimitedaconta` -> `Juros Limite da Conta Itaú`).
   - **Fim dos Mega-Badges no Título:** A razão social fica isolada e limpa no título. As informações de conta de despesa vinculada ou intercompany descem para a linha única de metadados (`Boleto • Conta: ABC Auto Peças • CNPJ: ...`).
   - Badges no topo são restritos a status de ação: `Pendente` (âmbar pulsante) ou `OS #30198` (pílula discreta).

3. **Mecanismo de Desbloqueio e "Mover para Faturamento de Hoje":**
   - Eliminação do bloqueio estrito `🔒 Leitura` que impede ação do usuário.
   - Para transações com data anterior que caíram no lote:
     - Adicionar o botão de ação rápida: **`[Mover p/ Hoje]`** (`target_date = date`).
     - Ao acionar `[Mover p/ Hoje]`, o sistema atualiza o `target_date` da transação para hoje (`2026-09-09`), limpa eventuais travas automáticas de intercompany (`manual_category = null`, `match_status = null`) e inclui o valor no fechamento e faturamento de hoje.
     - Habilitar botões **`[Vincular OS]`** e **`[Justificar / Editar]`** mesmo para lançamentos que vieram de D-1, dando autonomia total ao operador da oficina.

---

## Investigação e Análise de Reuso

- **Componentes Existentes Reutilizados:**
  - `StoreExtratoBancarioView.tsx`: refatoração dos esquemas de cores, avatares, higienizador de títulos e botões de ação contextual.
  - `OrphanCategorizationModal.tsx`: reutilizado diretamente para edição/justificativa.
  - `ManualMatchOsModal.tsx`: reutilizado diretamente para vincular transação à Ordem de Serviço.
- **Tabelas do Supabase:**
  - `transactions` e `ofx_transactions`: atualização de `target_date`, `manual_category` e `manual_justification`.

---

## Risco Principal e Mitigação

- **Risco:** Ao mover uma transação de `2026-09-08` para `2026-09-09`, alterar indevidamente a conciliação histórica de ontem que já estava batida.
- **Mitigação:** O saldo bancário oficial (`bank_total`) do extrato OFX é fiduciário e imutável pelo `<LEDGERBAL>`. O que muda é apenas o apontamento contábil (`target_date` no faturamento). Ao alterar o `target_date`, os caches do React Query para ambas as datas são invalidados, mantendo integridade 100% auditável.
