# Design: CorreçÁo Histórica de ConciliaçÁo e Bootstrap (076)

## Arquitetura Técnica
1. **Migration SQL:** Injetar campo numérico `na_loja_os` na tabela `reconciliations`.
2. **Hook Modificado (`useModulo1StoresData`):** Faremos um JOIN lógico (via Query) na tabela `reconciliations` filtrado pela `target_date`. Ao compor o state da loja, verificaremos se `reconciliations.na_loja_os` nÁo é nulo. Se nÁo for, assumimos o histórico como verdade. Caso seja nulo (novo dia nÁo consolidado), iteramos o array live de `patio_os`.
3. **Save Action (`useSaveDailySnapshot` & `ResumoDiaPanel.tsx`):** Ao fechar o dia, garantir que o UPSERT persista o `na_loja_os` por loja na tabela `reconciliations` local. E no `bootstrap.tsx`, inserir este valor diretamente junto do `caixa_atual`.

## Componentes / Hooks / Funções
1. `supabase/migrations/20260804000001_add_na_loja_os_history.sql`: Arquivo SQL novo para alteraçÁo pontual na base de dados.
2. `src/hooks/useConciliacao.ts` → `useModulo1StoresData`: Adicionar a leitura de `reconciliations` filtrado por `date` (atualmente ele já nem usa, entÁo passaremos a usar para extrair histórico).
3. `src/routes/bootstrap.tsx`: 
   - Adicionar coluna "Pátio Pendente" (`na_loja`).
   - Calcular `caixa_atual` na payload do snapshot `(saldo + na_loja)`.
4. `src/components/conciliacao/ResumoDiaPanel.tsx`: Garantir que `handleSave` grave o snapshot individual de `na_loja_os` no UPSERT de `reconciliations` para cada filial, congelando o dado.
5. `src/routes/conciliacao.index.tsx`: Modificar o Hook inicial: `useState(() => new Date().toISOString().substring(0, 10))` para abrir no dia corrente.

## Fluxo de UI
1. Usuário abre a conciliaçÁo e aterrissa automaticamente na data de *HOJE*.
2. Acessa `/bootstrap`, insere a pendência herdada do Excel (ex: R$ 13.000 para Jabaquara) na nova coluna. O sistema calcula o "Caixa Atual" do Dia 0.
3. No dashboard principal, ao retroagir para datas passadas, o campo "Na Loja OS" exibe a fotografia congelada daquele dia e a Diferença volta ao normal (zerada), resolvendo os 93k errôneos derivados da ausência do caixa anterior.

## Cenários de VerificaçÁo (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** [estado inicial] `Data da Rota de ConciliaçÁo` → [açÁo] `Dar refresh na página` → [resultado esperado] `A data selecionada é HOJE (e nÁo ontem)`.
- **Cenário 2:** [estado inicial] `Bootstrap incompleto` → [açÁo] `Preencher saldo R$100, Pátio R$50 e Salvar` → [resultado esperado] `O daily_snapshots deve conter caixa_atual = 150 (resolve 93k error)`.
- **Cenário 3:** [estado inicial] `Tabela reconciliations` → [açÁo] `Consultar storeId do Jabaquara para data passada` → [resultado esperado] `O hook useModulo1StoresData retorna 13k persistidos ignorando os 1.6k live`.
