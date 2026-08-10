# Proposal: Desacoplamento OFX Saídas vs Contas (152)

## Problema
O OFX geralmente é exportado no dia da conciliação (ex: segunda-feira às 09h). A lógica atual varre todas as saídas (`ofx_out`) cujo `target_date` seja hoje, somando transações ocorridas nos dias anteriores do lote mais as ocorridas na manhã do próprio dia de exportação.
Isso resulta em um valor de "Contas a Pagar" inflado e divergente na conciliação, misturando despesas de segunda-feira na conciliação de sexta-feira.

O fluxo desejado é:
1. **Contas**: Retornar para input manual na tela (valor puxado do Oficina Inteligente).
2. **Juros**: Continua automático (via maquininhas).
3. **Tela da Loja**: Saídas OFX aparecem apenas no modo "Raio-X" (transparência/auditoria), sem somar na matemática de fechamento de caixa global.

## Solução Proposta
1. Restaurar o controle numérico interativo de `contas_a_pagar_manual` no componente `ResumoDiaPanel`.
2. Interromper o uso da prop genérica `totalOfxOut` nos totais matemáticos de fluxo de caixa da conciliação. 
3. O `daily_snapshots` passará a salvar o `contas_a_pagar_manual` inserido pelo usuário ao invés do valor espelhado da tabela OFX.
4. Manter o "Raio-X" inalterado, ele exibe `ofx_out_total` corretamente por loja para fins informativos.

## Contratos de Dados
- Tabela `daily_snapshots`: O campo `contas_a_pagar` receberá o valor digitado no frontend, em vez de computado do OFX. (A tabela já tem o campo, nenhuma migração necessária).
- RPC `get_dashboard_metrics` (se usar snapshot) continua lendo os mesmos campos, só mudará o que o frontend grava ali.

## API / Interface
- `ResumoDiaPanel.tsx`: 
  - Adicionar um estado local `manualContas` (iniciado pelo valor do snapshot salvo, ou zero).
  - Um input numérico editável no grid de totais, igual existia para "Dinheiro (MP)" ou "A Receber".
  - O cálculo de fluxo (`inputForCalculation.contas_a_pagar`) utilizará esse state.

## Features Existentes Impactadas
- O componente `ResumoDiaPanel` sofrerá alteração visual (um input a mais).
- A prop `totalOfxOut` deixará de influenciar cálculos financeiros diretos.

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Reversível
- **Mitigação:** Se o input manual não carregar valores salvos passados corretamente no carregamento de dias antigos, pode sugerir erro de matemática histórica. O `useEffect` que hidrata estados (como dinheiro mp) deve ser atualizado para hidratar o valor de "Contas" a partir do `currentSnapshot`.
