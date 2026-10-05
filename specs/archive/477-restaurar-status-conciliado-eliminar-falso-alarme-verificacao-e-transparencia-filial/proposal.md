# 📄 Proposal — Spec 477: Restauração do Status Canônico (Conciliado/Divergência), Eliminação de Falso Alarme de Verificação e Transparência por Filial

## 1. Problema Diagnosticado
O usuário relatou duas queixas centrais na experiência de conciliação diária:
1. **Sumiço do Status Claro ("Sumiu os bglh certinho"):**
   - Antes das últimas specs, o operador identificava imediatamente se a filial estava batida através do badge verde **`CONCILIADO`** ou se havia divergência com o badge vermelho **`DIVERGÊNCIA`**.
   - No estado atual, o card da filial (`StoreCardModulo1.tsx`) não renderiza mais o badge de "CONCILIADO" quando a loja está perfeitamente equilibrada (`isDiferencaOk === true`), deixando a impressão de que nada está certo.
2. **Alarme Falso Vermelho de "VERIFICAÇÃO INCOMPLETA":**
   - Lojas com 100% de conciliação financeira e zero pendências (como Dom Pedro no dia 26/08, com R$ 7.615,74 de entradas batidas, R$ 1.370,00 de contas batidas e cartão vinculado à OS #587) exibem um badge agressivo em vermelho: **`VERIFICAÇÃO INCOMPLETA`**.
   - Causa técnica: a lógica `(!isSemMovimento && !verificacao)` marca qualquer ausência ou transição de metadados como erro crítico (`variant="danger"`).
3. **Falta de Transparência nas Pendências ("Não fala quanto que tá e o que falta"):**
   - Quando há alguma pendência real, o badge exibe apenas um contador cego sem apontar o valor ou a categoria (se é maquininha sem OS, débito órfão ou crédito não identificado).
4. **Opacidade na Página da Filial (`/conciliacao/$lojaId`):**
   - Ao clicar na loja para verificar o motivo da "Verificação Incompleta", o operador não encontra nenhuma indicação ou alerta de erro — todas as abas aparecem limpas, sem saber se a loja está aprovada ou com pendências reais.

---

## 2. Solução Proposta
1. **Restauração Imediata do Status Canônico no Card da Filial (`StoreCardModulo1.tsx`):**
   - Se `isDiferencaOk`: Renderizar compulsoriamente o badge verde `<Badge variant="success">CONCILIADO</Badge>`.
   - Se `hasACompensar`: Renderizar concomitantemente `<Badge variant="warning">A COMPENSAR</Badge>`.
   - Se `!isDiferencaOk && !isSemMovimento`: Renderizar `<Badge variant="danger">DIVERGÊNCIA (R$ X,XX)</Badge>`.
   - Se `isSemMovimento`: Renderizar `<Badge variant="neutral">SEM MOVIMENTO</Badge>`.
2. **Eliminação do Falso Alarme de Vínculos:**
   - Remover a regra que gerava erro em caso de metadados nulos (`!verificacao`).
   - Se `pendingCount === 0`, o sistema reconhece a conformidade sem gerar alerta de perigo.
   - Se `pendingCount > 0`, exibir badge de atenção âmbar (`variant="warning"`) indicando a quantidade de pendências (ex: `1 VÍNCULO PENDENTE`) com tooltip detalhando exatamente o pilar afetado.
3. **Feedback Executivo na Tela da Filial (`conciliacao.$lojaId.tsx`):**
   - Injetar no topo da página um banner de status objetivo:
     - Filial Conciliada: Banner com ícone de sucesso confirmando que entradas, saídas e cartões estão 100% batidos.
     - Filial com Pendências: Banner destacando exatamente onde está a ação necessária (ex: "Aba 1: Cartão sem OS vinculada").
4. **Correção do Erro 400 no Hook do Robô (`useBotDownloadedFiles.ts`):**
   - Ajustar a query para não solicitar a coluna inexistente `code` da tabela `stores`.

---

## 3. Skills Especializadas Aplicadas
- `frontend-design-pro`: Padrões de Dark UI Zinc-950, uso estrito de tokens semânticos (`bg-emerald-950/50`, `text-emerald-400`, `bg-rose-950/50`, `text-rose-400`) e eliminação de AI Slop.
- `ui-components`: Utilização canônica do componente `Badge` e `Card`.

---

## 4. Arquivos Afetados
- [MODIFICAR] `src/components/conciliacao/StoreCardModulo1.tsx` (Restauração de badges e remoção de falso alarme)
- [MODIFICAR] `src/routes/conciliacao.$lojaId.tsx` (Banner de fechamento da filial e clareza das abas)
- [MODIFICAR] `src/hooks/useBotDownloadedFiles.ts` (Remoção da coluna `code` inexistente)

---

## 5. Plano de Rollback
As alterações são estritamente no frontend de apresentação e consumo de dados já existentes da RPC `get_daily_reconciliation_summary`. Caso ocorra qualquer inconsistência, `git checkout` nos 3 arquivos restaura o estado anterior instantaneamente.

---

## 6. Risco Principal e Mitigação
- **Risco:** Reaparecer status inconsistente caso `isDiferencaOk` e `hasACompensar` entrem em conflito.
- **Mitigação:** Hierarquia explícita de renderização de badges — a condição de saldo bate de forma ortogonal com a condição de liquidação de cartões a compensar.
