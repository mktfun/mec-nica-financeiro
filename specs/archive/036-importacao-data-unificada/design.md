# Spec 036 - Design

## Interface de Usuário (Frontend)
1. **`src/routes/importacoes.tsx`**
   - Substituir a chamada `setIsImporting('DESPESAS')` por uma navegação com `Link` ou `useNavigate()` para a rota `/importacoes-despesas`.
   - Substituir `setIsImporting('JUROS')` pela navegação para `/importacoes-despesas`.
   - Substituir `setIsImporting('PATIO')` pela navegação para `/importar-os`.
   - Manter o `WizardImportacao` apenas para 'OFX' e 'MAQUININHA'.

2. **Seletor de Competência (Date Picker)**
   - No `WizardImportacao.tsx` (para OFX e Maquininha), adicionar um `<input type="date" />` no Step 3 (Revisão). Ele deverá iniciar preenchido com a data atual (D-0) ou com a data mais recente lida do arquivo (se houver lógica para isso).
   - No `importacoes-despesas.tsx`, adicionar o mesmo input de Data de Competência no Step 3. (Atualmente ele usa `batchCreatedAt` e envia o lote com data estática ou com a data extraída individualmente de cada despesa). Para o histórico (Lote), a "data alvo" do grupo (`target_date`) é crucial e deve ser escolhida pelo usuário.
   - O mesmo em `importar-os.tsx`.

## Banco de Dados
- Nenhuma alteração de schema é necessária. Os payloads existentes de inserção de logs e reconciliações apenas receberão o valor do Date Picker `targetDate` em vez de `new Date()`.
