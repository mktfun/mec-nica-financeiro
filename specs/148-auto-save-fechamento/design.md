# Design: Auto Save Conciliação (148-auto-save-fechamento)

## Arquitetura Técnica
**Fluxo Atual (Falho):**
Importação -> Bulk Insert TX/OS -> Supabase DB -> RPC `get_dashboard_metrics` (Lê Snapshot vazio) -> Wizard Salva Snapshot Vazio.

**Fluxo Proposto (Novo):**
Importação -> Bulk Insert TX/OS -> Algoritmo de Cálculo Interno (JS/TS em memória) no Wizard -> Wizard gera payload correto -> Mutação Upsert em `daily_snapshots` e `reconciliations` -> Exibe Sucesso com Dados Reais.

## Interfaces TypeScript
Nenhuma interface nova será necessária. Aproveitaremos as próprias props dos resultados:
- `ofxResults` (BankBalance, PreviousBalance, transações)
- `osFiles` (Faturamento por loja, Pátio atual)
- `txsToInsert` (Array unificado antes do envio)

## Componentes / Hooks / Funções
1. **`src/components/importacoes/CentralImportWizard.tsx`**: 
   - No bloco 4 de fechamento (linha ~677), instanciar os contadores (ex: `faturamentoAtual`, `veiculosPatioValor`, `saldoTotal`).
   - Mapear sobre `results.osFiles`, `results.ofxResults` e as matrizes de POS para gerar os totais idênticos aos usados pelo cálculo ao vivo.
   - Usar `supabase.from('reconciliations').upsert(...)` para cada loja para salvar `na_loja_os`.
   - Modificar a mutação de save para consumir as variáveis locais.
   
2. **`src/components/conciliacao/ResumoDiaPanel.tsx`**: 
   - Localizar a variável que determina se existe snapshot no dia (ex: dados vindos do banco que preenchem os totais).
   - Localizar o botão de ação (atualmente renderiza "Salvar Fechamento").
   - Alterar para um operador ternário que diz: se tem registro de snapshot, o botão renderiza um lápis `<Edit2 size={16} /> Editar Fechamento`, senão, mantém `<Save size={16} /> Salvar Fechamento`.

## Fluxo de UI
1. Usuário abre a Importação Centralizada, arrasta os PDFs e OFX.
2. Clica em "Validar", revisa, clica em "Importar".
3. O wizard faz o upload para as tabelas.
4. Internamente, o wizard calcula os totais sem dependência da RPC e cria a "foto do dia".
5. O Wizard confirma "Fechamento auto-salvo".
6. Usuário acessa qualquer loja ou painel global e vê a conciliação validada com o botão "Editar Fechamento", pronto para futura manutenções manuais.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1:** Realizar importação completa de uma loja com OSs, OFX e Maquininha. Após o fim do wizard, o registro de `daily_snapshots` deve conter os totais exatos dos PDFs. No painel, o botão deve estar como "Editar Fechamento".
- **Cenário 2:** Acessar o painel de um dia passado já fechado. O botão deve apresentar "Editar Fechamento".
