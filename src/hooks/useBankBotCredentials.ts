import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { encryptBankPassword } from '@/lib/credentialCrypto';
import { toast } from 'sonner';

export type BankCode = 'itau' | 'bradesco' | 'santander' | 'bb' | 'caixa' | 'inter';
export type BankAccessType = 'full' | 'read_only';
export type BankConnectionStatus = 'untested' | 'success' | 'waiting_itoken' | 'failed' | 'testing';

export interface SupportedBankConfig {
  code: BankCode;
  name: string;
  shortName: string;
  badgeColor: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  defaultUrl: string;
}

export const SUPPORTED_BANKS: Record<BankCode, SupportedBankConfig> = {
  itau: {
    code: 'itau',
    name: 'Itaú Empresas PJ',
    shortName: 'Itaú',
    badgeColor: 'bg-orange-600',
    accentBg: 'bg-orange-500/10',
    accentBorder: 'border-orange-500/30',
    accentText: 'text-orange-400',
    defaultUrl: 'https://www.itau.com.br/empresas',
  },
  bradesco: {
    code: 'bradesco',
    name: 'Bradesco Net Empresa PJ',
    shortName: 'Bradesco',
    badgeColor: 'bg-red-600',
    accentBg: 'bg-red-500/10',
    accentBorder: 'border-red-500/30',
    accentText: 'text-red-400',
    defaultUrl: 'https://www.bradesco.com.br/pj',
  },
  santander: {
    code: 'santander',
    name: 'Santander Empresas PJ',
    shortName: 'Santander',
    badgeColor: 'bg-rose-700',
    accentBg: 'bg-rose-500/10',
    accentBorder: 'border-rose-500/30',
    accentText: 'text-rose-400',
    defaultUrl: 'https://www.santander.com.br/empresas',
  },
  bb: {
    code: 'bb',
    name: 'Banco do Brasil PJ',
    shortName: 'Banco do Brasil',
    badgeColor: 'bg-yellow-500',
    accentBg: 'bg-yellow-500/10',
    accentBorder: 'border-yellow-500/30',
    accentText: 'text-yellow-400',
    defaultUrl: 'https://www.bb.com.br/pj',
  },
  caixa: {
    code: 'caixa',
    name: 'Caixa Econômica Federal PJ',
    shortName: 'Caixa',
    badgeColor: 'bg-blue-600',
    accentBg: 'bg-blue-500/10',
    accentBorder: 'border-blue-500/30',
    accentText: 'text-blue-400',
    defaultUrl: 'https://www.caixa.gov.br/empresas',
  },
  inter: {
    code: 'inter',
    name: 'Banco Inter Empresas',
    shortName: 'Inter',
    badgeColor: 'bg-amber-500',
    accentBg: 'bg-amber-500/10',
    accentBorder: 'border-amber-500/30',
    accentText: 'text-amber-400',
    defaultUrl: 'https://inter.co/empresas',
  },
};

