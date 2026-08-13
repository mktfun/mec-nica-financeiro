# Design: Auditoria de Virada de Mês e OSs Órfãs (178)

## Arquitetura Técnica
A mudança ocorre principalmente no frontend (`src/components/importacoes/AuditoriaPassivoWizard.tsx`) com suporte do backend para atualizar `patio_os`.

1. **Nova Lógica de Busca (Fetch):**
   O `AuditoriaPassivoWizard` não fará mais apenas um `select` na `estoque_os_pendente`. Ele fará duas consultas (em paralelo):
   - `SELECT * FROM estoque_os_pendente WHERE status = 'PENDENTE'`
   - `SELECT * FROM patio_os WHERE status IN ('em_aberto', 'pago_parcial')`

2. **Lógica de Cross-Reference (Bate-pronto):**
   O wizard receberá via prop a lista `cloudOsData` (as OSs do Excel atual).
   - Ele criará um mapa (Set) com todos os números de OS presentes no `cloudOsData`.
   - As OSs devedoras do banco de dados (passo 1) que **estiverem** no `cloudOsData` serão ignoradas na tela manual, pois serão atualizadas automaticamente na inserção final da importação.
   - As OSs devedoras que **NÃO estiverem** no `cloudOsData` formarão a lista final de "Órfãs" para a auditoria manual.

3. **Novo Design de Interface (Inputs Manuais):**
   Em vez de 3 botões simples (Pendente, Paga, Cancelada), cada linha de OS terá um formulário expansível (ou inputs em linha) permitindo:
   - Alterar Status (Dropdown: Aberta, Finalizada)
   - Valor Total (Read-only, para referência)
   - Valor Pago (Input numérico) -> O Valor a Dever será calculado automaticamente `Total - Pago`.
   - Data da Baixa (Se o status mudar para Finalizada).

4. **Persistência Dinâmica:**
   No momento de Salvar (`handleConfirm`), o wizard separará as atualizações:
   - OSs vindas de `estoque_os_pendente` farão UPDATE na tabela `estoque_os_pendente`.
   - OSs vindas de `patio_os` farão UPDATE na tabela `patio_os` (atualizando `paid_value`, `remaining_value`, `status`, etc).

## Cenários de Verificação
- **Virada de Mês:** Uma OS de Agosto, com dívida de R$ 500, não vem no Excel de Setembro. O Wizard DEVE exibi-la. O usuário insere "Pago: R$ 500". A OS é encerrada.
- **Continuidade do Mês:** Uma OS do dia 2 de Setembro vem no Excel do dia 5 de Setembro. O Wizard NÃO deve exibi-la na tela de auditoria, pois ela veio no arquivo atual.
