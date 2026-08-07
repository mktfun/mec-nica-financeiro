# Design: ImportaçÁo Financeira 2026

## 1. Experiência de UI (Liquid Glass & UX 2026)
Seguindo os padrões do sistema baseados na Spec de Design 2026 (Liquid Glass, Neomorfismo Sutil):
A nova rota `/importacoes` será um **Dashboard com Wizard Integrado**.

### Passo 1: Upload (Drag & Drop Expansivo)
- Área central gigante, tracejada com cores primárias `border-[var(--color-primary)]/50` e microanimações brilhantes (gradient flow) indicando onde o usuário deve soltar o arquivo.
- O componente suporta arrastar múltiplos arquivos de uma só vez (Ex: soltar `BuscaContasAPagar.xls` e `JUROS REDE.xlsx` juntos).
- Indicador em tempo real (Skeleton Loading com gradiente) enquanto `xlsx.js` roda a leitura no client-side.

### Passo 2: O Motor de Mapeamento (Intelligent Matching)
- Uma UI de listagem (Card list) com efeito Glassmorphism.
- Ao invés de uma tabela seca, teremos Cards mostrando: "Loja identificada: **MPrudge**". Do lado direito, um `<select>` ou `Command (Combobox)` com as Lojas do DB.
- Microinterações WCAG 2.2: O `<select>` pisca (Pulse effect) em amarelo quando é obrigatório. Quando mapeado, vira verde translúcido e mostra o logo/ícone da loja.

### Passo 3: O Resumo (Review Board)
- Uma mesa de validaçÁo: "SerÁo processadas **X** despesas".
- Accordions expansíveis para o gestor abrir "Juros de Rede" e ver "Stone - Piraporinha - R$ 39,51" sem precisar abrir a planilha.
- BotÁo CTA grandioso (Maximalismo Tátil): Bordas arredondadas `rounded-full`, sombra brilhante projetada para fora, hover magnético.

## 2. Modelagem do Banco de Dados
A infraestrutura principal do Supabase (tabela `transactions`) **nÁo precisará ser alterada** em sua base (DML), mas as despesas importarÁo metadados:

### Modificações no Fluxo
- **Tabela `transactions`:** 
  - Inserções em lote (`insert([...])`) via REST/SDK.
  - `type`: `'out'`
  - `amount`: valor lido no XLS.
  - `description`: lido do XLS (ex: "REF. RECARGA CARTÁO FLASH").
  - `category`: `'contas_pagar'` ou `'juros_rede'`.
  - `occurred_at`: `Dt. Pgto` convertida do Excel Date Time (ou today caso vazio).
  
### Persistência de Mapeamentos
- Para manter o estado dos mapeamentos, usaremos o `localStorage` do navegador para manter o vínculo entre `MPrudge -> uuid-da-loja`, ou se necessário futuramente, uma pequena tabela no Supabase `store_mappings (alias, store_id)`. Para o escopo inicial focado em Front, o `localStorage` via Zustand ou Context resolverá magicamente a persistência do De/Para (US2).

## 3. Padrões de Componentes Shadcn
- `Dropzone`: React Dropzone + Tailwind animate-pulse.
- `Combobox`: Do Radix/Shadcn para lidar com o pareamento de nomes de lojas.
- `ScrollArea`: Para comportar centenas de linhas lidas do relatório sem quebrar a tela (UX Premium).
- `Table/List`: RenderizaçÁo virtualizada (opcional caso os XLS sejam gigantes).
