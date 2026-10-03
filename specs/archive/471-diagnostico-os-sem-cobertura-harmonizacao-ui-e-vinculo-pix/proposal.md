# Proposta de Mudança — Spec 471: Diagnóstico de OS sem Cobertura, Harmonização de Design System e Filtro de OSs de Hoje vs Pátio

## 1. Problema Diagnosticado
1. **Falta de Sinalização da OS sem Cobertura na Tabela:**
   - Quando o cabeçalho ou o banner da Tab 3 avisa que há pagamentos de OS sem cobertura de cartão/PIX (`os_payments.pending > 0`), a tabela de Ordens de Serviço exibe todas as linhas com estilo idêntico. O operador não sabe qual das OSs está com pendência e precisa abrir uma a uma às cegas.
2. **Modal de Detalhe da OS com Dados Ilusórios e Sem Transações Discriminadas:**
   - O componente `OsDetailModal.tsx` atualmente apenas quebra a string de texto do ERP e exibe badges fixos como `"Pareado com OFX"`, mesmo quando a OS não possui transação vinculada no banco. Não há lista individual com data, valor e modalidade ordenada do mais recente ao mais antigo, nem indicação de qual lançamento está sem cobertura.
3. **Inconsistência Visual ("Design Frankenstein"):**
   - Mistura de elementos quadrados com cantos arredondados, botões com cantos diferentes (`rounded-none`, `rounded-full`, `rounded-md`), espaçamentos heterogêneos e badges contrastantes, divergindo do acabamento refinado do Card de Fechamento (`StoreCardModulo1`).
4. **Necessidade de Separação Clara entre OSs Atualizadas Hoje vs Paradas no Pátio:**
   - Caso um gerente esqueça de lançar um pagamento no ERP, o veículo continua com saldo aberto no pátio físico. O operador precisa encontrar facilmente essa OS para vincular o PIX ou cartão recebido hoje, sem que ela fique misturada ou escondida por um filtro temporal rígido.

---

## 2. Solução Proposta

### A. Sinalização Visual Direta na Tabela de OSs (`StoreOrdensServicoView.tsx`)
- Mapear o status de cobertura de cada OS a partir de `dayObservations` (`os_import_observations`) e vínculos ativos.
- Para a OS com pendência de cobertura (ex: OS #582 com crédito não coberto):
  - Exibir a **bolinha vermelha pulsante** ao lado do número `#582`;
  - Exibir badge destacado `🔴 Sem Cobertura` ou `Pendente de Vínculo`;
  - Ao clicar na linha ou no número da OS, abrir imediatamente a visualização de detalhes.

### B. Novo Seletor de Escopo de OSs (3 Pílulas Limpas)
- Substituir o seletor confuso por 3 opções em botões do tipo pill:
  1. **`[ Atualizadas Hoje ({count}) ]`**: Ordens que tiveram movimentação/deltas de ontem para hoje.
  2. **`[ Em Aberto no Pátio ({count}) ]`**: Veículos parados na oficina com saldo em aberto que ainda não foram finalizados (ideal para achar OSs que o gerente esqueceu de lançar e que receberam pagamento hoje).
  3. **`[ Todas / Histórico ({count}) ]`**: Catálogo completo de OSs históricas da filial para busca retroativa.

### C. Reformulação da Tela de Detalhes da OS (`OsDetailModal.tsx`)
- Apresentar a **lista de transações / pagamentos individualizados**:
  - Ordenação estrita: **do mais recente ao mais antigo (descendente)**.
  - Para cada lançamento: **Data**, **Valor**, **Modalidade** (Cartão Crédito, Débito, PIX, Dinheiro, etc.).
  - **Status Real de Cobertura/Vínculo**:
    - `🟢 Vinculado à Rede (Cartão Crédito)` quando houver transação correspondente em `pos_transactions`;
    - `🟢 Vinculado ao Extrato OFX (PIX)` quando houver transação correspondente em `ofx_transactions`;
    - `🟢 Dinheiro em Cofre` para pagamentos em espécie;
    - `🔴 Sem Cobertura na Conciliação` com botão de ação direta `[ Vincular Agora ]` abrindo a busca de transações.

### D. Harmonização Global do Design System (Zinc-950 Padrão Fechamento)
- Uniformizar os raios de borda e superfícies:
  - Containers mestres e cards: `rounded-2xl`
  - Modais, popovers e tabelas internas: `rounded-xl`
  - Botões, inputs, pills e badges: `rounded-lg`
- Eliminar qualquer `rounded-none` ou cantos pontiagudos deslocados.
- Cores estritamente alinhadas ao `DESIGN.md` (Zinc-950 canvas, Zinc-900 painéis, esmeralda para conciliado, rose para pendente, mono para moeda).

---

## 3. Skills Especializadas Aplicadas
- **`frontend-design-pro`**: Padrões de Dark UI Zinc-950, micro-interações, consistência de border-radius e eliminação de AI Slop.
- **`ui-components`**: Componentes canônicos Shadcn/ui (Cards, Modals, Badges, Tables).
- **`database`**: Verificação de consistência relacional entre `patio_os`, `pos_transactions`, `ofx_transactions` e `os_import_observations`.

---

## 4. Arquivos Afetados
- **Arquivos Existentes Modificados:**
  1. `src/components/conciliacao/StoreOrdensServicoView.tsx`: Mapeamento de pendências por OS, bolinha vermelha, novos pills de escopo e harmonização de bordas.
  2. `src/components/conciliacao/OsDetailModal.tsx`: Lista de transações cronológica descendente, verificação real de cobertura e harmonização visual.
  3. `src/components/conciliacao/ManualMatchOsModal.tsx`: Harmonização de bordas (`rounded-2xl`/`rounded-xl`/`rounded-lg`), consistência de botões e abas.
  4. `src/components/conciliacao/StoreExtratoBancarioView.tsx`: Harmonização de bordas na tabela de extrato e no acionamento de vínculo de PIX.
- **Arquivos Novos:**
  - `tests/integration/spec471-os-detail-and-ui-consistency.test.mjs` (validação automatizada da lógica de tri-escopo e lista descendente de pagamentos).

---

## 5. Plano de Rollback
As alterações são 100% restritas a componentes de apresentação frontend (`src/components/conciliacao/`). Se for necessário reverter, basta executar:
```bash
git checkout HEAD -- src/components/conciliacao/StoreOrdensServicoView.tsx src/components/conciliacao/OsDetailModal.tsx src/components/conciliacao/ManualMatchOsModal.tsx src/components/conciliacao/StoreExtratoBancarioView.tsx
```

---

## 6. Risco Principal e Mitigação
- **Risco:** Uma OS com pagamento antigo em aberto no pátio não aparecer se o operador filtrar apenas por "Atualizadas Hoje".
- **Mitigação:** O seletor de escopo em 3 pills permite transitar com 1 clique entre `Atualizadas Hoje`, `Em Aberto no Pátio` e `Todas / Histórico`, além de mostrar contadores em cada pílula.
