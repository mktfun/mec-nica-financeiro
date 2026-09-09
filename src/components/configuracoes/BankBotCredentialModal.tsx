import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useStores } from '@/hooks/useStores';
import {
  BankBotCredential,
  BankCode,
  BankAccessType,
  SUPPORTED_BANKS,
  useCreateBankBotCredential,
  useUpdateBankBotCredential,
} from '@/hooks/useBankBotCredentials';
import { formatCpf, formatAgency, formatAccount } from '@/lib/credentialCrypto';
import { Landmark, Shield, Eye, EyeOff, Building2, KeyRound, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BankBotCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentialToEdit?: BankBotCredential | null;
}

export function BankBotCredentialModal({
  isOpen,
  onClose,
  credentialToEdit,
}: BankBotCredentialModalProps) {
  const { data: stores = [], isLoading: loadingStores } = useStores();
  const createMutation = useCreateBankBotCredential();
  const updateMutation = useUpdateBankBotCredential();

  const isEditing = !!credentialToEdit;

  const [bankCode, setBankCode] = useState<BankCode>('itau');
  const [storeId, setStoreId] = useState<string>('');
  const [agency, setAgency] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [operatorCpf, setOperatorCpf] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [accessType, setAccessType] = useState<BankAccessType>('full');
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializa o formulário com dados da credencial ou padrões
  useEffect(() => {
    if (credentialToEdit) {
      setBankCode(credentialToEdit.bank_code);
      setStoreId(credentialToEdit.store_id);
      setAgency(credentialToEdit.agency);
      setAccountNumber(credentialToEdit.account_number);
      setOperatorCpf(formatCpf(credentialToEdit.operator_cpf));
      setPassword(''); // Nunca pré-preenche senha por segurança
      setAccessType(credentialToEdit.access_type);
      setIsActive(credentialToEdit.is_active);
    } else {
      setBankCode('itau');
      setStoreId(stores[0]?.id || '');
      setAgency('');
      setAccountNumber('');
      setOperatorCpf('');
      setPassword('');
      setAccessType('full');
      setIsActive(true);
    }
    setShowPassword(false);
  }, [credentialToEdit, isOpen, stores]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!storeId) {
      toast.error('Por favor, selecione a loja vinculada.');
      return;
    }
    if (!agency.trim()) {
      toast.error('Informe o número da agência bancária.');
      return;
    }
    if (!accountNumber.trim()) {
      toast.error('Informe o número da conta corrente.');
      return;
    }
    if (!operatorCpf.trim() || operatorCpf.replace(/\D/g, '').length < 11) {
      toast.error('Informe um CPF válido com 11 dígitos.');
      return;
    }
    if (!isEditing && !password.trim()) {
      toast.error('A senha eletrônica é obrigatória no cadastro da conta.');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedBank = SUPPORTED_BANKS[bankCode];

      if (isEditing && credentialToEdit) {
        await updateMutation.mutateAsync({
          id: credentialToEdit.id,
          store_id: storeId,
          bank_code: bankCode,
          bank_name: selectedBank.name,
          agency: agency.trim(),
          account_number: accountNumber.trim(),
          operator_cpf: operatorCpf.trim(),
          password: password.trim() || undefined,
          access_type: accessType,
          is_active: isActive,
        });
      } else {
        await createMutation.mutateAsync({
          store_id: storeId,
          bank_code: bankCode,
          bank_name: selectedBank.name,
          agency: agency.trim(),
          account_number: accountNumber.trim(),
          operator_cpf: operatorCpf.trim(),
          password: password.trim(),
          access_type: accessType,
          is_active: isActive,
        });
      }

      onClose();
    } catch (err: any) {
      // Erros já tratados com toast no hook
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBankConfig = SUPPORTED_BANKS[bankCode];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Credenciais da Conta Bancária' : 'Conectar Nova Conta Bancária para Robôs'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Banner Informativo */}
        <div className="flex items-start gap-3 p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-xl">
          <Shield size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs text-zinc-300 leading-relaxed">
            <p className="font-semibold text-zinc-100">Armazenamento Criptografado de Alta Segurança</p>
            <p className="text-zinc-400 mt-0.5">
              As credenciais cadastradas são protegidas por criptografia AES-GCM e consumidas de forma segura pelo robô do Playwright para extração autônoma de extratos OFX.
            </p>
          </div>
        </div>

        {/* Linha 1: Banco e Loja */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Banco */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Instituição Bancária <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <select
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value as BankCode)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer"
              >
                {Object.values(SUPPORTED_BANKS).map((bank) => (
                  <option key={bank.code} value={bank.code} className="bg-zinc-900 text-zinc-100">
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Loja Vinculada */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Filial Vinculada <span className="text-rose-400">*</span>
            </label>
            <select
              value={storeId}
              onChange={(e) => setStoreId(e.target.value)}
              disabled={loadingStores}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors cursor-pointer disabled:opacity-50"
            >
              <option value="" disabled>Selecione uma filial...</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id} className="bg-zinc-900 text-zinc-100">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Linha 2: Agência e Conta Corrente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Agência */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Agência (4 a 5 dígitos) <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: 0263"
              value={agency}
              onChange={(e) => setAgency(formatAgency(e.target.value))}
              maxLength={5}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder:text-zinc-600"
            />
          </div>

          {/* Conta Corrente */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Conta Corrente com Dígito <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: 81153-1"
              value={accountNumber}
              onChange={(e) => setAccountNumber(formatAccount(e.target.value))}
              maxLength={15}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Linha 3: CPF do Operador e Senha */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* CPF do Operador */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              CPF do Operador Autorizado <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              placeholder="000.000.000-00"
              value={operatorCpf}
              onChange={(e) => setOperatorCpf(formatCpf(e.target.value))}
              maxLength={14}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder:text-zinc-600"
            />
            <p className="text-[10px] text-zinc-500 mt-1">CPF cadastrado como operador no Internet Banking PJ.</p>
          </div>

          {/* Senha Eletrônica / Teclado Virtual */}
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Senha de Acesso / Teclado Virtual {!isEditing && <span className="text-rose-400">*</span>}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={isEditing ? '•••••••• (manter senha atual)' : 'Senha de 6 a 8 dígitos'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 pr-10 text-sm text-zinc-100 font-mono focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/30 transition-colors placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-200 transition-colors p-1"
                title={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              {isEditing ? 'Deixe em branco para não alterar a senha salva.' : 'Senha digitada no teclado virtual do banco.'}
            </p>
          </div>
        </div>

        {/* Linha 4: Tipo de Acesso e Status Ativo */}
        <div className="pt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
              Tipo de Permissão do Robô
            </span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
                <input
                  type="radio"
                  name="access_type"
                  value="full"
                  checked={accessType === 'full'}
                  onChange={() => setAccessType('full')}
                  className="accent-emerald-500"
                />
                <span>Acesso Completo (Extratos + Saldos)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                <input
                  type="radio"
                  name="access_type"
                  value="read_only"
                  checked={accessType === 'read_only'}
                  onChange={() => setAccessType('read_only')}
                  className="accent-emerald-500"
                />
                <span>Apenas Consulta</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-zinc-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-0 cursor-pointer accent-emerald-500"
            />
            <span className="font-medium">Habilitado para Extração Diária (07:00)</span>
          </label>
        </div>

        {/* Rodapé do Formulário */}
        <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>

          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
          >
            {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Conta' : 'Conectar Conta Bancária'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
