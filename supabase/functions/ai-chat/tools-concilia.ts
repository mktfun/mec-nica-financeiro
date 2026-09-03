import { z } from 'npm:zod@3';
import { tool } from 'npm:ai@latest';

export const HYDRA_SYSTEM_PROMPT_XML = `<system_prompt version="2026.1" project="ConciliaMec" domain="Auditoria Financeira Automotiva">
  <identity>
    Você é o Analista Sênior de Conciliação Bancária e Tesouraria da holding automotiva (10 filiais).
    Sua conduta é estritamente analítica, técnica, sóbria e focada na apuração fática e exata dos saldos.
    JAMAIS utilize emojis, linguagem informal ou termos de fantasia.
    Comunique-se como um perito contábil experiente.
  </identity>

  <accounting_invariants>
    <formula id="caixa_atual">
      Caixa_Atual = (Saldo_Bancos_Positivo + Dinheiro_MP + A_Receber + Na_Loja_OS) - Saldo_Negativo_Itau
    </formula>
    <formula id="fluxo_caixa">
      Fluxo_Caixa = Caixa_Atual - Caixa_Anterior
    </formula>
    <formula id="faturamento_periodo">
      Faturamento_Periodo = Faturamento_Odometro_Base + Ajustes_Corporativos_DRE
    </formula>
    <formula id="disponivel_contas">
      Valor_Disponivel_Contas = Faturamento_Periodo - Fluxo_Caixa
    </formula>
    <formula id="subtotal_contas">
      Subtotal_Contas = Contas_Base_ERP + Despesas_Extras_OFX + Juros_Taxas_Rede
    </formula>
    <formula id="delta_final">
      Delta_Final = Valor_Disponivel_Contas - Subtotal_Contas
    </formula>
    <tolerance>
      A meta contábil prioritária é alcançar Delta_Final = R$ 0,00.
      A conciliação é considerada Aprovada (Conforme) quando |Delta_Final| <= R$ 50,00.
    </tolerance>
  </accounting_invariants>

  <specialist_arms>
    <arm id="treasury_auditor">
      <role>Auditor de Extratos e Cheque Especial</role>
      <mandate>Auditar as 10 contas correntes Itaú e consolidar os saldos patrimoniais com tolerância zero.</mandate>
    </arm>
    <arm id="patio_investigator">
      <role>Investigador de Pátio e Ordens de Serviço</role>
      <mandate>Cruzar créditos PIX órfãos com ordens de serviço em aberto na mesma filial com prevenção contra colisão de mesmo valor.</mandate>
    </arm>
    <arm id="pos_reconciler">
      <role>Conciliador de Adquirência Rede</role>
      <mandate>Separar liquidações em conta corrente (D-1) de vendas brutas do balcão (D-0) e apurar o spread de taxas MDR.</mandate>
    </arm>
    <arm id="bills_auditor">
      <role>Auditor de Contas e Despesas</role>
      <mandate>Validar saídas bancárias contra o ERP, classificando despesas extras operacionais ou corporativas.</mandate>
    </arm>
    <arm id="revenue_auditor">
      <role>Auditor de Faturamento DRE</role>
      <mandate>Consolidar receitas extraordinárias de holding (Aluguéis, Custo Master, Estornos de Seguros).</mandate>
    </arm>
    <arm id="intercompany_analyst">
      <role>Analista Intercompany e Filiais</role>
      <mandate>Isolar a filial causadora da divergência e detectar compensações e repasses entre contas da rede.</mandate>
    </arm>
  </specialist_arms>

  <reasoning_protocol>
    1. ANALISAR o Delta atual através da ferramenta obtem_resumo_conciliacao.
    2. IDENTIFICAR qual das 10 filiais possui pendências na matriz de lojas.
    3. EXECUTAR a ferramenta de investigação adequada à natureza da pendência.
    4. FORMULAR propostas objetivas contendo o impacto exato no Delta.
    5. NUNCA inventar números para forçar diferença zero: rombos devem ser registrados e justificados.
  </reasoning_protocol>
</system_prompt>`;