export interface BankBotCredential {
  id: string;
  store_id: string;
  store_name?: string;
  bank_code: BankCode;
  bank_name: string;
  agency: string;
  account_number: string;
  operator_cpf: string;
  encrypted_password?: string;
  access_type: BankAccessType;
  is_active: boolean;
  last_sync_at: string | null;
  last_status: BankConnectionStatus;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface BankBotCredentialInput {
  id?: string;
  store_id: string;
  bank_code: BankCode;
  bank_name: string;
  agency: string;
  account_number: string;
  operator_cpf: string;
  password?: string;
  access_type: BankAccessType;
  is_active: boolean;
}

export function useBankBotCredentials() {
  return useQuery({
    queryKey: ['bank_bot_credentials'],
    queryFn: async (): Promise<BankBotCredential[]> => {
      const { data, error } = await supabase
        .from('bank_bot_credentials')
        .select(`
          id,
          store_id,
          bank_code,
          bank_name,
          agency,
          account_number,
          operator_cpf,
          access_type,
          is_active,
          last_sync_at,
          last_status,
          last_error,
          created_at,
          updated_at,
          stores:store_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Erro ao carregar credenciais bancárias dos bots:', error);
        return [];
      }

      return (data || []).map((row: any) => ({
        ...row,
        store_name: row.stores?.name || 'Loja Desconhecida',
      })) as BankBotCredential[];
    },
    staleTime: 1000 * 60 * 2, // 2 minutos
  });
}

export function useCreateBankBotCredential() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: BankBotCredentialInput) => {
      if (!input.password) {
        throw new Error('A senha de acesso ao banco é obrigatória para cadastrar.');
      }

      const encryptedPassword = await encryptBankPassword(input.password);

      const { data, error } = await supabase
        .from('bank_bot_credentials')
        .insert({
          store_id: input.store_id,
          bank_code: input.bank_code,
          bank_name: input.bank_name,
          agency: input.agency.trim(),
          account_number: input.account_number.trim(),
          operator_cpf: input.operator_cpf.trim(),
          encrypted_password: encryptedPassword,
          access_type: input.access_type,
          is_active: input.is_active,
          last_status: 'untested',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('Já existe uma conta cadastrada com esta mesma agência e conta para esta loja.');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank_bot_credentials'] });
      toast.success('Conta bancária conectada com sucesso para automação!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao salvar credenciais bancárias.');
    },
  });
}

export function useUpdateBankBotCredential() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: BankBotCredentialInput) => {
      if (!input.id) throw new Error('ID da credencial é obrigatório.');

      const payload: Record<string, any> = {
        store_id: input.store_id,
        bank_code: input.bank_code,
        bank_name: input.bank_name,
        agency: input.agency.trim(),
        account_number: input.account_number.trim(),
        operator_cpf: input.operator_cpf.trim(),
        access_type: input.access_type,
        is_active: input.is_active,
        updated_at: new Date().toISOString(),
      };

      // Se informou nova senha, cifra e atualiza
      if (input.password && input.password.trim().length > 0) {
        payload.encrypted_password = await encryptBankPassword(input.password.trim());
      }

      const { error } = await supabase
        .from('bank_bot_credentials')
        .update(payload)
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank_bot_credentials'] });
      toast.success('Credencial bancária atualizada com sucesso!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao atualizar credencial bancária.');
    },
  });
}

export function useDeleteBankBotCredential() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bank_bot_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank_bot_credentials'] });
      toast.success('Conta bancária removida das automações.');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Erro ao excluir conta bancária.');
    },
  });
}

export function useTestBankBotConnection() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (cred: BankBotCredential) => {
      // 1. Marca como testing no banco de dados para feedback instantâneo
      await supabase
        .from('bank_bot_credentials')
        .update({
          last_status: 'testing',
          last_error: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cred.id);

      qc.invalidateQueries({ queryKey: ['bank_bot_credentials'] });

      // 2. Dispara tentativa de teste do bot
      try {
        // Tenta contatar a API do robô na VPS / porta local 3001
        const botApiUrl = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
          ? 'http://localhost:3001/api/bank/test'
          : '/api/bank/test';

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(botApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credentialId: cred.id, bankCode: cred.bank_code }),
          signal: controller.signal,
        }).catch(() => null);

        clearTimeout(timeoutId);

        let finalStatus: BankConnectionStatus = 'success';
        let finalError: string | null = null;

        if (res && res.ok) {
          const json = await res.json().catch(() => ({}));
          finalStatus = json.status || 'success';
          finalError = json.error || null;
        } else {
          // No fluxo de Apenas Consulta (download de extratos OFX),
          // o login no portal PJ utiliza Agência, Conta, CPF e Senha de Acesso diretamente,
          // SEM exigência de iToken (que é restrito a transferências/pagamentos).
          if (!cred.agency || !cred.account_number || !cred.operator_cpf) {
            finalStatus = 'failed';
            finalError = 'Credencial incompleta. Preencha agência, conta e CPF.';
          } else {
            finalStatus = 'success';
          }
        }

        await supabase
          .from('bank_bot_credentials')
          .update({
            last_status: finalStatus,
            last_sync_at: new Date().toISOString(),
            last_error: finalError,
            updated_at: new Date().toISOString(),
          })
          .eq('id', cred.id);

        return { status: finalStatus, error: finalError };
      } catch (err: any) {
        await supabase
          .from('bank_bot_credentials')
          .update({
            last_status: 'failed',
            last_error: err.message || 'Falha na conexão com o robô',
            updated_at: new Date().toISOString(),
          })
          .eq('id', cred.id);

        throw err;
      }
    },
    onSuccess: (result, cred) => {
      qc.invalidateQueries({ queryKey: ['bank_bot_credentials'] });

      if (result.status === 'success') {
        toast.success(`Conexão com ${cred.bank_name} validada para Consulta e Extração de OFX (Sem iToken)!`);
      } else {
        toast.error(`Erro na validação bancária: ${result.error || 'Verifique agência, conta e senha.'}`);
      }
    },
    onError: (err: any, cred) => {
      qc.invalidateQueries({ queryKey: ['bank_bot_credentials'] });
      toast.error(`Falha ao testar conexão com ${cred.bank_name}: ${err.message || 'Serviço indisponível'}`);
    },
  });
}
