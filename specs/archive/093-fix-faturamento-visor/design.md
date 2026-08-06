# Design: Faturamento Visor & Matemática de Realidade (093-fix-faturamento-visor)

## Arquitetura Técnica
1. **Hook `useModulo1StoresData`**: Já processa e expõe `cartao_entrou`, `pix_os_expected` (a expectativa do Pátio) e `pix_os` (o valor do PIX que tem um irmão gêmeo no OFX importado).
2. **Rota `conciliacao.index.tsx`**: Puxa esses dados e monta a "Balança de Verificação".
   - `maquininha = storeMod1.cartao_entrou`
   - `pixOs = storeMod1.pix_os_expected`
   - `faturamento = storeMod1.cartao_entrou + storeMod1.pix_os`
   - `diferenca = (maquininha + pixOs) - faturamento`
3. **Componente `ResumoDiaPanel.tsx`**: Receberá o label do "Faturamento Acumulado Anterior" no bloco de "Faturamento Líquido".

## Interfaces TypeScript
Nenhuma mudança de interface. Reaproveitamento de `GlobalConciliacaoInput`.

## Componentes / Hooks / Funções
- `src/routes/conciliacao.index.tsx`:
  - Correção na linha de declaração da constante `faturamento` dentro do loop das lojas.
- `src/components/conciliacao/ResumoDiaPanel.tsx`:
  - Inserção de uma div para abrigar o `faturamento_anterior` lido de `previousSnapshot`.

## Fluxo de UI
1. O usuário importa OS (Pátio), Maquininha (Rede) e OFX.
2. Na tabela de "Fechamento por Loja", o Faturamento deixa de exibir 0. Ele exibe instantaneamente a soma do Arquivo da Rede (que ele acabou de importar) + Os PIX que o sistema encontrou no OFX.
3. Se a loja processou R$ 4k na maquininha, Faturamento será R$ 4k (mínimo). Se havia um PIX de 5k e ele caiu no extrato, Faturamento sobe para R$ 9k. A diferença fica R$ 0.
4. No card verde "Consolidação do Dia", embaixo do "Faturamento Líquido", aparecerá um pequeno texto: `Ant: R$ 10.239,00`.

## Infra / Deploy
Deploy Padrão (Sem exigência de novas vars ou rotas backend).

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Loja com 4000 de maquininha, 0 de PIX e 4000 no extrato OFX D+1.
  - Expectativa: Maquininha=4000, Faturamento=4000, Diferença=0.
- **Cenário 2:** Loja com 500 de PIX esperado (OS). Entrou 500 no OFX.
  - Expectativa: Faturamento sobe +500. Diferença=0.
- **Cenário 3:** Reimportação do dia.
  - Expectativa: O "Faturamento Anterior" no ResumoDiaPanel deve permanecer idêntico ao fechamento do dia anterior (herdado do `reconciliations` em D-1).
