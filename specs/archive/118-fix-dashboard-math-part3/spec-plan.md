# Plano de Implementação: Correções Matemáticas do Dashboard (Fluxo de Caixa, Saldos e Juros)

- [x] [BACKEND] Criar migration \20260807000008_math_accuracy_fixes.sql\.
  - [x] Redefinir \get_dashboard_metrics(p_date)\ para alterar o cálculo de \_fluxo_cx\.
    - Ao invés de \_date_anterior := p_date - interval '1 day'\, recuperar o último snapshot em \dashboard_daily_logs\ onde \date < p_date\ via \ORDER BY date DESC LIMIT 1\.
  - [x] Redefinir o cálculo de \_saldo_total\ na RPC.
    - Alterar o \FROM stores\ para \FROM (SELECT DISTINCT store_id FROM reconciliations) s\ (usando um CTE ou LATERAL JOIN) para abranger \store_id IS NULL\ (Saldos Globais OFX) consolidando os saldos da tabela de reconciliations independentemente da loja.
  - [x] Ampliar o filtro de despesas (\_contas_pagas\).
    - Remover a restrição de \source = 'ofx'\ e incluir transações manuais com \	ype = 'out'\.
- [x] [FRONTEND] Editar \src/lib/parsers/redeParser.ts\.
  - [x] Adicionar lógica para procurar um índice de coluna que contenha a palavra 'taxa', 'tarifa' ou 'juros' (\	axIdx\).
  - [x] Se o \	axIdx\ for encontrado e possuir valor numérico válido, usar este valor como a \interest\ nativa, ignorando a subtração bruta-líquida.
- [x] [FRONTEND] Editar \CentralImportWizard.tsx\ e \useTransactions.ts\.
  - [x] Corrigir o bug onde \storeBankBalances\ ignora saldos de contas OFX globais (\store_id === 'GLOBAL'\ ou nulo). Mapear \GLOBAL\ para \'global_account'\ temporariamente ou permitir chaves \
ull\ no dicionário antes do envio ao backend.
- [ ] Executar o processo de aplicação no banco de dados e registrar a memória modular.
