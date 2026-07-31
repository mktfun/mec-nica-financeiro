import { z } from 'npm:zod@3'
import { tool } from 'npm:ai@latest'

export const toolsLocal = (supabaseClient: any) => ({
  consulta_resumo_os: tool({
    description: 'Consulta o banco de dados LOCAL para listar Ordens de Serviço (OS). Use esta ferramenta ANTES de chamar APIs externas. Retorna status, placa, loja e valores.',
    parameters: z.object({
      osNumber: z.string().optional().describe('Número específico da OS'),
      loja: z.string().optional().describe('ID da loja (ex: mp_jabaquara)'),
      limit: z.number().default(10).describe('Quantidade de OS a retornar')
    }),
    execute: async ({ osNumber, loja, limit }) => {
       let query = supabaseClient.from('patio_os').select('*');
       if (osNumber) {
         query = query.eq('os_number', String(osNumber).trim());
       } else if (loja) {
         query = query.or(`store_id.eq.${loja},store_name.ilike.%${loja}%`);
       }
       const { data, error } = await query.limit(limit);
       if (error) return { erro_local: error.message };
       if (!data || data.length === 0) return { aviso: 'OS não encontrada no banco local.' };
       return data;
    }
  }),
  consulta_saldo_contas: tool({
    description: 'Consulta o fluxo de caixa, transações e saldo no banco LOCAL (ConciliaMec).',
    parameters: z.object({
      loja: z.string().optional().describe('ID da loja'),
      limit: z.number().default(50).describe('Quantidade de registros')
    }),
    execute: async ({ loja, limit }) => {
       let query = supabaseClient.from('transactions').select('*');
       if (loja) query = query.eq('store_id', loja);
       const { data, error } = await query.limit(limit);
       if (error) return { erro_local: error.message };
       return data;
    }
  }),
  consulta_conciliacao_periodo: tool({
    description: 'Consulta resumos de conciliações (fechamento de caixa) no banco LOCAL.',
    parameters: z.object({
      loja: z.string().optional().describe('ID da loja'),
      data_inicio: z.string().optional().describe('Data de início YYYY-MM-DD'),
      limit: z.number().default(30).describe('Quantidade de registros')
    }),
    execute: async ({ loja, data_inicio, limit }) => {
       let query = supabaseClient.from('reconciliations').select('*');
       if (loja) query = query.eq('store_id', loja);
       if (data_inicio) query = query.gte('date', data_inicio);
       const { data, error } = await query.limit(limit);
       if (error) return { erro_local: error.message };
       return data;
    }
  }),
  consulta_contas_em_aberto: tool({
    description: 'Consulta contas a pagar/receber (receivables) que estão em aberto no banco LOCAL.',
    parameters: z.object({
      loja: z.string().optional().describe('ID da loja'),
      limit: z.number().default(30).describe('Quantidade de registros')
    }),
    execute: async ({ loja, limit }) => {
       let query = supabaseClient.from('receivables').select('*').eq('status', 'PENDING');
       if (loja) query = query.eq('store_id', loja);
       const { data, error } = await query.limit(limit);
       if (error) return { erro_local: error.message };
       return data;
    }
  })
});
