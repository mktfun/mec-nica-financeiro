# Spec 027: Correção de Histórico de Importações e Auto-Mapeamento

## Requisitos
1. **Auto-Mapeamento de Lojas:** O Importador de Despesas deve tentar mapear automaticamente os nomes das lojas vindos da planilha com as lojas cadastradas no banco de dados (ignorando maiúsculas/minúsculas).
2. **Correção do Histórico:** A tela de Importações não está listando as importações previamente realizadas. Isso ocorre devido a falhas silenciosas de inserção na tabela `import_logs` (como violações de constraint no upsert ou políticas de RLS). O histórico deve voltar a funcionar.
3. **Reconstrução Retroativa:** Como as importações antigas falharam em gravar no `import_logs`, devemos criar um mecanismo (ou script) para reconstruir esses logs com base nos registros que efetivamente entraram na tabela `transactions`.

## BDD Scenarios

### Cenário: Mapeamento automático de loja no Upload
- **Given (Dado):** O usuário possui uma loja cadastrada chamada "Mecânica Alfa".
- **When (Quando):** O usuário faz upload de uma planilha onde a coluna "Emp" está preenchida com "MECÂNICA ALFA".
- **Then (Então):** O sistema deve mapear automaticamente essa linha para a "Mecânica Alfa" e o usuário não deve precisar selecionar a loja manualmente no Passo 2 do Wizard.

### Cenário: Visualização do histórico de importações
- **Given (Dado):** O usuário realizou importações de OS e Despesas no passado.
- **When (Quando):** O usuário acessa a rota `/importacoes`.
- **Then (Então):** O sistema deve listar todos os lotes importados retroativamente, agrupados por Loja e Data.
