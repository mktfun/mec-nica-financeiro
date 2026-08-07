# Spec Plan: 113-remove-phantom-column (113)

## Tasks

- [x] [BACKEND] Criar a migration `20260807000005_remove_phantom_pix_column.sql` redefinindo `calculate_daily_conciliation` sem `parsed_pix_transfer`.
- [x] [BACKEND] Aplicar a migration diretamente usando Node `pg` (script de bypass).
- [x] [TEST] Verificar ausência de erros no console da aplicação web ao atualizar a tela.
