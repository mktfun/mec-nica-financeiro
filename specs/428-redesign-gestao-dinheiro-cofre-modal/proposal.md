# Proposal — Spec 428: Redesign e Alinhamento Visual do Modal de Gestão de Dinheiro em Cofre

## 1. Problema & Diagnóstico Visual

Ao abrir a visualização detalhada do dinheiro no cofre através do componente [`CashVaultCompositionModal.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/CashVaultCompositionModal.tsx), a interface apresenta graves problemas de ergonomia, enquadramento e desvio das diretrizes visuais do `DESIGN.md`:

1. **Espremimento Horizontal Crítico (`size="xl"`):**
   - O modal está configurado como `size="xl"` (`max-w-4xl` = 896px). Uma tabela com 7 colunas analíticas (Loja, OS/Placa, Cliente/Descrição, Data, Valor, Status, Ação) não possui largura física suficiente nesse breakpoint.
   - Isso força quebras de linha artificiais em botões de ação ("Voltar \n p/ \n Cofre") e nomes de filiais ("Dom Pedro \n - DP"), gerando uma aparência amadora e poluída.
2. **Conflito de Margens Negativas no Header (`-mx-6 -mt-6 mb-6`):**
   - O componente pai [`Modal.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/ui/Modal.tsx) já injeta um cabeçalho padronizado com `title`, botão de fechar e padding de conteúdo `p-6`.
   - `CashVaultCompositionModal.tsx` tenta injetar um segundo cabeçalho com margens negativas (`-mx-6 -mt-6 mb-6`), gerando um efeito de cabeçalho duplo, colisão de bordas e desalinhamento de rolagem.
3. **Cores Hardcoded e Violações de AI Slop:**
   - Uso de bordas e backgrounds coloridos fluorescentes (`border-amber-500/30`, `border-emerald-500/30`, `border-rose-500/30`, `bg-indigo-500/10`), que destoam da paleta monocromática com elevação por luminância (Zinc-950 / Zinc-900 / tokens semânticos) praticada no restante do sistema (ex.: `SaldoBancosDetailModal.tsx`).
4. **Falta de Scroll Horizontal e Altura Controlada:**
   - Ausência de container com `overflow-x-auto` e largura mínima (`min-w-[760px]`) na tabela de frações e na tabela de sugestões de despesas, provocando compressão de células em resoluções menores.

---

## 2. Solução Proposta

Refatorar visualmente [`CashVaultCompositionModal.tsx`](file:///c:/Users/admin/.gemini/antigravity/scratch/financeiro/src/components/conciliacao/CashVaultCompositionModal.tsx) aplicando rigorosamente os padrões de **Frontend Design Pro** e `DESIGN.md`:

1. **Expansão do Modal para `size="2xl"` (`max-w-6xl`):**
   - Conceder 1152px de largura útil, idêntico ao `SaldoBancosDetailModal.tsx`, permitindo que todas as 7 colunas respirem com folga e sem quebras de linha em textos e botões.
2. **Eliminação de Margens Negativas e Header Duplo:**
   - Remover os hacks de CSS `-mx-6 -mt-6 mb-6`.
   - Utilizar a barra de contexto e botões de ação (ex.: "+ Registrar Saída") alinhados organicamente ao fluxo de conteúdo superior.
3. **Padronização dos Cards de Métricas com Tokens Semânticos:**
   - Substituir as caixas com bordas coloridas saturadas por cards alinhados ao Design System: superfícies `bg-card border border-border/60`, tipografia `font-sans tabular-nums`, indicadores sutis de status e hierarquia tipográfica equilibrada.
4. **Tabela Profissional com `whitespace-nowrap` e Scroll Seguro:**
   - Definir larguras mínimas por coluna (`min-w-[120px]` para Loja, `min-w-[110px]` para OS/Placa, `min-w-[90px]` para Data, `min-w-[100px]` para Valor, `min-w-[120px]` para Ação).
   - Garantir que o botão "Voltar p/ Cofre" e "Marcar Depositado" fiquem estritamente em uma única linha (`whitespace-nowrap`).
   - Container de tabela com `overflow-x-auto` e `max-h-[420px] overflow-y-auto` com scrollbar discreta.
5. **Harmonização da Aba de Sugestões de Saídas (Contas sem OFX):**
   - Substituir o painel roxo/índigo genérico por um callout técnico elegante alinhado aos tokens de alerta semântico (`bg-muted/50 border border-border text-foreground`).

---

## 3. Skills Especializadas Aplicadas

- **frontend-design-pro:** Padrões Dark UI Zinc-950, eliminação de AI Slop, regras de Rauno Freiberg (hierarquia tipográfica, tabular-nums, feedback imediato).
- **ui-components:** Reutilização de tokens e padrões consistentes com `SaldoBancosDetailModal.tsx`.

---

## 4. Contratos de Dados & Lógica de Negócio

- **Tabelas Envolvidas:** Nenhuma alteração de schema. Mantém-se o consumo de:
  - `store_cash_vault` (frações de dinheiro)
  - `daily_manual_bills` (contas sem OFX para baixa em dinheiro)
  - `stores` (filiais)
  - `daily_snapshots` (congelamento histórico)
- **Mutações:** Mantém 100% íntegras as mutações existentes:
  - `toggleDepositMutation` (alternância entre `depositado` e `em_transito`)
  - `payBillWithCashMutation` (baixa de conta com dinheiro de cofre)
  - `ignoreBillMutation` (ignorar conta)
  - `registerExpenseMutation` (registro avulso de saída de cofre)

---

## 5. Arquivos Afetados

### [Arquivos Existentes Modificados]
- `src/components/conciliacao/CashVaultCompositionModal.tsx` (Refatoração visual do layout, tabela, cards e abas)

### [Arquivos Novos]
- Nenhum arquivo novo necessário.

---

## 6. Plano de Rollback

Caso haja qualquer quebra de regressão visual ou funcional:
- Reverter o arquivo `src/components/conciliacao/CashVaultCompositionModal.tsx` para a versão anterior preservada no Git.
- Nenhuma alteração de banco de dados é realizada nesta spec.

---

## 7. Riscos & Mitigações

- **Risco:** Perder alguma funcionalidade interativa (ex.: modal de registrar saída, alternar status de depósito, baixa de contas).
- **Mitigação:** Preservar 100% dos hooks, mutações, queries do React Query, modais internos e callbacks de sucesso já testados. A intervenção é estritamente na casca de apresentação JSX e classes Tailwind.
