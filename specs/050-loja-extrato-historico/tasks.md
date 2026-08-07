# Tasks - Histórico de Lançamentos da Loja (Spec 050)

## Frontend Engineer
- [x] No arquivo `src/routes/loja.$lojaId.tsx`:
  - [x] Encontrar o container que renderiza as abas de seleçÁo de painel (próximo de `tab === 'caixa'`).
  - [x] Adicionar as opções de aba `entradas` e `saidas` ao estado do componente (`const [tab, setTab] = useState<'caixa' | 'entradas' | 'saidas'>('caixa');`).
  - [x] Renderizar os botões para "Entradas" e "Saídas" ao lado de "Caixa Físico".
  - [x] Abaixo, onde o conteúdo da aba é exibido (`tab === 'caixa' ? ... : null`), implementar a condicional para renderizar as listagens de Entradas e Saídas baseando-se em `extrato?.transactions`.
  - [x] Para `tab === 'entradas'`, filtrar as transações onde `type === 'in'` e listá-las usando a UI de `motion.div` que exibe a transaçÁo com data, título e valor verde.
  - [x] Para `tab === 'saidas'`, filtrar as transações onde `type === 'out'` e listá-las com a UI correspondente em valor vermelho.

## QA & ValidaçÁo
- [x] O `npm run build` deve compilar sem erros de React e TypeScript.
- [x] Clicar nas abas deve transitar entre o Caixa Físico, as Entradas do mês e as Saídas do mês sem problemas.
