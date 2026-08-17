# Proposal: Correção de Filtro PIX vs Movimentações Bancárias e Sincronização de Diferenças por Loja (226)

## Diagnóstico Completo da Investigação
Após minuciosa auditoria cruzando o extrato bancário, as ordens de serviço e a planilha manual do operador:

1. **Origem da Diferença Extrapolada nas Lojas:**
   - O dinheiro que entrou no banco no dia 17/08/2026 totalizou **R$ 106.649,73**.
   - Desse total:
     - **R$ 70.820,43** é o faturamento operacional real de vendas e serviços (Maquininhas + PIXs legítimos de OSs) — **batendo 100% com a planilha manual do cliente**.
     - **R$ 28.183,10** são movimentações bancárias não-operacionais:
       - R$ 5.000,00: **APORTE RM** (SISPAG REI DO MODULO)
       - R$ 4.600,00: **APORTE JAB** (SISPAG MP JABAQUARA)
       - R$ 15.721,70: **TRANSFERÊNCIAS DE ÓLEO E ENTRE FILIAIS** (SISPAGs em cadeia entre as contas das lojas)
       - R$ 29,93: **REEMBOLSO CARTÃO RM**
       - R$ 1,39: **RENDIMENTOS DE APLICAÇÃO AUTOMÁTICA**
2. **Causa Raiz do Bug de "5k de Diferença vs 2k de Não Vinculados":**
   - O motor de matching automático anterior tratava qualquer entrada no extrato bancário como se fosse um "PIX de cliente".
   - Por coincidência de valor, o sistema vinculou:
     - O **Aporte RM de R$ 5.000,00** à OS #4399.
     - O **Aporte JAB de R$ 4.600,00** à OS #1830.
     - Os **Rendimentos de R$ 0,11 e R$ 0,01** às OSs #1828 e #4387.
     - As **Transferências de Óleo SISPAG de R$ 1.500,00** à OS #2376.
   - Ao vincular essas transferências a OSs por engano:
     - Elas sumiram da aba de *Entradas Avulsas* (pois a tabela filtrava `matched_os_number is null`).
     - A conta da loja continuou exibindo a Diferença de R$ 5.574,04, mas ao abrir a tela de Não Vinculados, o operador só encontrava R$ 2.000,00 porque os outros R$ 3.500,00 estavam "sequestrados" em OSs erradas!

## Soluções Propostas
1. **Blindagem Estrita do Motor de PIX:**
   - Transações bancárias com termos corporativos/não-clientes (`SISPAG`, `REND PAGO`, `APLIC AUT`, `TRANSF CC`, `APORTE`, `RESGATE`, `APLICACAO`, `TAR BANCARIA`, `BOLETO`) são **proibidas** de serem tratadas como PIX de OS.
   - Elas são direcionadas automaticamente para a aba **"4. Entradas Avulsas / Outras Receitas"** (`ofxSemMatch`).
2. **Limpeza e Desvinculação dos Falsos Matches:**
   - Desvincular todas as transações bancárias de `SISPAG`, `REND PAGO` e `APORTE` de OSs, restaurando-as para a aba de Entradas Avulsas.
3. **Conexão Direta das Justificativas com o Abate de Diferença da Loja:**
   - Ao justificar qualquer uma dessas transações na aba 4 (ex: Aporte de Sócios, Transferência entre Filiais, Rendimento de Aplicação) marcando **"Apenas Conciliar (NÃO Somar no Faturamento)"**:
     - Ela sai das pendências avulsas.
     - Ela abate o saldo da diferença daquela loja específica, zerando os cards de diferença das filiais no painel principal!
