# Proposal: Correção Definitiva do Matcher (OS x Rede x OFX) e Telas Nativas do Wizard (312)

## Problema

Na Spec 311, foram identificados 3 erros críticos que comprometeram o uso:

1. **Navegação Quebrada (Extensão para baixo em vez de tela limpa):**
   - O CentralImportWizard mantinha step === 3 ativo e renderizava o wizard *dentro e abaixo* do preview longo, criando uma tela quilométrica e confusa em vez de avançar de fato para a próxima etapa.
   - O padrão da aplicação e a expectativa do usuário é a transição nativa de etapas (step 1 -> step 2 -> step 3 -> step 4 -> step 5 -> step 6 -> step 7 -> step 8), onde cada tela é exclusiva e limpa.

2. **Falha Crítica no Matcher Automático (Falsos Positivos de Órfãos):**
   - Todas as transações da Rede e vários PIX foram jogados diretamente na Tela A como "sem lançamento na OS" (14 pendências de cara) porque o motor de match automático entre OSs x Cartões Rede x Extrato OFX não foi disparado antes de listar as pendências.
   - Na rotina real, a grande maioria das vendas da Rede e PIX já bate diretamente com as OSs importadas (esults.osFiles) que têm forma de pagamento em cartão/PIX. Apenas as transações que **realmente não possuem nenhuma correspondência** devem ser exibidas para o operador resolver.

3. **Modal de Vínculo de OS Vazio ("Nenhuma OS em aberto nesta filial"):**
   - Ao abrir o modal para vincular a transação à OS, a listagem estava vazia porque o modal consultava apenas patio_os no banco com filtros restritivos, ignorando as OSs que acabaram de ser importadas no lote atual (esults.osFiles) e as OSs ativas reais daquela filial.

## Solução Proposta

### 1. Telas Sequenciais Nativas no CentralImportWizard (step 1 a 8)
Unificar o fluxo em steps inteiros onde cada um é uma tela independente:
- **step 1**: Upload de Arquivos
- **step 2**: Mapeamento de Filiais
- **step 3**: Preview & Conferência (OSs Ausentes do Relatório + Inputs Manuais de Odômetro/Dinheiro MP/A Receber/Contas a Pagar)
- **step 4**: Tela A — Pagamentos sem Lançamento na OS (apenas as sobras reais do auto-match)
- **step 5**: Tela B — Justificativas por Loja (Transferências, Aportes, Tarifas, Estornos)
- **step 6**: Tela C — Conferência de Cofre do Daniel (SIM/NÃO + Baixa)
- **step 7**: Tela D — Auditoria Final dos 5 Pilares + IA Gemini 3.5 Flash Lite + Botão de Gravação
- **step 8**: Tela Final de Sucesso da Importação

### 2. Motor de Auto-Match de Alta Precisão (Memória + Banco)
Implementar uma função de conciliação automática determinística + fuzzy executada na transição do Step 3 para o Step 4:
- **Match Rede x OS:** Cruza transações de cartão com as OSs da mesma loja em esults.osFiles e patio_os que possuem pagamentos em cartão (crédito/débito) por valor exato / delta de recebimento.
- **Match OFX (PIX) x OS:** Cruza entradas PIX do extrato com OSs da mesma loja que possuem recebimento via PIX ou delta de pagamento correspondente.
- **Sobras Legítimas:** Apenas as transações que não derem match em nenhuma OS são levadas para o Step 4.

### 3. Modal de Vínculo com Fonte Dupla de OSs (Lote + Banco)
O modal de busca e vínculo de OSs na Tela A agrega:
- Todas as OSs da filial presentes no lote importado (esults.osFiles) com saldo pendente.
- Todas as OSs ativas da filial no banco de dados (patio_os).
- Busca instantânea por número da OS, cliente, placa e modelo do veículo.

## Contratos de Dados & Interfaces

### Motor de Auto-Match
`	ypescript
interface AutoMatchInput {
  results: CentralImportResults;
  mapping: Record<string, string>;
  targetDate: string;
  dbActiveOs: PatioOsItem[];
}

interface AutoMatchOutput {
  matchedRedeCount: number;
  matchedOfxPixCount: number;
  unmatchedTransactions: UnmatchedPendingTransaction[];
  resolvedMatches: ConciliationMatchRecord[];
}
`

## Features Existentes Impactadas
- CentralImportWizard.tsx: Gerenciamento sequencial limpo dos steps 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8.
- src/components/importacoes/wizard/Step1UnregisteredPayments.tsx: Recepção das pendências pós-auto-match e exibição de OSs do lote + banco no modal.
- src/lib/parsers/centralImportManager.ts / src/lib/llm-matcher.ts: Refinamento do matching determinístico.

## Risco Principal e Mitigação
- **Risco:** Casar erroneamente uma transação de valor comum (ex: R$ 50,00) com uma OS errada de mesmo valor.
- **Mitigação:** Regras estritas de desempate: mesma filial obrigatória, prioridade para OSs com forma de pagamento declarada compatível (Cartão x Cartão, PIX x PIX), e confirmação de cliente/placa quando disponível.
