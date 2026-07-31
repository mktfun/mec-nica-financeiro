# Design: Reset do Banco e Ajuste na Conciliação (007)

## 1. Arquitetura UI & Integração (Antigravity)
- Em `src/hooks/useAuth.ts`, o bloco principal do `signInWithPassword` receberá um `try/catch`. 
  ```typescript
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  } catch (err: any) {
    setError(err.message || 'Erro ao conectar. Tente novamente.');
  } finally {
    setLoading(false);
  }
  ```

- Em `ImportReportDialog.tsx`, a propriedade `totalDinheiro` será extraída a partir de `payments['Dinheiro'] || 0`. O tipo ou interface `ParsedData` receberá `totalDinheiro` ao invés de usar `totalPaid` para o envio da mutação de conciliação diária.

## 2. Modelagem do Banco & Supabase (Supabase MCP)
- Nenhuma alteração no Schema de tabelas é necessária, as colunas atuais suprem a necessidade.
- Limpeza de dados (Executar via SQL `execute_sql` ou Supabase SQL Editor):
  ```sql
  DELETE FROM patio_os;
  DELETE FROM receivables;
  DELETE FROM conciliations;
  DELETE FROM daily_cash_values;
  DELETE FROM alerts;
  ```

## 3. Mapa de Dependências
- `useAuth.ts` afeta a rota de `login.tsx`.
- `ImportReportDialog.tsx` afeta a rota de `dashboard` e a mutação de importação.
- `useImportProcessor.ts` afeta a inserção na tabela `conciliations`.
