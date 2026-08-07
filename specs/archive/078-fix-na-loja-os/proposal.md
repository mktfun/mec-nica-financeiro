# Proposal: Correção do Pátio Pendente (Na Loja OS) e Bug de Salvamento (078)

## Problema
O usuário relatou que a coluna "Na Loja OS" (Pátio Pendente) no fechamento por loja ficou completamente zerada após o último update. Existem duas causas raízes independentes para isso:
1. **ReferenceError Crítico no Painel:** O componente `ResumoDiaPanel.tsx` possui um bug na função `handleSave` referenciando uma variável inexistente (`storesMod1` em vez de `storesData`). Isso faz com que a ação de "Gravar Fechamento Diário" falhe silenciosamente (ou lance exceção) e nunca grave o estado do `na_loja_os` na tabela `reconciliations`.
2. **Dependência Cega de `patio_os`:** Quando o dia ainda não foi salvo (ex: hoje), a interface calcula o Pátio Pendente lendo a tabela `patio_os` ao vivo. No entanto, o usuário já nos relatou que a tabela `patio_os` não possui as OSs legadas (ex: Jabaquara tem 13k de pendência física real, mas a tabela só reporta ~1k). Como não há snapshot salvo para hoje, o valor colapsa para o que está na tabela (0 ou muito baixo).

## Solução Proposta
1. **Fix do Erro de Referência:** Atualizar `ResumoDiaPanel.tsx` para usar a prop correta (`storesData`) durante o `upsert` na tabela `reconciliations`.
2. **Lógica de Carry-Over para Pátio Pendente:** O pátio da oficina age como uma conta corrente de devedores. Se o sistema ao vivo (`patio_os`) não tem o histórico (legacy debt), a métrica "Na Loja OS" para o dia atual NUNCA deve ser calculada do zero! A solução será alterar o hook `useModulo1StoresData` para:
   - Se houver snapshot *hoje* (`isHistorical`), usa ele.
   - Se NÃO houver snapshot hoje, ele busca o snapshot **mais recente anterior a hoje** (ex: o snapshot gravado via Bootstrap) e utiliza esse valor de `na_loja_os` como base, até que o usuário grave o fechamento do dia atual.

## Contratos de Dados
- Nenhuma nova tabela.
- `useModulo1StoresData` precisará consultar a última entrada cronológica em `reconciliations` se o dia atual não existir.

## Risco Principal
Ao propagar o snapshot histórico para frente ad-infinitum, o "Na Loja OS" só diminuirá ou aumentará se alguém intervir, ou seja, se os pagamentos não baterem automaticamente no sistema. Como o legado não está no sistema, isso requer input manual para amortização no futuro.
