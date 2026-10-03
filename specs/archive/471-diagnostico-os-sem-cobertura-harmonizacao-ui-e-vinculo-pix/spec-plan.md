# Spec Plan — Spec 471: Diagnóstico de OS sem Cobertura, Harmonização de Design System e Filtro de OSs de Hoje vs Pátio

Status: Implementação Concluída com Sucesso (`/sdd-apply 471`). Aguardando validação do usuário.

---

## Grupo 1: [FRONTEND] Tabela de Ordens de Serviço & Sinalização de Cobertura

- [x] Completed — **Task 1.1:** Sinalização de OS sem cobertura em `src/components/conciliacao/StoreOrdensServicoView.tsx`:
  - Mapear a partir de `dayObservations` quais OSs possuem deltas não cobertos (`delta_credit > consumed_credit || delta_debit > consumed_debit || delta_pix > 0 sem vínculo`).
  - Renderizar ponto vermelho pulsante (`animate-pulse`) e badge `🔴 Sem Cobertura` diretamente na linha da OS afetada.
  - **Critério de Verificação:** A OS #582 (ou qualquer OS com pendência) destaca-se visualmente com ponto vermelho e badge na tabela.

- [x] Completed — **Task 1.2:** Tri-escopo em pills limpos em `src/components/conciliacao/StoreOrdensServicoView.tsx`:
  - Substituir o seletor atual por 3 botões em pill: `[ Atualizadas Hoje ({count}) ]`, `[ Em Aberto no Pátio ({count}) ]` e `[ Todas / Histórico ({count}) ]`.
  - Atualizar os filtros para responder instantaneamente à pílula selecionada.
  - **Critério de Verificação:** O usuário transita com 1 clique entre o movimento de hoje e as OSs paradas no pátio.

---

## Grupo 2: [FRONTEND] Modal de Detalhe da OS & Transações Descendentes

- [x] Completed — **Task 2.1:** Reformulação da lista de pagamentos em `src/components/conciliacao/OsDetailModal.tsx`:
  - Consultar transações vinculadas à OS (`pos_transactions` e `ofx_transactions`) associadas ao número da OS na filial.
  - Exibir a lista individual de pagamentos com Data, Valor, Modalidade e Status Real de Cobertura (`Vinculado à Rede`, `Vinculado ao Extrato`, `Dinheiro`, `Sem Cobertura`).
  - Ordenar os lançamentos estritamente em ordem cronológica descendente (mais recentes no topo).
  - Incluir botão direto de vincular para lançamentos sem cobertura.
  - **Critério de Verificação:** Ao abrir a OS #582, os lançamentos aparecem listados do mais recente ao mais antigo com o status real de cada um.

---

## Grupo 3: [UI/UX] Harmonização Global de Design System (Anti-Frankenstein)

- [x] Completed — **Task 3.1:** Padronização de Border-Radius e Superfícies Zinc-950:
  - Harmonizar containers e cards com `rounded-2xl` em paridade com o card de fechamento `StoreCardModulo1`.
  - Harmonizar modais (`OsDetailModal.tsx`, `ManualMatchOsModal.tsx`), popovers e tabelas com `rounded-xl`.
  - Harmonizar botões, pills, inputs e badges com `rounded-lg`.
  - Eliminar cantos retos aleatórios (`rounded-none`) ou classes divergentes.
  - **Critério de Verificação:** A interface apresenta consistência geométrica total e transições suaves entre modais, tabelas e cards.

---

## Grupo 4: [VERIFY] Validação Automatizada e Quality Gate

- [x] Completed — **Task 4.1:** Criar teste de integração `tests/integration/spec471-os-detail-and-ui-consistency.test.mjs`:
  - Validar a lógica de filtragem do tri-escopo (`atualizadas_hoje`, `aberto_patio`, `todas`).
  - Validar o algoritmo de detecção de OS sem cobertura e a ordenação cronológica descendente dos pagamentos.
- [x] Completed — **Task 4.2:** Executar Quality Gate de build (`npm run build`) comprovando zero erros de TypeScript.
