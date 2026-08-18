# Proposal: Whisper Dots + Audit Trail (Detecção Discreta de Divergências na Conciliação) - Spec 232

## Objetivo
Adicionar detecção e exibição discreta e elegante de divergências e anomalias na tela de conciliação diária (`ResumoDiaPanel.tsx`), sem poluição visual, elementos piscantes ou neons chamativos.

## Solução Combinada (Ideias 1 e 2):
1. **Ideia 1 - Whisper Dots:** Micro-indicadores (4px) suaves e estáticos ao lado do rótulo de cada um dos 5 pilares (`Saldo Banco Itaú`, `Dinheiro MP`, `A Receber`, `Na Loja OS`, `Contas`).
   - Cinza/Oculto: Consistente.
   - Âmbar sutil: Inconsistência leve com tooltip nativo descritivo ao passar o mouse.
   - Rosa suave: Inconsistência relevante com tooltip nativo descritivo.
2. **Ideia 2 - Audit Trail (Barra de Observações Expandível):** Barra minimalista e colapsável abaixo da "Consolidação do Dia" que lista objetivamente as causas raízes detectadas (ex: OSs do pátio pendentes de importação, vendas em cartão não compensadas no extrato do dia, PIX não vinculado).
