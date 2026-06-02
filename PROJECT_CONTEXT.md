# Contexto do Projeto: Sistema de Fechamento de Caixa (Mecânica Financeiro)

Este documento foi criado para servir de "Cérebro" ou "Dicionário" para qualquer Inteligência Artificial (ou humano) que for atuar no projeto no futuro. Ele explica detalhadamente o estado atual do sistema, suas regras de negócio e a estrutura técnica.

## 1. Visão Geral e Propósito
O sistema é um CRM financeiro desenhado para lojas e franquias automotivas que utilizam o ERP "Oficina Inteligente". Como o Oficina Inteligente não possui uma conciliação financeira sofisticada e fácil para caixas multi-lojas, este sistema importa relatórios (geralmente em formato Excel/XLSX) extraídos do ERP e os consolida de forma limpa, moderna e inteligente, auxiliando gestores na detecção de fraudes e furos de caixa.

O foco não é substituir o ERP, mas atuar como uma **camada de inteligência e conciliação financeira**, permitindo bater de frente o que foi lançado no sistema vs. o que de fato caiu na conta bancária ou está fisicamente no caixa.

## 2. Stack Tecnológica
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion, Radix UI.
- **Roteamento:** TanStack Router (File-based routing).
- **Gerenciamento de Estado/Cache:** TanStack Query (React Query).
- **Backend/Banco de Dados:** Supabase (PostgreSQL), Edge Functions (se aplicável), Row Level Security (RLS).
- **Processamento de Planilhas:** `xlsx` para leitura no lado do cliente (navegador).

## 3. Módulos Principais

### A. Conciliação Diária (`/conciliacao`)
É o coração do sistema. Mostra uma lista de dias x lojas.
- Compara `os_total` (Faturamento total de OSs fechadas no dia, já com juros/descontos somados) vs. `financial_total` (Soma das entradas financeiras).
- Exibe o status daquele dia: **Verde (Conciliado)**, **Vermelho (Divergência)** ou **Amarelo (Pendente)**.
- Qualquer usuário com acesso de loja só vê as suas, mas um *admin* pode ver de todas as filiais.

### B. Extrato Bancário e Transações (`/loja/$lojaId`)
No painel da loja, há um histórico de todas as entradas bancárias.
- **Transações Vinculadas:** Pagamentos de OSs (PIX, Crédito, Débito, Transferência) tornam-se transações no extrato bancário.
- Se uma transação do dia não pertence a uma OS (por exemplo, lançamento avulso via tela), ela compõe a diferença de divergência "Transações sem OS".
- **Taxas da Maquininha:** Foi construído um parser inteligente em `src/hooks/useImportProcessor.ts` e `src/lib/utils.ts` que lê textos exportados no formato `"Crédito: 100.00 [Juros: 5.00]"` e aplica o juros ao valor total, para que o caixa bata perfeitamente ao centavo.

### C. Caixa Físico (Gaveta)
Implementado na Spec `017`. O sistema entende que **Dinheiro em Espécie não vai pro Banco**.
- Quando a planilha de OS diz "Dinheiro: 50.00", o sistema separa esse valor das transações bancárias.
- Ele cria um registro `pending` na tabela `cash_registers` para aquele dia.
- O gerente da loja precisa ir na aba "Caixa Físico", ver que o sistema "espera R$ 50,00", contar as notas na gaveta e digitar no sistema. Só então o caixa do dia fecha, registrando se houve sobra ou falta de moedas na gaveta física.

### D. Sistema de Importação (Botão "Importar Relatório")
A planilha exportada pelo Oficina Inteligente (`RelatorioOS... .xlsx`) tem cabeçalhos bizarros (2 a 3 linhas acima dos dados) e as vezes repete OS. O hook `useImportProcessor.ts` possui lógicas pesadas para:
1. Encontrar onde de fato começam os cabeçalhos das colunas (`Status`, `Data de Inclusão`, `Nº da O.S.`, etc).
2. Mapear cada campo.
3. Gerar registros nas tabelas `patio_os`, `transactions` e `cash_registers`.
4. Idempotência: O sistema usa a chave do número da OS para nunca duplicar pagamentos, permitindo importar o mesmo dia várias vezes sem gerar erros.

## 4. Banco de Dados (Tabelas Supabase)

- **`stores`**: Cadastros de lojas (filiais).
- **`users`**: Metadados adicionais dos usuários.
- **`patio_os`**: O.S. extraídas do sistema fonte.
- **`receivables`**: Contas a receber (lançamentos futuros).
- **`import_logs`**: Logs consolidados de quanto faturou cada dia.
- **`transactions`**: O Extrato Bancário. Representa o que efetivamente "entrou" ou "saiu" da conta (Cartões, Pix).
- **`cash_registers`**: O Fechamento Físico. Representa promessas em Dinheiro que precisam de validação humana (o gerente contar as cédulas na gaveta).
- **`reconciliations`**: Consolidação diária, apurando a saúde financeira (Aprovado vs Divergência) de uma Loja em um Dia.

## 5. Regras de Negócio Importantes
- **Tratamento de Custos (Saídas):** A mecânica registra a grande maioria de seus custos e saídas (contas de luz, compra de peças) diretamente dentro do próprio sistema "Oficina Inteligente" (às vezes criando OSs negativas ou lançamentos). Por conta disso, o Extrato Bancário do aplicativo deve se comportar como um leitor espelho do arquivo, não precisando (idealmente) forçar que o gestor cadastre despesas manualmente dentro do próprio CRM de conciliação.
- **Sincronia Automática:** O CRM não deve exigir trabalho humano duplo. Se o mecânico lança no sistema raiz, basta jogar a planilha no CRM que as coisas batem sozinhas. Apenas em falhas gravíssimas (esquecer de lançar) o dashboard acusa "Entrada Sem OS", solicitando correção.

## 6. Lógica de Navegação e Autenticação
O `src/hooks/useAuth.ts` se conecta via Sessão local com o Supabase. Rotas protegidas exigem que um token JWT exista. Telas como `/login` ficam fora da árvore de AppShell.

## Próximos Passos (Histórico para próxima AI)
A partir daqui o sistema está 100% funcional focado no "Fechamento Diário Inteligente". O usuário não definiu qual é o próximo passo exato após o Caixa Físico, mas a base do código está pronta para receber gráficos de DRE, Metas de Franquias, ou Integrações API direto com adquirentes de cartão para bater conciliação nível HARD (O.S. vs Banco).
