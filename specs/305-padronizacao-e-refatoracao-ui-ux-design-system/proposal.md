# Proposal: Padronização e Refatoração de UI/UX (305)

## Problema
A interface atual apresenta fragmentação de componentes, desalinhamento com o Dark Mode sólido (Zinc-950), layout travado em 1200px no AppShell e ausência de tipografia tabular contábil consistente.

## Solução Proposta (Veredito do Conselho [GO])
1. Desbloqueio ergonômico do AppShell via PageContainer (max-w 1600px/1800px).
2. Primitivas compositivas de tabela (TableContainer, TableHeader, TableRow, TableCell) sem monólitos.
3. Semáforo semântico estrito e AmountCell/CurrencyDisplay com tabular-nums font-mono.
4. Strangler pattern em 5 fases com re-exports proxy.
