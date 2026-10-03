# Design Specification — Spec 471: Diagnóstico de OS sem Cobertura, Harmonização de Design System e Filtro de OSs de Hoje vs Pátio

## 1. Arquitetura de Fluxo de Dados

```
[ Banco Supabase / RPCs ]
       │
       ├─► os_import_observations (deltas contábeis do dia)
       ├─► patio_os (cadastro e valores da OS)
       ├─► pos_transactions (cartões vinculados via matched_os_number)
       └─► ofx_transactions (PIX vinculados via matched_os_number)
       │
       ▼
[ StoreOrdensServicoView.tsx ]
       │  - Mapeia pendência por OS: obs.delta_credit > obs.consumed_credit || obs.delta_debit > obs.consumed_debit
       │  - Renderiza bolinha vermelha pulsante e badge "Sem Cobertura" na linha da OS
       │  - Oferece 3 pills: [ Atualizadas Hoje (N) ] | [ Em Aberto no Pátio (N) ] | [ Todas / Histórico (N) ]
       │
       ▼
[ OsDetailModal.tsx ] (Ao clicar na OS)
       │  - Carrega pagamentos declarados e transações vinculadas
       │  - Lista ordenada cronologicamente: Data (mais recente primeiro) | Valor | Modalidade | Status Real
       │  - Sinaliza o lançamento que está sem cobertura com botão direto [ Vincular Agora ]
       │
       ▼
[ ManualMatchOsModal.tsx ] (Fluxo Unificado de Vinculação)
       │  - Design System harmonizado (rounded-2xl / rounded-xl / rounded-lg)
       │  - Permite vincular Cartão Rede ou PIX OFX
       │  - Atualiza saldo em aberto da OS e recalcula fechamento
```

---

## 2. Design System & Padrões Visuais (Harmonização Anti-Frankenstein)

### Hierarquia Estrita de Border-Radius
- **Nível 1 (Containers Mestre & Hero Cards):** `rounded-2xl` (ex: `StoreCardModulo1`, cards de topo da loja, modais mestres).
- **Nível 2 (Painéis Internos, Modais Secundários e Tabelas):** `rounded-xl` (ex: corpo de modais, containers de tabelas, seções de detalhe).
- **Nível 3 (Componentes Interativos e Chips):** `rounded-lg` (ex: botões `Button`, inputs, pills de filtro, badges e linhas de transação).
- **Regra:** PROIBIDO usar `rounded-none`, cantos quadrados soltos ou `rounded-3xl` discrepantes.

### Superfícies & Luminância (Dark Mode Zinc-950)
- **Fundo / Canvas:** `bg-background` (`#09090b` / Zinc-950).
- **Cards e Painéis:** `bg-zinc-900/40` com borda `border-zinc-800/80` e hover `hover:bg-zinc-900/60 hover:border-zinc-700/80`.
- **Modais e Popovers:** `bg-zinc-950` com borda `border-zinc-800`.
- **Textos:** Títulos em `text-zinc-100`, legendas em `text-zinc-400`, números monetários em `font-mono`.

---

## 3. Especificação das Telas e Componentes

### A. Tabela de OSs (`StoreOrdensServicoView.tsx`)
1. **Tri-Escopo em Pills:**
   ```tsx
   <div className="flex bg-zinc-950 border border-zinc-800 rounded-lg p-0.5 text-[11px]">
     <button onClick={() => setScope('updated_today')} className={...}>
       Atualizadas Hoje ({countUpdatedToday})
     </button>
     <button onClick={() => setScope('open_patio')} className={...}>
       Em Aberto no Pátio ({countOpenPatio})
     </button>
     <button onClick={() => setScope('all')} className={...}>
       Todas / Histórico ({countAll})
     </button>
   </div>
   ```
2. **Sinalização na Linha da OS com Pendência:**
   - Se a OS tiver delta de pagamento sem cobertura comprovada na conciliação:
     - Número da OS: `#582` acompanhado de um ponto vermelho pulsante:
       `<span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse inline-block" />`
     - Badge de alerta na coluna de status ou abaixo do número:
       `<span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">🔴 Sem Cobertura</span>`

