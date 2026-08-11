# Design: O Fim do Robô e Conciliação Híbrida (164)

## Arquitetura Técnica

Fluxo Marco Zero:
[Upload Excel] -> (Parser: Sheet SALDO, Sheet OS) -> [Extração D-1 e Filtro "Sem Pagamento"] -> `estoque_os_pendente` (INSERT) / `reconciliations` (UPDATE previous_balance)

Fluxo Diário:
[Upload OFX, Rede, Excel OI] -> (Parsers) -> [Memória React (na_loja_mes_atual, ofx_transactions)] 
-> [UI Match Manual: OFX Órfãos (Esquerda) vs estoque_os_pendente (Direita)]
-> [Botão Dar Baixa] -> (UI: move OS de Pendente para Match Local Temporário)
-> [Resumo e Confirmar] -> (Supabase RPC ou Multi-upsert: Atualiza reconciliations D0, Atualiza estoque_os_pendente para 'PAGA')

Virada de Mês (Script local disparado na tela se data for fim do mês):
[Excel OI Último Dia] -> Filtra sem pagamento -> INSERT `estoque_os_pendente`.

## Interfaces TypeScript

```typescript
// Supabase
export interface EstoqueOsPendenteRow {
  id: string; // uuid
  store_id: string; // text
  numero_os: string;
  data_os: string; // YYYY-MM-DD
  valor_os: number;
  status: 'PENDENTE' | 'PAGA';
  data_baixa: string | null;
  created_at?: string;
}

export interface MarcoZeroExtraction {
  dinheiroMp: number;
  aReceber: number;
  negativo: number;
  caixaAnterior: number;
  osPendentes: { numero_os: string; data_os: string; valor_os: number }[];
}
```

## Componentes / Hooks / Funções

- `src/components/importacoes/MarcoZeroWizard.tsx` (NOVO): Tela dedicada para importar o "CONCILIAÇÃO 1008.xlsx".
- `src/components/importacoes/CentralImportWizard.tsx` (MODIFICADO): Remoção do `AgentRunnerModal`. Inclusão do **Step 3 (Bloco A e Bloco B)** contendo a interface de duas colunas para dar baixa (OFX Órfãos vs `estoque_os_pendente`).
- `src/hooks/useEstoqueOs.ts` (NOVO): Fetching e mutations das OSs passivas, usando React Query.
- `src/lib/parsers/marcoZeroParser.ts` (NOVO): Função que recebe o ArrayBuffer do arquivo XLS legado, usa `xlsx`, acessa sheet SALDO para mapear a posição fixa e sheet OS iterando as colunas.
- `supabase/migrations/20260811xxxxxx_create_estoque_os.sql`: Cria a tabela `estoque_os_pendente`.

## Fluxo de UI

1. (Configuração Única) O usuário vai na aba "Marco Zero", joga o Excel velho. Vê um preview de quantas OSs ficaram no "Passivo" e o "Caixa Anterior", e clica em Salvar.
2. (Dia-a-Dia) O usuário entra na Central de Importações.
3. Joga os arquivos normais (agora com o Excel do mês do Oficina Inteligente, sem Robô).
4. O sistema processa. A tela Step 3 (Matadora de Robôs) aparece:
   - Acima: inputs manuais pré-preenchidos com D-1.
   - Esquerda: lista de transações bancárias (PIX, TED) que não casaram com as maquininhas.
   - Direita: lista em scroll do `estoque_os_pendente` carregado direto do Supabase.
5. O usuário seleciona 1 item na esquerda, 1 item na direita, clica em [✔ Dar Baixa]. Ambos ficam verdes e saem da lista "pendente".
6. Avança para Preview e grava tudo.

## Infra / Deploy

- Não há novos serviços, usará o frontend React (Lovable/Vite) e o banco Supabase atual. Sem variáveis novas.

## Cenários de Verificação (SCAN → INFER → VERIFY → FIX)
- **Cenário 1 (Marco Zero):** Upload `CONCILIAÇÃO 1008.xlsx` → Parser acha Célula de Dinheiro MP e lista de OS sem `Credito/PIX` → Salva na `estoque_os_pendente` corretamente.
- **Cenário 2 (Match Triplo sem Robô):** Upload OFX (PIX R$50) e Upload OI Mês. → UI joga o PIX R$50 na Esquerda (Órfãos) e lista as OS Pendentes na Direita. → Clica "Baixar" → Clica Gravar → Banco atualiza `status = PAGA`.
