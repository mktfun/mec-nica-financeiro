# Design: Agent Flow Expandable & Live Preview (161v2)

## Arquitetura Técnica
React State Machine local para governar o "Agent Terminal". O fluxo é contido no componente modal `AgentRunnerModal`.
Utilizaremos `Accordion` ou `Collapsible` customizado para expandir o sub-log ativo.

## Interfaces TypeScript
```typescript
type SubStep = { label: string; status: 'pending' | 'active' | 'done' };
type AgentStage = {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'success' | 'error';
  subSteps: SubStep[];
};
```

## Componentes / Hooks / Funções
1. **`AgentRunnerModal.tsx`**: Modal imersivo contendo:
   - Header com Título e "Pulsing indicator".
   - Formulário inicial (Seletor de Datas, Escopo).
   - Área de Log. O estágio `running` terá a caixa expandida mostrando as \`subSteps\` rolando. O \`done\` colapsa com um "Check" verde.
2. **`AgentStageItem.tsx`**: Sub-componente (Accordion item) que implementa a expansão com framer-motion (`AnimatePresence`).
3. **`CentralImportWizard.tsx`**: Adaptação para passar do `step 1` para o `step 3` após o robô terminar com os dados no state.

## Fluxo de UI
1. Ao invés do botão sincronizar imediato, abre-se o modal.
2. Preenche-se as datas e clica "Iniciar Extração".
3. Renderiza-se:
   - `🔄 Conectando na Oficina Inteligente...` (Aberto)
       - `passo x (feito)`
       - `passo y (carregando...)`
4. Ao concluir, esse fecha, ganha `✅`, e o próximo abre.
5. No final: "Injetado com sucesso". Um grande botão azul "Ir para Preview" aparece.

## Infra / Deploy
Restrito ao Frontend (React/Tailwind).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Executar bot] → [Verificar se Accordions abrem e fecham sozinhos, focando no step ativo].
- Cenário 2: [Conclusão do Bot] → [Ir para Preview] → [Garantir que as tabelas de Preview receberam dados recém raspados do Supabase].