### B. Modal de Detalhes da OS (`OsDetailModal.tsx`)
1. **Lista Individualizada de Transações / Lançamentos:**
   - Cada item da lista contém:
     - **Data e Hora:** Formatada em BRT (ex: `25/08/2026 15:40`);
     - **Modalidade e Ícone:** `Cartão de Crédito`, `Cartão de Débito`, `PIX`, `Dinheiro`;
     - **Valor:** Formatado em moeda `R$ X.XXX,XX` em fonte mono;
     - **Status Real de Vínculo:**
       - Se pareado com Rede: `<Badge variant="success">🟢 Vinculado à Rede (Cartão Crédito)</Badge>`
       - Se pareado com OFX: `<Badge variant="success">🟢 Vinculado ao Extrato (PIX)</Badge>`
       - Se Dinheiro: `<Badge variant="warning">🟢 Dinheiro em Cofre</Badge>`
       - Se NÃO coberto: `<Badge variant="danger">🔴 Sem Cobertura na Conciliação</Badge>` + Botão `[ Vincular ]`.
   - **Ordenação:** Array ordenado por data descendente (lançamentos mais recentes no topo).

### C. Modal de Vínculo (`ManualMatchOsModal.tsx`)
- Harmonização estética:
  - Header, tabs e containers com `rounded-xl`;
  - Botões de ação com `rounded-lg`;
  - Feedback claro de saldo restante após o vínculo (`Restante: R$ X,XX`).

---

## 4. Cenários Obrigatórios

### Cenário 1: Happy Path (Identificação e Vínculo de Transação)
1. O operador abre a aba de Ordens de Serviço da filial `st-01`.
2. A OS `#582` aparece com o ponto vermelho pulsante e o badge `🔴 Sem Cobertura`.
3. O operador clica na OS `#582`; o modal de detalhes abre exibindo o lançamento de Cartão de Crédito de R$ 8.196,00 marcado como `🔴 Sem Cobertura na Conciliação`.
4. O operador clica em `[ Vincular ]`, seleciona a venda correspondente da Rede e confirma.
5. O badge atualiza imediatamente para `🟢 Vinculado à Rede`, o alarme do cabeçalho é sanado e o status muda para 100% Conciliado.

### Cenário 2: Edge Case (Gerente Esqueceu de Lançar Pagamento no ERP)
1. O gerente esqueceu de lançar a baixa de um veículo no sistema da filial.
2. Na conciliação do dia, há um PIX de R$ 900,00 recebido no extrato bancário.
3. Na aba de OSs, ao selecionar `[ Em Aberto no Pátio ]`, a OS pendente do veículo aparece imediatamente na lista com saldo de R$ 900,00.
4. O operador clica em "Vincular OS" no PIX do extrato, seleciona essa OS em aberto e confirma.
5. O sistema registra o recebimento do PIX, abate o saldo em aberto da OS para R$ 0,00 e a OS passa a constar como atualizada no dia.

---

## 5. Critérios de Aceitação Verificáveis
1. Toda OS com pendência de cobertura exibe ponto vermelho pulsante e badge de alerta em sua linha na tabela de OSs.
2. O modal de detalhes da OS exibe a lista de lançamentos de pagamento com data, valor e modalidade, ordenados de forma descendente (mais recentes no topo).
3. Cada lançamento no modal de detalhes exibe com fidelidade se está coberto por Rede, OFX, Dinheiro ou sem cobertura.
4. A tabela de OSs oferece os 3 pills (`Atualizadas Hoje`, `Em Aberto no Pátio` e `Todas / Histórico`), sem switches complexos.
5. Todo o layout de tabelas, botões e modais segue rigorosamente a escala de `rounded-2xl`, `rounded-xl` e `rounded-lg`, eliminando o aspecto desalinhado.
6. `npm run build` passa com 0 erros de TypeScript e sem regressão visual.
