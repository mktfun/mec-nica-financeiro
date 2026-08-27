# Proposal: Equalização Canônica dos Saldos das 10 Filiais e Fechamento Diário (298)

## Problema
1. **Divergência entre Saldos de Filiais no Sistema vs Planilha Oficial (`CONCILIAÇÃO 2608.xlsx`):**
   - Na planilha do usuário, o saldo de cada filial representa a consolidação patrimonial líquida:
     $$\text{Saldo Consolidado da Filial} = \text{Saldo Bancário OFX} + \text{Cartões A Compensar } D_0 + \text{Dinheiro em Cofre}$$
   - No sistema, a fórmula anterior duplicava deduções ou misturava entradas de $D_{-1}$ com vendas de $D_0$.
2. **Double-Dipping no Saldo Negativo (Descoberto Itaú de -R$ 15.943,52):**
   - As contas de Planalto (-R$ 3.845,74) e Santo André (-R$ 12.097,78) somam **-R$ 15.943,52** de cheque especial.
   - Como o somatório em $\mathbb{R}$ dos 10 bancos já absorve os valores negativos, subtrair `saldo_negativo_itau` uma segunda vez no cálculo do Caixa Atual gerava um rombo artificial de R$ 15.943,52.
3. **Visibilidade de Cofre Físico (R$ 350,00 em Santo André):**
   - O dinheiro em cofre físico da loja (OS 2398) deve ser evidenciado com clareza na decomposição da filial.

## Solução Proposta (Consenso do Conselho Deliberativo)
1. **Cálculo Canônico de Saldo por Filial (Backend):**
   $$\mathbf{Saldo\ Consolidado}_i = \mathbf{Saldo\ OFX}_i + \mathbf{Cartões\ A\ Compensar}_i + \mathbf{Dinheiro\ no\ Cofre}_i$$
   - Planalto: **-R$ 3.845,74** (Exibido em vermelho como Conta em Descoberto)
   - Piraporinha: **R$ 3.952,72** (OFX 3.552,78 + Maq 399,94)
   - Mauá: **R$ 4.455,20** (OFX 4.455,20)
   - Kennedy: **R$ 3.227,04** (OFX 612,42 + Maq 2.614,62)
   - Rudge Ramos: **R$ 2.664,32** (OFX 2.664,32)
   - Santo André: **-R$ 11.747,78** (OFX -12.311,55 + Maq 213,77 + Cofre 350,00)
   - Rei do Módulo: **R$ 14.646,00** (OFX 14.033,84 + Maq 612,16)
   - Jorge Beretta: **R$ 27.001,87** (OFX 25.663,26 + Maq 1.338,61)
   - Dom Pedro I: **R$ 4.718,80** (OFX -1.165,43 + Maq 5.884,23)
   - Jabaquara: **R$ 5.372,43** (OFX -242,73 + Maq A Compensar 5.615,16)
2. **Caixa Atual Perfeito (R$ 151.642,60):**
   - $\text{Pilar 1 (Bancos + Lojas)} = 50.444,86 + 350,00 = \mathbf{R\$\ 50.794,86}$ (ou Ativos Brutos 66.738,38 - Negativo 15.943,52)
   - $\text{Pilar 2 (Dinheiro MP)} = \mathbf{R\$\ 15.323,00}$
   - $\text{Pilar 3 (A Receber)} = \mathbf{R\$\ 8.349,67}$
   - $\text{Pilar 4 (Na Loja OS / Pátio)} = \mathbf{R\$\ 77.525,07}$
   - **$\text{Caixa Atual} = 50.794,86 + 15.323,00 + 8.349,67 + 77.525,07 = \mathbf{R\$\ 151.642,60}$** (Igual ao Excel!)
3. **Zero-Logic UI:** O frontend consome `store.saldo_banco` diretamente da RPC, exibindo badges de cheque especial e decomposição limpa.

## Contratos de Dados & Backend
- **RPC:** `get_daily_reconciliation_summary`.
- **Frontend:** `src/hooks/useBackendConciliacao.ts`, `src/routes/conciliacao.index.tsx`, `src/routes/conciliacao.$lojaId.tsx`.

## Risco Principal
- **Risco:** Recomputação acidental de dias passados fechados.
- **Mitigação:** Trava estrita de imutabilidade na RPC (`IF v_snapshot.is_closed = true`).
