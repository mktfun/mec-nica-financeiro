# POSIÇÃO DO ENGINEER — ROUND 2 (ENGINEER)
Confiança: 0.96 (Aprovado com refinamentos técnicos)
1. Strangler Pattern via Re-exports: Proxies/barrel em caminhos legados (ex: src/components/dashboard/KpiCard.tsx) exportando de finance/ com @deprecated para evitar quebras em 17+ arquivos.
2. Normalização segura de props: KpiCard aceita title e label (const displayLabel = label ?? title ?? '').
3. Semáforo semântico estrito: Verde exclusivo para diff === 0 / conciliado; Vermelho para divergência/descoberto; Âmbar para pendente; Azul/Brand para identificadores.
4. Isolamento estrito de modais: manter lógica de dados/hooks React Query intocada; atalhos de teclado via hook desacoplado.
5. Cronograma em 5 etapas: Layout/Viewport (0.5d) -> Primitivas Atômicas & Tokens (1.0d) -> Primitivas de Tabela & Finance (1.0d) -> Migração tela a tela (1.5d) -> Validação tsc/bundle (0.5d).