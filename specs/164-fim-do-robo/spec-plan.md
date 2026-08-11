# Spec Plan: O Fim do Robô e Conciliação Híbrida (164)

## Tasks

- [x] [BACKEND] Criar migration `.sql` para a tabela `estoque_os_pendente` com RLS policies de select/insert/update.
- [x] [BACKEND] Executar migration no Supabase local/cloud via SQL puro na interface web ou migração manual (evitando bugs do CLI).
- [x] [FRONTEND] Criar `src/lib/parsers/marcoZeroParser.ts` (lê ABA SALDO: Dinheiro MP, A Receber, Negativo, Caixa; lê ABA OS: filtra OS sem pagamentos e monta array).
- [x] [FRONTEND] Criar UI `MarcoZeroWizard.tsx` com Dropzone e tabela de preview.
- [x] [FRONTEND] Criar rotina de POST/UPSERT no Supabase para injetar o Marco Zero (`estoque_os_pendente` e `reconciliations` via update do prev balance).
- [x] [FRONTEND] Atualizar `src/components/importacoes/CentralImportWizard.tsx`:
  - [x] Remover invocação do `AgentRunnerModal` e Edge Functions do scraper.
  - [x] Incluir suporte para upload do Excel bruto do Oficina Inteligente do mês.
  - [x] Adaptar parsing para cruzar os cartões do Excel OI contra o Excel Rede.
  - [x] Criar "Passo 3.5: Match Manual de Exceções": UI de 2 colunas para arrastar/clicar (OFX Órfãos <-> Estoque OS Pendente da Loja).
  - [x] Gravar a baixa das OSs do Passivo e salvar o Caixa do Dia simultaneamente.
- [x] [FRONTEND] Refatorar `ResumoDiaPanel.tsx` e `useConciliacao.ts` para basear o indicador "Na Loja" pela soma de `estoque_os_pendente` + `Excel OI_mes_atual_aberto`, removendo qualquer referência antiga ao bot `patio_os`.
- [x] [TEST] Verificar cenário Marco Zero com a planilha legada fornecida.
- [x] [TEST] Verificar cenário de Wizard Diário importando OFX, Rede e OI Excel e dando baixa numa OS passiva.
