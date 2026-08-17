import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface PosFeeContract {
  id: string;
  acquirer: string;
  brand: string;
  method: string;
  installments_range: string;
  contracted_mdr_percent: number;
  anticipation_fee_percent: number;
  effective_from?: string;
  effective_to?: string;
  active: boolean;
}

export function useFeeContracts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pos_fee_contracts'],
    queryFn: async (): Promise<PosFeeContract[]> => {
      const { data, error } = await supabase
        .from('pos_fee_contracts')
        .select('*')
        .order('brand', { ascending: true })
        .order('method', { ascending: true });

      if (error) {
        console.warn('[useFeeContracts] Erro ao carregar contratos do Supabase:', error.message);
        // Retorna tabela padrão de fallback caso a tabela ainda não esteja populada
        return [
          { id: '1', acquirer: 'Rede', brand: 'Mastercard', method: 'Débito', installments_range: '1x', contracted_mdr_percent: 0.78, anticipation_fee_percent: 0, active: true },
          { id: '2', acquirer: 'Rede', brand: 'Mastercard', method: 'Crédito à Vista', installments_range: '1x', contracted_mdr_percent: 1.48, anticipation_fee_percent: 0, active: true },
          { id: '3', acquirer: 'Rede', brand: 'Mastercard', method: 'Parcelado (2-6x)', installments_range: '2-6x', contracted_mdr_percent: 2.10, anticipation_fee_percent: 1.20, active: true },
          { id: '4', acquirer: 'Rede', brand: 'Mastercard', method: 'Parcelado (7-12x)', installments_range: '7-12x', contracted_mdr_percent: 2.45, anticipation_fee_percent: 1.35, active: true },
          { id: '5', acquirer: 'Rede', brand: 'Visa', method: 'Débito', installments_range: '1x', contracted_mdr_percent: 0.78, anticipation_fee_percent: 0, active: true },
          { id: '6', acquirer: 'Rede', brand: 'Visa', method: 'Crédito à Vista', installments_range: '1x', contracted_mdr_percent: 1.48, anticipation_fee_percent: 0, active: true },
          { id: '7', acquirer: 'Rede', brand: 'Visa', method: 'Parcelado (2-6x)', installments_range: '2-6x', contracted_mdr_percent: 2.10, anticipation_fee_percent: 1.20, active: true },
          { id: '8', acquirer: 'Rede', brand: 'Visa', method: 'Parcelado (7-12x)', installments_range: '7-12x', contracted_mdr_percent: 2.45, anticipation_fee_percent: 1.35, active: true },
          { id: '9', acquirer: 'Rede', brand: 'Elo', method: 'Débito', installments_range: '1x', contracted_mdr_percent: 0.95, anticipation_fee_percent: 0, active: true },
          { id: '10', acquirer: 'Rede', brand: 'Elo', method: 'Crédito à Vista', installments_range: '1x', contracted_mdr_percent: 1.85, anticipation_fee_percent: 0, active: true },
          { id: '11', acquirer: 'Rede', brand: 'Elo', method: 'Parcelado (2-6x)', installments_range: '2-6x', contracted_mdr_percent: 2.60, anticipation_fee_percent: 1.40, active: true },
          { id: '12', acquirer: 'Rede', brand: 'Elo', method: 'Parcelado (7-12x)', installments_range: '7-12x', contracted_mdr_percent: 2.95, anticipation_fee_percent: 1.50, active: true },
          { id: '13', acquirer: 'Rede', brand: 'Hipercard', method: 'Crédito à Vista', installments_range: '1x', contracted_mdr_percent: 1.85, anticipation_fee_percent: 0, active: true },
          { id: '14', acquirer: 'Rede', brand: 'Hipercard', method: 'Parcelado (2-6x)', installments_range: '2-6x', contracted_mdr_percent: 2.60, anticipation_fee_percent: 1.40, active: true },
          { id: '15', acquirer: 'Rede', brand: 'Hipercard', method: 'Parcelado (7-12x)', installments_range: '7-12x', contracted_mdr_percent: 2.95, anticipation_fee_percent: 1.50, active: true },
          { id: '16', acquirer: 'Rede', brand: 'PIX', method: 'PIX Maquininha', installments_range: '1x', contracted_mdr_percent: 0.00, anticipation_fee_percent: 0, active: true },
        ];
      }
      return (data || []) as PosFeeContract[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const updateContractMutation = useMutation({
    mutationFn: async (contract: Partial<PosFeeContract> & { id: string }) => {
      const { data, error } = await supabase
        .from('pos_fee_contracts')
        .update({
          contracted_mdr_percent: contract.contracted_mdr_percent,
          anticipation_fee_percent: contract.anticipation_fee_percent,
          active: contract.active ?? true,
          updated_at: new Date().toISOString()
        })
        .eq('id', contract.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos_fee_contracts'] });
      queryClient.invalidateQueries({ queryKey: ['mdr_audit_summary'] });
      toast.success('Taxa contratual atualizada com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao atualizar contrato: ' + err.message);
    }
  });

  const upsertContractsMutation = useMutation({
    mutationFn: async (contracts: Partial<PosFeeContract>[]) => {
      const { data, error } = await supabase
        .from('pos_fee_contracts')
        .upsert(contracts)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pos_fee_contracts'] });
      queryClient.invalidateQueries({ queryKey: ['mdr_audit_summary'] });
      toast.success('Contratos de taxas salvos com sucesso!');
    },
    onError: (err: any) => {
      toast.error('Erro ao salvar contratos: ' + err.message);
    }
  });

  return {
    contracts: query.data || [],
    isLoading: query.isLoading,
    updateContract: updateContractMutation.mutateAsync,
    upsertContracts: upsertContractsMutation.mutateAsync,
    isSaving: updateContractMutation.isPending || upsertContractsMutation.isPending,
  };
}
