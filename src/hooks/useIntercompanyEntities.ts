import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { IntercompanyEntity, ExpenseCategoryRule } from '@/types/contasPagar';
import { toast } from 'sonner';

export function useIntercompanyEntities() {
  const queryClient = useQueryClient();

  const entitiesQuery = useQuery({
    queryKey: ['intercompany_entities'],
    queryFn: async (): Promise<IntercompanyEntity[]> => {
      const { data, error } = await supabase
        .from('intercompany_entities')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const categoryRulesQuery = useQuery({
    queryKey: ['expense_category_rules'],
    queryFn: async (): Promise<ExpenseCategoryRule[]> => {
      const { data, error } = await supabase
        .from('expense_category_rules')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const saveEntityMutation = useMutation({
    mutationFn: async (entity: Partial<IntercompanyEntity>) => {
      const { data, error } = await supabase
        .from('intercompany_entities')
        .upsert(entity)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intercompany_entities'] });
      toast.success('Entidade / Sócio salvo com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar entidade: ${err.message}`);
    },
  });

  const saveRuleMutation = useMutation({
    mutationFn: async (rule: Partial<ExpenseCategoryRule>) => {
      const { data, error } = await supabase
        .from('expense_category_rules')
        .upsert(rule)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense_category_rules'] });
      toast.success('Regra de categoria salva com sucesso!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao salvar regra: ${err.message}`);
    },
  });

  return {
    entities: entitiesQuery.data || [],
    isLoadingEntities: entitiesQuery.isLoading,
    categoryRules: categoryRulesQuery.data || [],
    isLoadingRules: categoryRulesQuery.isLoading,
    saveEntity: saveEntityMutation.mutateAsync,
    isSavingEntity: saveEntityMutation.isPending,
    saveRule: saveRuleMutation.mutateAsync,
    isSavingRule: saveRuleMutation.isPending,
  };
}
