# Proposal: Refatoração da View de Importações (Excel/Extrato) - 153

## Problema
A atual implementação "Raio-X de Lotes" (`ImportSourceBadges.tsx`) com 3 badges espalhados (Pátio OS, Maquininha, Banco OFX) na tela interna da Loja não está funcional, é confusa e o layout das tabelas não provê uma leitura confiável (parece "lixo" segundo o usuário). O cliente exige uma visualização limpa, centralizada e formatada estritamente como um extrato bancário ("igual excel") para auditar os arquivos originais importados.

## Solução Proposta
1. **Remoção Absoluta:** Deletar `ImportSourceBadges.tsx`, `RawOsTable.tsx`, `RawOfxTable.tsx`, `RawRedeTable.tsx` e suas injeções em `conciliacao.$lojaId.tsx`.
2. **Nova UI Unificada:** Criar um único badge/botão compacto chamado "📊 Extratos Originais" no cabeçalho da loja (`conciliacao.$lojaId.tsx`).
3. **Modal "Excel-like":** Ao clicar no badge, abre-se um Modal fullscreen ou largo contendo 3 abas limpas: `[ Banco OFX ]  [ Maquininha ]  [ Pátio OS ]`.
4. **Data-Grid Strict:** O design dessas abas seguirá estritamente a "Skill Frontend-Design-3" (tabelas condensadas, tipo Excel, zebradas, com fontes tabulares, bordas explícitas, valores monetários alinhados à direita com cor verde/vermelha para in/out). Sem arredondamentos visuais ou firulas. O OFX será a cópia fiel do extrato.

## Contratos de Dados
Nenhuma tabela nova no Supabase. Utilizaremos as RPCs ou tabelas brutas existentes que já alimentavam as queries antigas, apenas mudando drasticamente o consumo visual.
- `useRawOfx`: Puxa da tabela `ofx_transactions`
- `useRawRede`: Puxa da tabela `pos_transactions`
- `useRawOs`: Puxa da tabela `os_transactions`

## API / Interface
- Novo componente: `src/components/conciliacao/ExtratosImportacaoModal.tsx`
- Rota modificada: `src/routes/conciliacao.$lojaId.tsx` (remoção de código legado, adição do trigger do novo Modal).

## Features Existentes Impactadas
- O componente `ImportSourceBadges.tsx` e todos os `Raw*Table.tsx` serão apagados do código-fonte.
- A rota interna da loja ficará mais limpa.

## Risco Principal
- **Probabilidade:** Baixa
- **Impacto:** Parcialmente Reversível
- **Mitigação:** As queries customizadas de "raw data" (`useRawOfx`, etc) podem retornar colunas não mapeadas que ficariam feias na tabela Excel. Para mitigar, construiremos as colunas da tabela manualmente, ignorando JSON cru, mapeando explicitamente: Data, Descrição (Memo), ID (Fitid/NSU) e Valor Monetário, forçando consistência visual "Excel".
