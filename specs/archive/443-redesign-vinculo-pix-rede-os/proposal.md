# 📄 Proposta de Mudança — Spec 443: Redesign & Anti-Slop no Vínculo de PIX e REDE a OS

## 1. Contexto e Motivação
Na conciliação diária da oficina, os operadores frequentemente precisam vincular transações de entrada bancária (PIX via extrato OFX em `StoreExtratoBancarioView`) ou vendas de cartão de maquininha (`StoreCartaoMaquininhaView` / REDE) a Ordens de Serviço (OSs) abertas ou pendentes no pátio.

Atualmente, essa operação é centralizada no componente `ManualMatchOsModal.tsx`. Contudo, a experiência atual sofre de sérios problemas de usabilidade, ergonomia e poluição visual:
1. **Layout Apertado & "Mini-Excel":** O modal tenta espremer uma tabela densa de 7 colunas (`OS #`, `Cliente / Placa`, `Pagamento`, `Total OS`, `Saldo Aberto`, `Match`, `Ações`) dentro de uma janela com altura fixa de 288px (`max-h-72`). Em telas normais, os textos e nomes de clientes são truncados precocemente (`max-w-[180px]`), e duas ações concorrentes (`[Vincular & Quitar]` e `[Dinheiro]`) disputam uma célula minúscula.
2. **AI Slop & Ruído Decorativo:** Presença de elementos visuais clichês e redundantes:
   - Ícones de faísca (`Sparkles`) em micro-badges de match.
   - Emojis em botões e abas (`🔍 Vincular à OS Existente`, `➕ Criar Nova OS na Filial`, `🎉 OS criada`).
   - "Aviso Contábil" sermoneador e redundante no rodapé ocupando espaço vertical nobre.
   - Cores conflitantes em arco-íris nas linhas (verde com borda verde, azul com borda azul, âmbar).
3. **Falta de Feedback e Visibilidade Financeira Imediata:** O operador não consegue ver com clareza o espelho do cálculo contábil antes de vincular: quanto está entrando, quanto está em aberto na OS, qual será o saldo restante e se a OS será quitada ou amortizada parcialmente.

## 2. Objetivos
1. **Redesenho Master-Detail (Inspirado no padrão Midday / Linear / Dark Zinc-950):**
   - **Cabeçalho Limpo:** Transação em foco em banner superior com hierarquia fiduciária calma (origem, data, favorecido/título e valor em destaque mono tabular `text-2xl text-emerald-400`).
   - **Painel Esquerdo (Lista de OSs + Busca Rápida):** Campo de busca com autofocus e lista de OSs candidatas em linhas/cards espaçosos, exibindo número da OS, cliente legível, placa e saldos sem aperto. Pré-seleção automática da OS com maior probabilidade de match.
   - **Painel Direito (Espelho de Amortização & Ação de 1 Clique):** Exibição do cálculo financeiro exato (Saldo Aberto - Recebimento = Novo Saldo da OS) com o botão principal `[ Confirmar Vínculo na OS #XXXX ]`.
2. **Eliminação Integral de AI Slop:** Remoção de emojis, badges com faíscas, avisos contábeis óbvios e cores berrantes nas linhas, aderindo 100% ao `DESIGN.md` (Zinc-950, tokens semânticos, zero classes arbitrárias).
3. **Aba de Cadastro de Nova OS Refinada:** Formulário limpo em 2 colunas para registrar e vincular na hora quando a OS não constar no sistema.
4. **Preservação de 100% dos Contratos:** Nenhuma alteração nas assinaturas de props de `ManualMatchOsModalProps` ou nas RPCs existentes (`link_manual_pix_to_os`, `link_manual_rede_to_os`, `create_and_link_manual_os`).

## 3. Blast Radius
- **Arquivo Modificado Diretamente:**
  - `src/components/conciliacao/ManualMatchOsModal.tsx`
- **Consumidores Afetados (Sem quebra de contrato):**
  - `src/components/conciliacao/StoreExtratoBancarioView.tsx` (Vínculo de PIX)
  - `src/components/conciliacao/StoreCartaoMaquininhaView.tsx` (Vínculo de Cartão / REDE)
  - `src/components/importacoes/wizard/Step1UnregisteredPayments.tsx` (Vínculo no Wizard de Importação)
- **Hooks & RPCs (Inalterados, reutilizados integralmente):**
  - `src/hooks/useManualMatch.ts`
  - `link_manual_pix_to_os` (Postgres RPC)
  - `link_manual_rede_to_os` (Postgres RPC)
  - `create_and_link_manual_os` (Postgres RPC)

## 4. Verificação de Terminal
- Comando: `npm run build`
- Critério: Compilação limpa do Vite/TypeScript com 0 erros.
