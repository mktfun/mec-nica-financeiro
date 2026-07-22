# Antigravity Long-Term Memory (ClawHub Edition)

## Preferências de Arquitetura
- Frontend: React (Vite) + Tailwind CSS + shadcn/ui.
- Gerenciamento de Estado: Zustand.
- Backend/DB: Supabase (com RLS policies).
- Deploy/DNS: Cloudflare (quando aplicável).
- Integração Supabase self-hosted em VPS (quando aplicável).

## Erros Passados e Lições Aprendidas
- **Duplicação de transações da Rede:** Inserções da planilha da Rede sem um UUID único ou FitID geravam transações duplicadas no painel. Solucionado criando uma chave única (`storeName_grossAmount_netAmount_method_date`) no parser/wizard de modo GLOBAL à importação em lote (e não isolado por arquivo).
- **Match de OS com Pagamento Parcial:** Se uma OS no arquivo `.xls` possuir `Forma(s) de Pagamento` múltiplas (ex: Crédito: 260; PIX: 500), a comparação direta de `grossAmount` vs `paid_value` da OS falha. A solução é fazer parse via Regex (`/:\s*([\d.]+)/g`) direto no texto da `payment_method` para liberar o match fracionado. E ao achar a OS, NÃO removê-la do mapa, para permitir que outros pagamentos fracionados da mesma a encontrem.
- **Conciliação Maquininha vs OS:** A lógica de interface sempre deve ter a transação bruta da Maquininha como coluna base (âncora) e buscar a OS que justifica a entrada, e não o inverso.
- **Exclusão de Lotes de Importação (RPC):** Ao deletar registros de Supabase através de RPC (ex: `delete_import_batch`), certifique-se de configurar a procedure como `SECURITY DEFINER` caso hajam políticas de RLS e dependências complexas (ex: Foreign Keys). Em processamentos de datas originadas do Javascript/Typescript, use conversões resilientes (ex: `::TEXT LIKE ANY(SELECT '%' || t || '%' FROM unnest(p_target_dates) t)`) ao invés de casts diretos `::DATE` que falham com strings vazias ou nulas.

## Persona do Usuário
- O usuário utiliza Windows com PowerShell.
- **Tolerância Zero:** Execuções manuais ou comandos com prompts interativos.
