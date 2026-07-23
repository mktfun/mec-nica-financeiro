# ⚡ Memória Modular: Supabase & Banco de Dados

## Regras de RLS, RPCs e Consultas
- **Exclusão via RPC (`SECURITY DEFINER`):** Procedures de limpeza (ex: `delete_import_batch`) devem ter `SECURITY DEFINER` para ignorar travas de RLS e foreign keys atreladas.
- **Filtros de Timestamp ISO no PostgREST:** Use `.gte` e `.lte` com ISO format (`${startDate}T00:00:00.000Z` até `${endDate}T23:59:59.999Z`). O operador `.like` em `timestamp with time zone` lança crash no PostgREST.
- **Deduplicação de Inserção:** Ao usar POST REST API do Supabase com tabelas contendo restrições únicas, passe `on_conflict=col1,col2` ou deduplique em memória antes de postar.