export const toolsConcilia = (supabaseClient: any) => ({
  obtem_resumo_conciliacao: tool({
    description: 'Obtém o resumo oficial consolidado dos 5 Pilares, Delta Final e o detalhamento das 10 filiais no PostgreSQL.',
    parameters: z.object({
      date: z.string().describe('Data da conciliação no formato YYYY-MM-DD'),
      forceDynamic: z.boolean().default(true).describe('Forçar recálculo dinâmico sem usar cache de snapshot fechado')
    }),
    execute: async ({ date, forceDynamic }) => {
      const { data, error } = await supabaseClient.rpc('get_daily_reconciliation_summary', {
        p_date: date,
        p_force_dynamic: forceDynamic
      });
      if (error) return { erro: error.message };
      return data;
    }
  }),

  executa_auto_match: tool({
    description: 'Executa o motor determinístico canônico de auto-match no PostgreSQL para conciliar recebimentos PIX e maquininhas contra OSs sem colisão de valores.',
    parameters: z.object({
      date: z.string().describe('Data da conciliação no formato YYYY-MM-DD')
    }),
    execute: async ({ date }) => {
      const { data, error } = await supabaseClient.rpc('auto_match_daily_transactions', {
        p_date: date
      });
      if (error) return { erro: error.message };
      return data;
    }
  }),

  resolve_transacao_orfa: tool({
    description: 'Aplica a resolução de uma transação órfã (vínculo a OS, despesa extra, receita de holding ou apenas justificar) e retorna o novo Delta recalculado.',
    parameters: z.object({
      txId: z.string().describe('UUID da transação em ofx_transactions ou pos_transactions'),
      action: z.enum(['link_os', 'revenue_adjustment', 'expense_bill', 'justify_only']).describe('Ação a ser executada'),
      params: z.record(z.any()).describe('Parâmetros da ação (store_id, os_number, amount, category, justification)')
    }),
    execute: async ({ txId, action, params }) => {
      const { data, error } = await supabaseClient.rpc('resolve_orphan_transaction', {
        p_tx_id: txId,
        p_action: action,
        p_params: params
      });
      if (error) return { erro: error.message };
      return data;
    }
  }),

  ajusta_faturamento_dre: tool({
    description: 'Registra ou atualiza um ajuste corporativo de faturamento (DRE) como Aluguel, Custo Master ou Estorno.',
    parameters: z.object({
      date: z.string().describe('Data YYYY-MM-DD'),
      title: z.string().describe('Título da receita extraordinária'),
      amount: z.number().describe('Valor monetário em reais'),
      type: z.string().default('aporte').describe('Tipo do ajuste (aporte, aluguel, estorno, etc.)'),
      description: z.string().optional().describe('Detalhamento da receita'),
      storeId: z.string().optional().describe('ID da filial beneficiada')
    }),
    execute: async ({ date, title, amount, type, description, storeId }) => {
      const { data, error } = await supabaseClient.rpc('upsert_daily_revenue_adjustment', {
        p_date: date,
        p_title: title,
        p_amount: amount,
        p_type: type,
        p_description: description || null,
        p_store_id: storeId || null
      });
      if (error) return { erro: error.message };
      return data;
    }
  }),

  consulta_transacoes_orfas: tool({
    description: 'Consulta no extrato bancário (OFX) as transações que ainda não foram conciliadas para uma data e filial.',
    parameters: z.object({
      date: z.string().describe('Data YYYY-MM-DD'),
      storeId: z.string().optional().describe('ID da filial (ex: st-01, st-04 ou UUID de Mauá)'),
      type: z.enum(['in', 'out', 'all']).default('all').describe('Tipo de transação: in (créditos), out (débitos), all (ambos)')
    }),
    execute: async ({ date, storeId, type }) => {
      let query = supabaseClient.from('ofx_transactions')
        .select('id, store_id, bank_name, type, amount, occurred_at, fitid, counterpart_name, matched_os_number, manual_category')
        .eq('target_date', date);

      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (type !== 'all') {
        query = query.eq('type', type);
      }

      // Filtrar não conciliados
      query = query.is('matched_os_number', null).is('manual_category', null).limit(20);

      const { data, error } = await query;
      if (error) return { erro: error.message };
      return data;
    }
  })
});
