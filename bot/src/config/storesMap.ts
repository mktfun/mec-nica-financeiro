export interface StoreMapping {
  id_oi: string;
  store_id: string;
  nome_loja: string;
  sigla: string;
}

export const STORES_CANONICAL_MAP: Record<string, StoreMapping> = {
  '4045': { id_oi: '4045', store_id: 'st-01', nome_loja: 'Dom Pedro - DP', sigla: 'DP' },
  '4469': { id_oi: '4469', store_id: 'st-02', nome_loja: 'Jabaquara - JAB', sigla: 'JAB' },
  '2602': { id_oi: '2602', store_id: 'st-03', nome_loja: 'Jorge Beretta - DHJV', sigla: 'DHJV' },
  '351':  { id_oi: '351',  store_id: 'st-04', nome_loja: 'Kennedy - MP', sigla: 'MP' },
  '205':  { id_oi: '205',  store_id: 'st-05', nome_loja: 'Piraporinha - EMPORIO', sigla: 'EMPORIO' },
  '203':  { id_oi: '203',  store_id: 'st-06', nome_loja: 'Planalto - BRASICAR', sigla: 'BRASICAR' },
  '748':  { id_oi: '748',  store_id: 'st-07', nome_loja: 'Rudge Ramos - CAP', sigla: 'CAP' },
  '2112': { id_oi: '2112', store_id: 'st-08', nome_loja: 'Santo André - HD', sigla: 'HD' },
  '2190': { id_oi: '2190', store_id: 'st-09', nome_loja: 'Rei do Módulo - MP', sigla: 'MP' },
  '146':  { id_oi: '146',  store_id: '3a3dd7ce-fa8c-4aee-bac4-42f30fa6899f', nome_loja: 'Maua - MHE', sigla: 'MHE' },
  '2040': { id_oi: '2040', store_id: 'st-master', nome_loja: 'Master (Interno)', sigla: 'MASTER' }
};

export function getStoreByOI(id_oi: string): StoreMapping | undefined {
  return STORES_CANONICAL_MAP[id_oi];
}

export function getStoreBySupabaseId(store_id: string): StoreMapping | undefined {
  return Object.values(STORES_CANONICAL_MAP).find(s => s.store_id === store_id);
}
