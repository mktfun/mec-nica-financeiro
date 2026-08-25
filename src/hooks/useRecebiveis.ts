import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStores } from './useStores';

export interface ReceivableItem {
  id: string;
  store_id: string;
  store_name: string;
  description: string;
  os_number?: string | null;
  installment?: string | null;
  type: 'Boleto' | 'Transferência' | 'Cheque' | 'Cartão' | 'Outros';
  value: number;
  paid_value?: number | null;
  discount_value?: number | null;
  interest_value?: number | null;
  status: 'pendente' | 'recebido' | 'vencido' | 'cancelado';
  date: string;
  due_date: string;
  received_at?: string | null;
  matched_ofx_id?: string | null;
  created_at: string;
  temporal_status?: 'a_vencer' | 'vence_hoje' | 'vencido' | 'recebido' | 'cancelado';
}

export interface StoreReceivablesGroup {
  storeId: string;
  storeName: string;
  items: ReceivableItem[];
  totalPending: number;
  totalReceived: number;
  totalOverdue: number;
  totalGeneral: number;
}

export interface ReceivablesSummaryGlobal {
  totalPending: number;
  totalReceived: number;
  totalOverdue: number;
  totalDueToday: number;
  totalGeneral: number;
  items: ReceivableItem[];
  storeGroups: StoreReceivablesGroup[];
}

export function deriveTemporalStatus(item: { status: string; due_date: string }, targetDate: string): ReceivableItem['temporal_status'] {
  if (item.status === 'recebido') return 'recebido';
  if (item.status === 'cancelado') return 'cancelado';
  
  if (item.due_date > targetDate) return 'a_vencer';
  if (item.due_date === targetDate) return 'vence_hoje';
  return 'vencido';
}

export function useReceivablesByDate(targetDate: string) {
  const { data: stores = [] } = useStores();

  return useQuery({
    queryKey: ['receivables-by-date', targetDate],
    queryFn: async (): Promise<ReceivablesSummaryGlobal> => {
      const { data, error } = await supabase
        .from('receivables')
        .select('*')
        .lte('date', targetDate)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const rawItems = (data || []) as ReceivableItem[];
      
      // Mapeia status temporal
      const itemsWithDerived: ReceivableItem[] = rawItems.map(item => {
        const matchingStore = stores.find(s => s.id === item.store_id);
        return {
          ...item,
          store_name: matchingStore ? matchingStore.name : (item.store_name || item.store_id),
          temporal_status: deriveTemporalStatus(item, targetDate)
        };
      });

      // Agrupa apenas lojas que POSSUEM itens
      const groupMap = new Map<string, StoreReceivablesGroup>();

      let totalPending = 0;
      let totalReceived = 0;
      let totalOverdue = 0;
      let totalDueToday = 0;
      let totalGeneral = 0;

      itemsWithDerived.forEach(item => {
        let group = groupMap.get(item.store_id);
        if (!group) {
          group = {
            storeId: item.store_id,
            storeName: item.store_name,
            items: [],
            totalPending: 0,
            totalReceived: 0,
            totalOverdue: 0,
            totalGeneral: 0
          };
          groupMap.set(item.store_id, group);
        }

        group.items.push(item);
        const val = Number(item.value || 0);
        group.totalGeneral += val;
        totalGeneral += val;

        if (item.status === 'recebido') {
          group.totalReceived += val;
          totalReceived += val;
        } else if (item.status === 'pendente') {
          group.totalPending += val;
          totalPending += val;

          if (item.due_date < targetDate) {
            group.totalOverdue += val;
            totalOverdue += val;
          } else if (item.due_date === targetDate) {
            totalDueToday += val;
          }
        }
      });

      return {
        totalPending: Number(totalPending.toFixed(2)),
        totalReceived: Number(totalReceived.toFixed(2)),
        totalOverdue: Number(totalOverdue.toFixed(2)),
        totalDueToday: Number(totalDueToday.toFixed(2)),
        totalGeneral: Number(totalGeneral.toFixed(2)),
        items: itemsWithDerived,
        storeGroups: Array.from(groupMap.values())
      };
    },
    enabled: !!targetDate
  });
}

export function useMarkReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      paidValue?: number;
      discountValue?: number;
      interestValue?: number;
      matchedOfxId?: string | null;
    }) => {
      const { error } = await supabase
        .from('receivables')
        .update({
          status: 'recebido',
          received_at: new Date().toISOString(),
          paid_value: payload.paidValue,
          discount_value: payload.discountValue || 0,
          interest_value: payload.interestValue || 0,
          matched_ofx_id: payload.matchedOfxId || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivables-by-date'] });
      qc.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
    },
  });
}

export function useCreateReceivable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Omit<ReceivableItem, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('receivables')
        .insert({
          store_id: item.store_id,
          store_name: item.store_name,
          description: item.description,
          os_number: item.os_number || null,
          installment: item.installment || null,
          type: item.type || 'Boleto',
          value: item.value,
          status: item.status || 'pendente',
          date: item.date,
          due_date: item.due_date
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivables-by-date'] });
      qc.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
    }
  });
}

export function useUpdateReceivable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; updates: Partial<ReceivableItem> }) => {
      const { error } = await supabase
        .from('receivables')
        .update({
          ...payload.updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', payload.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivables-by-date'] });
      qc.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
    }
  });
}

export function useDeleteReceivable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('receivables')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivables-by-date'] });
      qc.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
    }
  });
}

export function useBatchSaveReceivables() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<Omit<ReceivableItem, 'id' | 'created_at'>>) => {
      if (!items || items.length === 0) return;

      const { data, error } = await supabase
        .from('receivables')
        .upsert(
          items.map(it => ({
            store_id: it.store_id,
            store_name: it.store_name,
            description: it.description,
            os_number: it.os_number || null,
            installment: it.installment || null,
            type: it.type || 'Boleto',
            value: it.value,
            status: it.status || 'pendente',
            date: it.date,
            due_date: it.due_date
          })),
          { onConflict: 'store_id,description,due_date,value' }
        )
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receivables'] });
      qc.invalidateQueries({ queryKey: ['receivables-by-date'] });
      qc.invalidateQueries({ queryKey: ['daily-reconciliation-summary'] });
    }
  });
}

// Mantido para retrocompatibilidade
export function useRecebiveis(filters?: { status?: string; storeId?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: ['receivables', filters],
    queryFn: async () => {
      let q = supabase.from('receivables').select('*');
      if (filters?.status) q = q.eq('status', filters.status);
      if (filters?.storeId) q = q.eq('store_id', filters.storeId);
      if (filters?.startDate) q = q.gte('due_date', filters.startDate);
      if (filters?.endDate) q = q.lte('due_date', filters.endDate);
      q = q.order('due_date', { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return data as ReceivableItem[];
    },
  });
}

export function useReceivablesSummary() {
  return useQuery({
    queryKey: ['receivables_summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_receivables_summary' as any).catch(() => ({ data: [] }));
      return data || [];
    },
  });
}
