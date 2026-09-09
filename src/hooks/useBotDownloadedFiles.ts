import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface BotDownloadedFile {
  id: string;
  store_id: string;
  bank_code: string;
  bank_name: string;
  file_name: string;
  file_size_bytes: number;
  content: string;
  sha256: string;
  from_date: string;
  to_date: string;
  status: 'available' | 'processed' | 'expired';
  created_at: string;
  expires_at: string;
  stores?: {
    id: string;
    name: string;
    code?: string;
  } | null;
}

export interface TriggerBotExtractionParams {
  store: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
  account?: string;
  agency?: string;
  botUrl?: string;
}

/**
 * Consulta os arquivos OFX baixados pelos robôs nas últimas 48 horas
 */
export function useBotDownloadedFiles(filter?: { date?: string; storeId?: string }) {
  return useQuery({
    queryKey: ['bot_downloaded_files', filter?.date, filter?.storeId],
    queryFn: async (): Promise<BotDownloadedFile[]> => {
      let query = supabase
        .from('bot_downloaded_files')
        .select(`
          id,
          store_id,
          bank_code,
          bank_name,
          file_name,
          file_size_bytes,
          content,
          sha256,
          from_date,
          to_date,
          status,
          created_at,
          expires_at,
          stores (
            id,
            name,
            code
          )
        `)
        .order('created_at', { ascending: false });

      if (filter?.storeId && filter.storeId !== 'all') {
        query = query.eq('store_id', filter.storeId);
      }

      if (filter?.date) {
        // Arquivos cujo período cubra a data ou foram criados nessa data
        query = query.or(`from_date.lte.${filter.date},to_date.gte.${filter.date}`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useBotDownloadedFiles] Erro ao carregar arquivos do buffer:', error);
        throw error;
      }

      // Filtra no cliente registros que ainda não expiraram
      const now = new Date().getTime();
      return (data || []).filter((item: any) => {
        const expTime = new Date(item.expires_at).getTime();
        return expTime > now;
      }) as BotDownloadedFile[];
    },
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });
}

/**
 * Dispara o download nativo do arquivo .ofx diretamente no navegador do operador
 */
export function downloadOfxFile(content: string, fileName: string): void {
  if (!content) {
    toast.error('O conteúdo do arquivo está vazio.');
    return;
  }

  try {
    const blob = new Blob([content], { type: 'application/x-ofx;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.ofx') ? fileName : `${fileName}.ofx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Download de "${fileName}" concluído!`);
  } catch (err: any) {
    console.error('Erro ao baixar OFX:', err);
    toast.error('Falha ao processar download do arquivo.');
  }
}

/**
 * Converte o registro textual em um objeto File para consumo pelo wizard
 */
export function createOfxFileObject(content: string, fileName: string): File {
  const cleanName = fileName.endsWith('.ofx') ? fileName : `${fileName}.ofx`;
  const blob = new Blob([content], { type: 'application/x-ofx' });
  return new File([blob], cleanName, {
    type: 'application/x-ofx',
    lastModified: Date.now(),
  });
}

/**
 * Formata o tempo restante de vida do arquivo antes da expiração automática
 */
export function formatExpiresIn(expiresAt: string): string {
  if (!expiresAt) return '';
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return 'Expirado';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) {
    return `Expira em ${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim();
  }
  return `Expira em ${minutes}m`;
}

/**
 * Dispara a extração do Itaú no servidor VPS
 */
export function useTriggerBotExtraction() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (params: TriggerBotExtractionParams) => {
      const serverUrl = params.botUrl || 'https://bot.tork.services';
      const endpoint = `${serverUrl.replace(/\/$/, '')}/api/sync/itau`;

      console.log(`[useTriggerBotExtraction] Disparando extração em ${endpoint}...`, params);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'conciliamec-bot-key-change-me',
        },
        body: JSON.stringify({
          store: params.store,
          from: params.from,
          to: params.to,
          account: params.account,
          agency: params.agency,
          headless: true,
        }),
      });

      if (!response.ok) {
        let errMessage = `Servidor respondeu com status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errMessage = errData.error;
        } catch {}
        throw new Error(errMessage);
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success('Extração concluída com sucesso! Extrato salvo no buffer de 48h.');
      qc.invalidateQueries({ queryKey: ['bot_downloaded_files'] });
    },
    onError: (err: any) => {
      toast.error(`Falha ao disparar robô no servidor: ${err.message || err}`);
    },
  });
}

/**
 * Exclui manualmente um arquivo do buffer
 */
export function useDeleteBotDownloadedFile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (fileId: string) => {
      const { error } = await supabase
        .from('bot_downloaded_files')
        .delete()
        .eq('id', fileId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Arquivo removido do buffer.');
      qc.invalidateQueries({ queryKey: ['bot_downloaded_files'] });
    },
    onError: (err: any) => {
      toast.error(`Erro ao excluir arquivo: ${err.message || err}`);
    },
  });
}
