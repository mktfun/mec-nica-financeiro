# Design: Redesign Central Import Wizard (174)

## Arquitetura Técnica
Apenas UI (React) no componente `CentralImportWizard.tsx`.
Estado Local -> React JSX -> Estilização Tailwind.

## Interfaces TypeScript
Já existem (`AgentStage`, `AgentStageItem`, etc). Não há mudanças estruturais de tipos necessárias.

## Componentes / Hooks / Funções
- `src/components/importacoes/CentralImportWizard.tsx`: O layout da etapa 4 será modificado para mapear a variável de state `importStages` renderizando blocos `<AgentStageItem stage={stage} />`, removendo as antigas linhas iterando sobre `importLogs`.
- `AgentStageItem` já foi importado no arquivo na linha 5 (`import { AgentStage, AgentStageItem } from './AgentStageItem';`).
- Serão aplicados retoques no padding, margens, cores (Zinc-950/Zinc-900 para backgrounds, Zinc-800 para bordas).

## Fluxo de UI (se frontend)
1. O usuário solta os arquivos na Dropzone. (Layout da Dropzone mais espaçoso).
2. Ele vai para a tela de mapeamento (ajustando paddings de tabelas/cards).
3. Na Etapa 4 (salvamento), ao invés do "Diário de Operações" de texto plano, aparecerá o `AgentStageItem` de cada step de conciliação (OFX, OS, Rede, Salvar Banco), cujos status já são atualizados pela função `updateStage()`.

## Infra / Deploy
Sem impacto.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- Cenário 1: [Executar Importação] → [Acompanhar Visualmente] → [Ver os cards do AgentStageItem carregando sequencialmente, sem logs textuais vazando na tela].
