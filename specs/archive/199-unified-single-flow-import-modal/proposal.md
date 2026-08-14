# Proposal: Unified Single-Flow Import & Reconciliation Modal (199)

## Problema
1. **Sobrecarga Cognitiva e Poluição por Steppers:**
   - O fluxo de importação anterior misturava uma jornada temporal baseada em múltiplos passos/steppers com grids de preview, inputs manuais fragmentados e múltiplos sub-modais.
   - Isso gerava atrito operacional, navegação confusa ("voltar e avançar telas") e re-renderizações desnecessárias durante o fechamento diário de alta densidade financeira.
2. **Perda de Mapeamentos de Lojas entre Navegadores:**
   - Os vínculos de arquivos/aliases com as lojas estavam sendo persistidos apenas no `localStorage` do navegador.
   - Ao abrir uma nova aba anônima, outro computador ou limpar os cookies, o operador era forçado a refazer todo o mapeamento de lojas manualmente.
3. **Necessidade de Unificação Operacional:**
   - Os inputs manuais do dia (Odômetro Acumulado Hoje, Dinheiro MP, A Receber, Contas Manual) e a resolução manual de OSs órfãs (ordens ativas no banco ausentes na planilha do mês) devem estar concentrados em uma **única tela de fluxo contínuo (Single-Flow Block)**, permitindo conferência e ajuste simultâneo antes da gravação.

## Solução Proposta
1. **Persistência Centralizada de Mapeamentos no Banco de Dados (`store_file_mappings`):**
   - Criação da tabela `store_file_mappings` no Supabase (`file_alias`, `store_id`, `store_name`, `updated_at`).
   - Sincronização bidirecional: ao vincular uma loja no modal, o match é persistido imediatamente no Supabase (com fallback local). Ao abrir o sistema em qualquer navegador novo, todos os matches históricos são carregados automaticamente.
2. **Novo Componente Unificado (`ImportConciliacaoModal.tsx`):**
   - Refatoração completa em **Single-Flow Block de 2 Colunas Responsivas**, eliminando 100% dos steppers.
   - **Design System Dark-UI Sólido (Zinc-950):**
     - Fundo primário `bg-zinc-950` sólido (sem glassmorphism, garantindo contraste estrito WCAG 2.1 AA).
     - Cards estruturais em `bg-zinc-900` com bordas finas `border-zinc-800`.
     - Tipografia Inter/Outfit com contraste limpo (`text-zinc-100` e `text-zinc-400`).
     - Botão de ação primária em Emerald-600 (`bg-emerald-600 hover:bg-emerald-500 text-white`).
3. **Estrutura Visual do Modal:**
   - **Cabeçalho:** Título claro *"Importação e Fechamento Diário"* com seletor e badge da data em destaque (`font-mono`).
   - **Coluna Esquerda (Upload & Inputs Globais):**
     - Dropzone de arquivos (OFX, Relatórios de Pátio e Rede) com feedback visual de carregamento por arquivo e badge da loja mapeada automaticamente via Supabase.
     - Card de Dados Manuais com inputs estilizados com foco `ring-2 ring-emerald-500`:
       - Odômetro Acumulado (Hoje)
       - Dinheiro MP
       - A Receber
       - Contas (Manual)
   - **Coluna Direita (Grid de Ajuste de OSs Órfãs):**
     - Exibição de tabela limpa quando detectadas OSs ativas no banco que não vieram no relatório do mês:
       - Nº OS (badge mono) e Placa do Carro.
       - Input numérico livre para `Valor Total`.
       - Input numérico livre para `Total Pago`.
       - `<select>` para `Status` (`em_aberto`, `pago_parcial`, `finalizado`, `cancelado`).
       - Zero automações ou baixas mágicas: controle 100% manual do operador.
4. **Fluxo de Persistência em Lote (Zero Re-renders Lentos):**
   - Todos os inputs globais e as alterações da tabela de OSs ficam armazenados em memória no estado React local.
   - A gravação ocorre de forma atômica em lote no Supabase ao clicar no botão **"Confirmar e Gravar Fechamento"**.

## Contratos de Dados
- **Tabelas Supabase:**
  - `store_file_mappings`: Tabela para armazenar matches persistentes (`id`, `file_alias`, `store_id`, `store_name`, `updated_at`).
  - `daily_snapshots`: Gravação de `faturamento` (odômetro), `dinheiro_mp`, `a_receber_manual`, `contas_a_pagar`, `caixa_atual`.
  - `patio_os`: Upsert e update das ordens de serviço novas e órfãs ajustadas.
  - `transactions` / `reconciliations`: Gravação dos extratos OFX e movimentações de maquininha.

## API / Interface
- **Componentes React:**
  - `src/components/conciliacao/ImportConciliacaoModal.tsx`: Componente mestre de importação e fechamento em bloco único.
  - `src/hooks/useStoreFileMappings.ts`: Hook para sincronização dos matches de lojas no Supabase.
  - Integração limpa na página `/conciliacao` e `/importacoes`.

## Features Existentes Impactadas
- `specs/global/features.md`:
  - `Modal de Importação e Fechamento (ImportConciliacaoModal)`: Substitui o fluxo fragmentado por Single-Flow Block de 2 colunas com mapeamento persistente no banco.

## Risco Principal
- **Risco:** O usuário esquecer de preencher um dos inputs manuais antes de salvar.
  - **Mitigação:** Validação de campos antes de disparar o fechamento com destaque visual e avisos via toast.
