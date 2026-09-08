# 🧠 Regras de Inferência e Validação de Cenários (SDD)

Este catálogo estabelece as regras de bom senso e expectativa lógica que o agente DEVE incorporar ao gerar os **Cenários de Verificação (SCAN → INFER → VERIFY → FIX)** no `design.md` e validar no `sdd-apply`. 

Erradica falhas onde o código compila, mas o comportamento é bizarro.

---

## 1. Padrões de Inferência de Navegação

### Texto de Botão / Link → Comportamento Esperado

| Padrão de Texto | Comportamento Esperado | Confiabilidade |
|---|---|---|
| `Editar`, `Modificar`, `edit`, `update` | Abre modal ou tela de edição do item específico | **ALTA** |
| `Detalhes`, `Ver`, `Visualizar`, `view` | Abre tela ou gaveta de detalhes do item | **ALTA** |
| `Excluir`, `Deletar`, `Remover`, `delete` | Abre Dialog de confirmação antes de disparar deleção | **ALTA** |
| `Voltar`, `Lista`, `back`, `list` | Retorna para a listagem pai | **ALTA** |
| `Criar`, `Novo`, `Adicionar`, `new`, `create` | Abre formulário ou modal de criação | **ALTA** |
| `Salvar`, `Confirmar`, `save`, `submit` | Persiste dados e exibe feedback de sucesso (toast) | **ALTA** |
| `Cancelar`, `Fechar`, `cancel`, `close` | Descarta alterações e retorna ao estado anterior | **ALTA** |
| `Buscar`, `Pesquisar`, `search` | Filtra e exibe os resultados correspondentes | **ALTA** |
| `Baixar`, `Exportar`, `download`, `export` | Dispara download do arquivo gerado | **MÉDIA** |
| `Configurações`, `Ajustes`, `settings` | Navega para a tela de configurações | **MÉDIA** |
| `Sair`, `Logout`, `sign out` | Invalida sessão e redireciona para `/login` | **ALTA** |

### Clique em Linhas / Cards

| Contexto | Comportamento Esperado | Confiabilidade |
|---|---|---|
| Clique na linha da tabela | Abre a visualização detalhada do registro | **ALTA** |
| Clique em card de métrica/item | Navega para a visão detalhada ou filtro aplicado | **ALTA** |
| Clique em Tab / Aba | Alterna o conteúdo da aba sem recarregar a página | **ALTA** |
| Clique em Accordion | Alterna entre expandido e colapsado | **ALTA** |

---

## 2. Padrões de Inferência de Estado (CRUD)

| Operação | Estado Esperado no Frontend | Método de Verificação |
|---|---|---|
| **Create com Sucesso** | O novo item aparece na listagem imediatamente | Revalidação de cache ou UI otimista |
| **Read** | Exibe os dados correspondentes ao ID solicitado | Comparação entre payload retornado e campos na tela |
| **Update com Sucesso** | O detalhe e a tabela refletem os novos valores salvos | Revalidação de cache e toast de sucesso |
| **Delete com Sucesso** | O item desaparece da tabela imediatamente | Remoção visual e exclusão persistida |

### Interações de Formulário
- **Submissão com campos obrigatórios vazios:** Deve exibir mensagem de validação no campo (proibido crash ou ignorar).
- **Email inválido ou senha fraca:** Deve exibir feedback visual de erro no input (`border-rose-500`).
- **Submissão bem-sucedida:** Feedback de toast de sucesso (Sonner) + redirecionamento ou limpeza do form.

---

## 3. Padrões de Acessibilidade & UX (Obrigatórios)

| Situação / Estado | UI Esperada | Comportamento Inaceitável (Bug Lógico) |
|---|---|---|
| **Lista com 0 registros** | Componente de `Empty State` com ilustração, mensagem explicativa e botão de ação | Tela em branco ou tabela vazia sem aviso |
| **Requisição em andamento** | Indicador de `Skeleton` ou Spinner de loading | Tela congelada sem nenhum feedback visual |
| **Erro na API / Backend** | Banner ou Toast com mensagem clara e botão "Tentar Novamente" | Nenhuma reação ou tela preta/branca |
| **Acesso Não Autorizado** | Tela ou aviso de 403 / Redirecionamento amigável | Erro não tratado no console ou layout quebrado |
| **Texto muito longo** | Truncamento com `truncate` / tooltip ou quebra de linha | Vazamento de layout horizontal ou overflow quebrado |

---

## 4. Padrões de Inferência de API & Server Actions

| Método / Rota | Resposta Esperada | Tratamento no Frontend |
|---|---|---|
| `GET /itens` | Array de itens | Se vazio -> renderizar EmptyState |
| `GET /itens/:id` | Objeto individual (200) ou 404 amigável | Se 404 -> Not Found amigável |
| `POST /itens` | Retorno do item criado + Status 201 | Toast de sucesso + atualização da UI |
| `PUT /itens/:id` | Retorno do item atualizado + Status 200 | Atualização imediata do registro |
| `DELETE /itens/:id`| Status 204 ou 200 | Remoção imediata da listagem |
| `Auth Login` | Token/Sessão válida | Redirecionamento para `/dashboard` |
| `Auth Logout` | Sessão destruída | Redirecionamento para `/login` |
