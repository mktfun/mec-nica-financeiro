# Spec Plan: Redesign Revolut Fintech UX do Extrato Bancário da Filial (387)

## Tasks

- [x] [FRONTEND/KPIS] Refatorar os Hero Cards de KPIs em `StoreExtratoBancarioView.tsx` para o layout Revolut 4x1 com tipografia nobre e superfícies polidas
- [x] [FRONTEND/ACCORDION] Implementar agrupamento por dia com estado de colapso/expansão (`collapsedDays`) e animação suave
- [x] [FRONTEND/ACCORDION] Adicionar controles rápidos de `[Expandir Todos]` e `[Recolher Todos]` no topo do extrato
- [x] [FRONTEND/ROW] Fundir as colunas redundantes em um bloco único de transação estilo Revolut (Avatar Squircle + Título Limpo + Metadados + Pill Badge)
- [x] [TEST] Verificar no navegador (localhost:8080) o comportamento do accordion e a eliminação da duplicidade textual
- [x] [BUILD] Executar `npm run build` garantindo 0 erros de compilação TypeScript
