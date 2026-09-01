import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase, StoreRow } from '@/lib/supabase';

export interface StoreFileMapping {
  id?: string;
  file_alias: string;
  store_id: string;
  store_name?: string;
}

const LOCAL_STORAGE_KEY = 'mecanica_store_file_mappings';

const KNOWN_ACCOUNT_DEFAULTS: Record<string, string> = {
  // Contas Bancárias OFX
  '8813984633': 'st-01', // Dom Pedro (DP)
  '8813984112': 'st-02', // Jabaquara (JAB)
  '3385988047': 'st-03', // Jorge Beretta (DHJV)
  '7386175298': 'st-04', // Kennedy (MP)
  '7386162601': 'st-05', // Piraporinha (EMPORIO)
  '7386166586': 'st-06', // Planalto (BRASICAR)
  '0263811531': 'st-07', // Rudge Ramos (CAP)
  '8813994293': 'st-08', // Santo André (HD)
  '8813992677': 'st-09', // Rei do Módulo (MP)
  '2783070820': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', // Mauá (MHE)
  
  // OS Aliases das Planilhas de Pátio
  'MPrudge': 'st-07',
  'MPdompedro1': 'st-01',
  'MPSantoAndre': 'st-08',
  'MPJabaquara': 'st-02',
  'MPJorgeBeretta': 'st-03',
  'ReiDoOleoMaua': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
  'MPkennedy': 'st-04',
  'MPpiraporinha': 'st-05',
  'MPplanalto': 'st-06',
  'ReiDoModulo': 'st-09',
  
  // Códigos curtos de arquivos
  'CAP': 'st-07',
  'DP': 'st-01',
  'HD': 'st-08',
  'JAB': 'st-02',
  'JB': 'st-03',
  'MHE': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
  'MP': 'st-04',
  'PIR': 'st-05',
  'PLA': 'st-06',
  'RM': 'st-09',
  'BRA': 'st-06',
  'EMP': 'st-05',

  // Nomes normalizados da Rede (storeMapping.ts)
  'Dom Pedro - DP': 'st-01',
  'Jabaquara - JAB': 'st-02',
  'Jorge Beretta - DHJV': 'st-03',
  'Kennedy - MP': 'st-04',
  'Piraporinha - EMPORIO': 'st-05',
  'Planalto - BRASICAR': 'st-06',
  'Rudge Ramos - CAP': 'st-07',
  'Santo André - HD': 'st-08',
  'Santo Andre - HD': 'st-08',
  'Rei do Módulo - MP': 'st-09',
  'Rei do Modulo - MP': 'st-09',
  'Maua - MHE': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',
  'Mauá - MHE': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f',

  // PVs Maquininha Rede
  '76347036': 'st-04', // Kennedy MP
  '71854878': 'st-01', // Dom Pedro
  '104112840': 'st-08', // Santo Andre
  '101423446': 'st-06', // Planalto
  '101422997': 'st-05', // Piraporinha
  '101423667': 'st-03', // Jorge Beretta
  '63034336': 'st-07', // Rudge Ramos
  '47712201': 'st-09', // Rei do Modulo
  '63304449': 'st-02', // Jabaquara
  '102553424': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', // Maua
  'KENNEDY MP': 'st-04',
  'DOM PEDRO': 'st-01',
  'SANTO ANDRE': 'st-08',
  'PLANALTO': 'st-06',
  'PIRAPORINHA': 'st-05',
  'JORGE BERETTA': 'st-03',
  'RUDGE RAMOS': 'st-07',
  'REI DO MODULO': 'st-09',
  'JABAQUARA': 'st-02',
  'MAUA': '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f'
};

export function useStoreFileMappings(stores: StoreRow[] = []) {
  const queryClient = useQueryClient();
  const [localMapping, setLocalMapping] = useState<Record<string, string>>({});

  // 1. Carregar mapeamentos persistidos no Supabase
  const { data: dbMappings = [], isLoading: isLoadingDb } = useQuery({
    queryKey: ['store_file_mappings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_file_mappings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[useStoreFileMappings] Erro ao carregar do Supabase:', error);
        return [];
      }
      return (data || []) as StoreFileMapping[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });

  // 2. Inicializar mapa combinando Defaults + Supabase + localStorage + auto-match por nome
  useEffect(() => {
    const combined: Record<string, string> = {};

    // 2.0 Defaults conhecidos por conta/alias
    Object.entries(KNOWN_ACCOUNT_DEFAULTS).forEach(([acct, sid]) => {
      combined[acct] = sid;
      combined[`ITAU - ${acct}`] = sid;
      combined[`BANCO DESCONHECIDO - ${acct}`] = sid;
    });

    // 2.1 Fallback localStorage
    try {
      const savedStr = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        Object.keys(saved).forEach(alias => {
          const val = saved[alias];
          // Se for slug, converter para store_id
          const found = stores.find(s => 
            s.id === val || 
            s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim() === val
          );
          if (found) {
            combined[alias] = found.id;
          } else if (val) {
            combined[alias] = val;
          }
        });
      }
    } catch (e) {
      console.warn('[useStoreFileMappings] Erro ao ler localStorage:', e);
    }

    // 2.2 Prioridade: dados do Supabase
    dbMappings.forEach(m => {
      if (m.file_alias && m.store_id) {
        combined[m.file_alias] = m.store_id;
      }
    });

    // 2.3 Auto-match por similaridade de nome para aliases que ainda não têm vínculo
    stores.forEach(s => {
      const cleanStoreName = s.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      // Auto-vínculo para o próprio nome da loja
      if (!combined[s.name]) combined[s.name] = s.id;
      if (!combined[cleanStoreName]) combined[cleanStoreName] = s.id;
    });

    setLocalMapping(combined);
  }, [dbMappings, stores]);

  // 3. Mutação para salvar/atualizar match no Supabase e localStorage
  const mutation = useMutation({
    mutationFn: async ({ file_alias, store_id, store_name }: { file_alias: string; store_id: string; store_name?: string }) => {
      // Salva no Supabase via upsert
      const { data, error } = await supabase
        .from('store_file_mappings')
        .upsert(
          {
            file_alias,
            store_id,
            store_name: store_name || null,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'file_alias' }
        )
        .select()
        .single();

      if (error) {
        console.error('[useStoreFileMappings] Erro ao salvar mapeamento no Supabase:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store_file_mappings'] });
    }
  });

  const updateMapping = useCallback((file_alias: string, store_id: string, store_name?: string) => {
    if (!file_alias) return;

    // Atualização otimista local
    setLocalMapping(prev => {
      const next = { ...prev, [file_alias]: store_id };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {}
      return next;
    });

    // Persistência no Supabase (se loja válida selecionada)
    if (store_id && store_id !== 'GLOBAL') {
      mutation.mutate({ file_alias, store_id, store_name });
    } else if (store_id === 'GLOBAL') {
      // Atualiza apenas localmente para ignorar nesta sessão
    }
  }, [mutation]);

  return {
    mapping: localMapping,
    isLoading: isLoadingDb,
    updateMapping,
    setMapping: setLocalMapping
  };
}
