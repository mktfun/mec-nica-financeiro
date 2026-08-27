# POSIÇÃO DO ENGINEER — ROUND 1 (ENGINEER)
Confiança: 0.92
1. Quick wins: destravar AppShell de max-w-[1200px] para max-w-[1600px] 2xl:max-w-[1800px] w-full px-6; sanear variantes inexistentes em Button.tsx e Badge.tsx.
2. Alerta crítico contra DataTable monolítico universal: tabelas financeiras têm regras heterogêneas (inputs inline, modais acoplados, invalidações React Query). Criar primitivas compositivas (<TableContainer>, <TableHeader sticky>, <TableRow>, <TableCell fontMono align='right' tabularNums>) para padronizar visual sem engessar a lógica.
3. Alerta contra Framer Motion em componentes atômicos: Button.tsx e Card.tsx com spring em dezenas de linhas de tabela derrubam render time de 120ms para <20ms com CSS puro.
4. Plano em 4 fases cirúrgicas: Fundação & Layout Core -> Componentes Atômicos -> Primitivos de Dados -> Migração tela a tela com zero downtime e zero regressão.