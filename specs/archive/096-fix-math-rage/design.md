# Design: Alinhamento Bélico de Regras (096)

## Arquitetura Técnica

### 1. Snapshot Automático de OS (`CentralImportWizard.tsx`)
Atualmente, o `na_loja_os` só é salvo no banco de dados (`reconciliations`) quando o usuário clica no botão "Gravar Fechamento Diário" da tela de Conciliação.
Para garantir o snapshot imediato e independente de clique manual:
Após salvar os recebíveis no Wizard (`savePatioOsAndReceivables`), o Wizard irá calcular a dívida em aberto no momento (`total_value - paid_value` das OSs importadas ou ativas) e realizará um `upsert` na tabela `reconciliations` (`na_loja_os`) com o `date` forçado para o `targetDate` do importador.

### 2. Desacoplamento da Maquininha do Faturamento
Em `src/routes/conciliacao.index.tsx`, a fórmula atual:
`const faturamento = maquininha + faturamentoRealOfx;`
Será alterada para extrair exclusivamente as entradas vinculadas do banco:
`const faturamento = storeMod1?.saldo_banco_itau || 0;` (O `saldo_banco_itau` já é o `reduce` de todas as entradas `in` do OFX pertencentes à loja).

### 3. Exclusão da Provisão e Ajuste de Contas a Pagar
- No painel da conciliação (`ResumoDiaPanel.tsx`), a prop `contasAPagarAutomatico` será envolvida em um `Math.abs(totalOfxOut)` para garantir número positivo no pipeline matemático.
- No motor matemático (`modulo1Calculations.ts`), `valor_contas` ignorará completamente o `input.provisao` (`= Juros + Contas_a_pagar`).
