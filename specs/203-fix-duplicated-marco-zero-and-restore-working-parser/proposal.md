# Proposta de Especificação Técnica: Restauração Fiel dos Componentes Originais e Eliminação de Duplicações (Spec 203)

## Diagnóstico e Comparativo (Antes vs. Agora)

### O que existia antes (Código Original Testado e Funcional):
1. **`CentralImportWizard.tsx`**: Componente completo e rico de importação diária com todas as funcionalidades operacionais:
   - Preview e cards de resumo por filial e globais (OSs, Maquininha Rede Líquida, Extrato OFX Entradas/Saídas).
   - Tabela de ajuste manual direto de **OSs Pendentes Ausentes no Relatório Atual (Órfãs)** com inputs livres de Total, Pago e Status.
   - Detecção automática de matches e painel de execução com **Progresso dos Agentes (`AgentStageItem`)**, logs de depuração colapsáveis e barra de progresso.
   - Suporte a múltiplos arquivos simultâneos (OFX, Excel Pátio, Rede, PDF).
2. **`MarcoZeroWizard.tsx`**: Componente dedicado e isolado para carga inicial de Marco Zero:
   - Extração estruturada dos 15 campos globais da planilha de conciliação legada.
   - Auto-mapeamento de filiais e contagem de OSs pendentes por loja.
   - Execução atômica da RPC `process_marco_zero_import` com resumo pós-execução e download de logs.
3. **`marcoZeroParser.ts`**: Parser de linha a linha com varredura resiliente de rótulos globais e extração de OSs por aba/loja.

### O que quebrou nas refatorações recentes:
1. **Reescrita desnecessária do zero:** Foi criado um componente `DailyImportView.tsx` paralelo que omitiu stages, auto-load e detalhes de execução.
2. **Duplicação de UI de Marco Zero:** Foi colocado um alternador de modo de Marco Zero dentro da tela diária ao mesmo tempo em que a rota `/importacoes` já tinha uma aba separada para o `MarcoZeroWizard.tsx`.
3. **Perda de integrações de integridade:** Algumas constraints de banco (como `ofx_transactions_type_check` e persistência de matches de lojas no Supabase) precisavam apenas ser conectadas ao `CentralImportWizard.tsx` original.

---

## Solução Técnica (Sem Reinventar a Roda)

1. **Restaurar e Conectar o `CentralImportWizard.tsx` Original como View da Aba 1:**
   - Usar a implementação original do `CentralImportWizard.tsx` na aba **Fechamento Diário** da rota `/importacoes`.
   - Incorporar diretamente nele as correções de integridade já validadas:
     - Normalização estrita de `type: 'in' | 'out'` e `amount: Math.abs(...)` para respeitar a constraint `ofx_transactions_type_check`.
     - Injeção obrigatória de `target_date: targetDate` e `import_batch_id` no insert de transações.
     - Persistência dos matches de arquivos com lojas no Supabase (`useStoreFileMappings`).
   - Adicionar o bloco colapsável do **Inspetor JSON de Conciliação** diretamente no passo de confirmação para transparência total do payload.

2. **Manter o `MarcoZeroWizard.tsx` Isolado e Fiel na Aba 2:**
   - A aba 2 da rota `/importacoes` (`Carga de Marco Zero`) renderiza estritamente o `MarcoZeroWizard.tsx`.
   - Zero código de Marco Zero duplicado dentro do fluxo diário.
   - Blindagem do `marcoZeroParser.ts` utilizando `arrayBuffer()` do `xlsx` e logs detalhados no console (`console.log('[MarcoZeroParser]...', data)`).

3. **Exclusão de Componentes Redundantes:**
   - Remover arquivos intermediários (`DailyImportView.tsx`) e apontar a rota `/importacoes` diretamente para `CentralImportWizard` (Aba 1) e `MarcoZeroWizard` (Aba 2).

---

## Plano de Arquivos:
- [MODIFY] `src/lib/parsers/marcoZeroParser.ts` (Garantir arrayBuffer e logs no console)
- [MODIFY] `src/components/importacoes/CentralImportWizard.tsx` (Integrar useStoreFileMappings, normalização in/out, target_date e JSON inspector)
- [MODIFY] `src/routes/importacoes.tsx` (Aba 1 = CentralImportWizard; Aba 2 = MarcoZeroWizard; Aba 3 = Histórico)
- [DELETE] `src/components/importacoes/DailyImportView.tsx` (Eliminar componente redundante)

---

## Critérios de Validação:
- [x] Aba 1 executa o fluxo completo do fechamento diário com previews, stages, ajuste de OSs órfãs e gravação atômica.
- [x] Aba 2 executa a importação de Marco Zero com todos os 15 campos globais preenchidos e RPC `process_marco_zero_import` gravando no Supabase.
- [x] `npm run build` 100% verde sem erros de TypeScript.
