import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, Link2, FileText, CheckCircle2, AlertCircle, CreditCard, Banknote, Sparkles, PlusCircle, Building2, User, Car, DollarSign } from 'lucide-react';
import { useAvailableStoreOs, useManualMatch, StoreOsCandidate } from '@/hooks/useManualMatch';
import { useStores } from '@/hooks/useStores';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';

export interface ManualMatchTransaction {
  id: string;
  title?: string;
  counterpart_name?: string;
  amount: number;
  occurred_at?: string;
  store_id?: string;
  source?: 'ofx' | 'rede' | 'maquininha';
  payment_method?: string;
  nsu?: string;
  authorization?: string;
}

interface ManualMatchOsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: ManualMatchTransaction | null;
  storeId: string;
  targetDate: string;
  stores?: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

function checkNameMatch(txCounterpart: string = '', txTitle: string = '', clientName: string = ''): { isNameMatch: boolean; matchedWords: string[] } {
  if (!clientName || clientName.toLowerCase().trim() === 'cliente') return { isNameMatch: false, matchedWords: [] };
  
  const normalize = (str: string) => str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9 ]/g, ' ').trim();
  const txCombined = normalize((txCounterpart || '') + ' ' + (txTitle || ''));
  const txWords = txCombined.split(/\s+/).filter(w => w.length >= 3 && !['pix', 'ted', 'doc', 'transf', 'transferencia', 'deposito', 'entrada', 'saida', 'banco', 'ltda', 'eireli', 'me', 'cartao', 'rede', 'mastercard', 'visa', 'elo'].includes(w));
  const clientWords = normalize(clientName).split(/\s+/).filter(w => w.length >= 3 && !['ltda', 'eireli', 'me', 'cliente'].includes(w));
  
  const matched = clientWords.filter(cw => txWords.some(tw => tw === cw || (cw.length >= 4 && (tw.includes(cw) || cw.includes(tw)))));
  const isNameMatch = matched.length >= 2 || (matched.length === 1 && matched[0].length >= 5);
  return { isNameMatch, matchedWords: matched };
}

export function ManualMatchOsModal({
  isOpen,
  onClose,
  transaction,
  storeId,
  targetDate,
  stores: propStores,
  onSuccess
}: ManualMatchOsModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'create'>('search');
  const [search, setSearch] = useState('');
  
  const isRede = transaction?.source === 'rede' || transaction?.source === 'maquininha';
  const matchType = isRede ? 'rede' : 'pix';
  const txAmount = transaction ? Math.abs(transaction.amount) : 0;

  // Lojas para seleção
  const { data: hookStores = [] } = useStores();
  const availableStores = propStores && propStores.length > 0 ? propStores : hookStores;

  // Form states para criação de nova OS
  const [createStoreId, setCreateStoreId] = useState(storeId);
  const [createOsNumber, setCreateOsNumber] = useState('');
  const [createClientName, setCreateClientName] = useState('');
  const [createPlate, setCreatePlate] = useState('');
  const [isPartial, setIsPartial] = useState(false);
  const [createTotalValue, setCreateTotalValue] = useState<string>(String(txAmount));
  const [createPaymentMethod, setCreatePaymentMethod] = useState<string>('PIX');

  useEffect(() => {
    if (transaction) {
      setCreateStoreId(transaction.store_id || storeId);
      setCreateClientName(transaction.counterpart_name || '');
      setCreateTotalValue(String(Math.abs(transaction.amount)));
      setIsPartial(false);
      setCreatePlate('');
      setCreateOsNumber('');
      if (isRede) {
        const pm = (transaction.payment_method || '').toUpperCase();
        setCreatePaymentMethod(pm.includes('DEB') ? 'DEBITO' : 'CREDITO');
      } else {
        setCreatePaymentMethod('PIX');
      }
    }
  }, [transaction, storeId, isRede]);

  const { data: osCandidates = [], isLoading } = useAvailableStoreOs(createStoreId || storeId, targetDate, matchType);
  const { linkTransactionToOs, createAndLinkOs, loading: linking } = useManualMatch();

  const sortedAndDeduplicatedCandidates = useMemo(() => {
    if (!transaction) return [];

    const uniqueMap = new Map<string, StoreOsCandidate>();

    osCandidates.forEach((os) => {
      const num = String(os.os_number || '').trim();
      if (num && !uniqueMap.has(num)) {
        uniqueMap.set(num, os);
      }
    });

    let list = Array.from(uniqueMap.values());

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (os) =>
          os.os_number.toLowerCase().includes(q) ||
          os.client_name.toLowerCase().includes(q) ||
          os.plate.toLowerCase().includes(q) ||
          os.payment_method.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => {
      const nameMatchA = checkNameMatch(transaction.counterpart_name, transaction.title, a.client_name);
      const nameMatchB = checkNameMatch(transaction.counterpart_name, transaction.title, b.client_name);

      let valA = 0;
      let valB = 0;

      if (isRede) {
        valA = (a.credit_value || 0) > 0 ? (a.credit_value || 0) : ((a.debit_value || 0) > 0 ? (a.debit_value || 0) : Math.max(0, a.total_value - a.paid_value));
        valB = (b.credit_value || 0) > 0 ? (b.credit_value || 0) : ((b.debit_value || 0) > 0 ? (b.debit_value || 0) : Math.max(0, b.total_value - b.paid_value));
      } else {
        valA = a.pix_transfer_value > 0 ? a.pix_transfer_value : Math.max(0, a.total_value - a.paid_value);
        valB = b.pix_transfer_value > 0 ? b.pix_transfer_value : Math.max(0, b.total_value - b.paid_value);
      }

      if (valA === 0) valA = a.total_value;
      if (valB === 0) valB = b.total_value;

      const diffA = Math.abs(valA - txAmount);
      const diffB = Math.abs(valB - txAmount);
      const exactA = diffA < 0.05;
      const exactB = diffB < 0.05;

      const scoreA = (nameMatchA.isNameMatch && exactA) ? 100 : (nameMatchA.isNameMatch ? 80 : (exactA ? 60 : 0));
      const scoreB = (nameMatchB.isNameMatch && exactB) ? 100 : (nameMatchB.isNameMatch ? 80 : (exactB ? 60 : 0));

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      return diffA - diffB;
    });
  }, [osCandidates, search, transaction, isRede, txAmount]);

  if (!transaction) return null;

  const handleLink = async (os: StoreOsCandidate) => {
    try {
      const src = isRede ? 'rede' : 'ofx';
      const res = await linkTransactionToOs(transaction.id, os.os_number, createStoreId || storeId, src, txAmount);
      if (res.success) {
        toast.success(`Transação vinculada com sucesso à OS #${os.os_number}!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error('Falha ao vincular: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Erro ao vincular: ' + (err.message || err));
    }
  };

  const handleCreateAndLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createOsNumber.trim()) {
      toast.error('Informe o número da Ordem de Serviço.');
      return;
    }
    const totalVal = isPartial ? Number(createTotalValue) : txAmount;
    if (isNaN(totalVal) || totalVal <= 0) {
      toast.error('Informe um valor total válido para a OS.');
      return;
    }
    if (totalVal < txAmount - 0.05) {
      toast.error('O valor total da OS não pode ser menor que o valor do pagamento.');
      return;
    }

    try {
      const src = isRede ? 'rede' : 'ofx';
      const res = await createAndLinkOs({
        transactionType: src,
        transactionId: transaction.id,
        storeId: createStoreId || storeId,
        osNumber: createOsNumber.trim(),
        clientName: createClientName.trim() || undefined,
        plate: createPlate.trim().toUpperCase() || undefined,
        totalValue: totalVal,
        paymentMethod: createPaymentMethod,
        linkAmount: txAmount
      });

      if (res.success) {
        toast.success(`🎉 OS #${createOsNumber.trim()} criada e pagamento de R$ ${txAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vinculado com sucesso!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error('Falha ao criar/vincular: ' + res.error);
      }
    } catch (err: any) {
      toast.error('Erro ao criar/vincular: ' + (err.message || err));
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isRede ? 'Vincular Venda de Cartão (REDE) à Ordem de Serviço' : 'Vincular Transação Bancária (PIX) à Ordem de Serviço'}
      size='2xl'
    >
      <div className='space-y-5'>
        {/* Card Resumo do Lançamento */}
        <div className='p-4 bg-zinc-950/80 border border-zinc-800 rounded-xl space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] uppercase font-bold text-zinc-400 tracking-wider flex items-center gap-1.5'>
              {isRede ? (
                <>
                  <CreditCard size={13} className='text-amber-400' />
                  Venda de Cartão Selecionada (REDE)
                </>
              ) : (
                <>
                  <Banknote size={13} className='text-emerald-400' />
                  Transação Bancária Selecionada (OFX / PIX)
                </>
              )}
            </span>
            <Badge variant='outline' className='text-xs font-mono text-emerald-400 border-emerald-500/30 bg-emerald-500/10'>
              {transaction.occurred_at ? new Date(transaction.occurred_at).toLocaleDateString('pt-BR') : targetDate}
            </Badge>
          </div>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <p className='font-semibold text-sm text-zinc-100'>
                {transaction.title || (isRede ? 'Venda de Cartão na Maquininha' : 'Depósito Bancário / PIX')}
              </p>
              {transaction.counterpart_name && (
                <p className='text-xs text-zinc-400 font-mono'>
                  Contraparte: {transaction.counterpart_name}
                </p>
              )}
              {isRede && (transaction.nsu || transaction.authorization || transaction.payment_method) && (
                <p className='text-[11px] text-zinc-500 font-mono mt-0.5'>
                  {transaction.payment_method && <span className='mr-2'>Modalidade: {transaction.payment_method}</span>}
                  {transaction.nsu && <span className='mr-2'>NSU: {transaction.nsu}</span>}
                  {transaction.authorization && <span>Aut: {transaction.authorization}</span>}
                </p>
              )}
            </div>
            <div className='text-right shrink-0'>
              <span className='text-xs text-zinc-400 block uppercase'>Valor {isRede ? 'Líquido' : 'Depositado'}</span>
              <span className='text-xl font-bold font-mono text-emerald-400'>
                R$ {txAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Abas de Navegação: Buscar Existente vs Criar Nova */}
        <div className='flex items-center gap-2 p-1 bg-zinc-950 border border-zinc-800 rounded-xl'>
          <button
            type='button'
            onClick={() => setActiveTab('search')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-zinc-800 text-white shadow-sm shadow-black/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Search size={14} />
            🔍 Vincular à OS Existente ({sortedAndDeduplicatedCandidates.length})
          </button>
          <button
            type='button'
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-emerald-500 text-zinc-950 shadow-sm shadow-emerald-950/40'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PlusCircle size={14} />
            ➕ Criar Nova OS na Filial
          </button>
        </div>

        {/* ABA 1: BUSCAR E VINCULAR OS EXISTENTE */}
        {activeTab === 'search' && (
          <div className='space-y-4'>
            <div className='relative'>
              <Search size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500' />
              <input
                type='text'
                placeholder='Buscar por Nº da OS, Nome do Cliente, Placa ou Forma de Pagamento...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors'
              />
            </div>

            <div className='border border-zinc-800 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-zinc-950/40'>
              {isLoading ? (
                <div className='p-8 flex justify-center'>
                  <LoadingSpinner text='Carregando OSs da filial...' />
                </div>
              ) : sortedAndDeduplicatedCandidates.length === 0 ? (
                <div className='p-8 text-center text-zinc-400 text-xs'>
                  <AlertCircle size={24} className='mx-auto mb-2 text-zinc-500' />
                  <p className='font-bold text-zinc-200'>Nenhuma OS pendente encontrada para esta filial.</p>
                  <p className='text-zinc-500 mt-1'>Clique na aba <strong>"➕ Criar Nova OS na Filial"</strong> para cadastrar e vincular na hora.</p>
                </div>
              ) : (
                <table className='w-full text-xs'>
                  <thead className='bg-zinc-900 border-b border-zinc-800 text-zinc-400 uppercase font-mono text-[10px]'>
                    <tr>
                      <th className='py-2.5 px-3 text-left'>OS #</th>
                      <th className='py-2.5 px-3 text-left'>Cliente / Placa</th>
                      <th className='py-2.5 px-3 text-left'>Pagamento</th>
                      <th className='py-2.5 px-3 text-right'>Valor / Saldo</th>
                      <th className='py-2.5 px-3 text-center'>Match</th>
                      <th className='py-2.5 px-3 text-right'>Ação</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-zinc-800/60 font-sans'>
                    {sortedAndDeduplicatedCandidates.map((os) => {
                      let osVal = 0;
                      if (isRede) {
                        osVal = (os.credit_value || 0) > 0 ? (os.credit_value || 0) : ((os.debit_value || 0) > 0 ? (os.debit_value || 0) : Math.max(0, os.total_value - os.paid_value));
                      } else {
                        osVal = os.pix_transfer_value > 0 ? os.pix_transfer_value : Math.max(0, os.total_value - os.paid_value);
                      }
                      if (osVal === 0) osVal = os.total_value;

                      const diff = Math.abs(osVal - txAmount);
                      const isExact = diff < 0.05;
                      const nameMatch = checkNameMatch(transaction.counterpart_name, transaction.title, os.client_name);
                      const isHighPriority = (nameMatch.isNameMatch && isExact) || nameMatch.isNameMatch;

                      return (
                        <tr
                          key={os.os_number}
                          className={`transition-colors ${
                            isHighPriority
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-l-2 border-emerald-400'
                              : isExact
                              ? 'bg-blue-500/10 hover:bg-blue-500/15 border-l-2 border-blue-400'
                              : 'hover:bg-zinc-900/40'
                          }`}
                        >
                          <td className='py-2.5 px-3 font-mono font-bold text-zinc-100'>
                            <div className='flex items-center gap-1.5'>
                              <FileText size={13} className='shrink-0 text-emerald-400' />
                              <span>OS #{os.os_number}</span>
                            </div>
                          </td>
                          <td className='py-2.5 px-3 text-zinc-300'>
                            <div className='flex flex-col'>
                              <span className={`font-semibold truncate max-w-[180px] ${nameMatch.isNameMatch ? 'text-emerald-300' : 'text-zinc-200'}`}>
                                {os.client_name || 'Cliente'}
                              </span>
                              {os.plate && (
                                <span className='text-[10px] text-zinc-500 font-mono'>
                                  Placa: {os.plate}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className='py-2.5 px-3 text-zinc-400 font-mono'>
                            <span className='px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px]'>
                              {os.payment_method || (isRede ? 'CARTAO' : 'PIX')}
                            </span>
                          </td>
                          <td className='py-2.5 px-3 text-right font-mono font-bold text-zinc-100'>
                            R$ {osVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className='py-2.5 px-3 text-center font-mono'>
                            {nameMatch.isNameMatch && isExact ? (
                              <Badge variant='success' className='bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold'>
                                <Sparkles size={10} className='mr-1 text-emerald-400' /> Match Nome + Valor
                              </Badge>
                            ) : nameMatch.isNameMatch ? (
                              <Badge variant='outline' className='bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold'>
                                <Sparkles size={10} className='mr-1 text-emerald-400' /> Match por Nome
                              </Badge>
                            ) : isExact ? (
                              <Badge variant='success' className='bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-bold'>
                                <CheckCircle2 size={10} className='mr-1' /> Match por Valor
                              </Badge>
                            ) : (
                              <span className='text-[10px] text-amber-400 font-medium'>
                                ± R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                          <td className='py-2.5 px-3 text-right'>
                            <Button
                              size='sm'
                              disabled={linking}
                              onClick={() => handleLink(os)}
                              className={`h-7 px-3 text-xs font-semibold gap-1 shrink-0 cursor-pointer ${
                                isHighPriority
                                  ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-500/20 font-bold'
                                  : isExact
                                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20'
                                  : 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
                              }`}
                            >
                              <Link2 size={12} />
                              Vincular
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ABA 2: CRIAR NOVA OS E VINCULAR */}
        {activeTab === 'create' && (
          <form onSubmit={handleCreateAndLink} className='space-y-4 bg-zinc-950 p-4 border border-zinc-800 rounded-xl'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {/* Filial */}
              <div>
                <label className='block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <Building2 size={13} className='text-emerald-400' /> Filial / Loja
                </label>
                <select
                  value={createStoreId}
                  onChange={(e) => setCreateStoreId(e.target.value)}
                  className='w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500'
                >
                  {availableStores.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Número da OS */}
              <div>
                <label className='block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <FileText size={13} className='text-emerald-400' /> Número da OS *
                </label>
                <input
                  type='text'
                  required
                  placeholder='Ex: 1892, 5021'
                  value={createOsNumber}
                  onChange={(e) => setCreateOsNumber(e.target.value)}
                  className='w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500'
                />
              </div>

              {/* Nome do Cliente */}
              <div>
                <label className='block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <User size={13} className='text-emerald-400' /> Nome do Cliente
                </label>
                <input
                  type='text'
                  placeholder='Nome completo ou razão social'
                  value={createClientName}
                  onChange={(e) => setCreateClientName(e.target.value)}
                  className='w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500'
                />
              </div>

              {/* Placa do Veículo */}
              <div>
                <label className='block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <Car size={13} className='text-emerald-400' /> Placa do Veículo (Opcional)
                </label>
                <input
                  type='text'
                  placeholder='Ex: ABC-1234'
                  value={createPlate}
                  onChange={(e) => setCreatePlate(e.target.value.toUpperCase())}
                  className='w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500'
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className='block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <CreditCard size={13} className='text-emerald-400' /> Forma de Pagamento
                </label>
                <select
                  value={createPaymentMethod}
                  onChange={(e) => setCreatePaymentMethod(e.target.value)}
                  className='w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-emerald-500'
                >
                  <option value='PIX'>PIX / Transferência</option>
                  <option value='CREDITO'>Cartão de Crédito</option>
                  <option value='DEBITO'>Cartão de Débito</option>
                  <option value='DINHEIRO'>Dinheiro Físico</option>
                </select>
              </div>

              {/* Opção Parcial / Integral */}
              <div>
                <label className='block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <DollarSign size={13} className='text-emerald-400' /> Tipo de Liquidação
                </label>
                <div className='flex items-center gap-3 pt-1'>
                  <label className='flex items-center gap-2 text-xs text-zinc-300 cursor-pointer'>
                    <input
                      type='radio'
                      name='liquidationType'
                      checked={!isPartial}
                      onChange={() => setIsPartial(false)}
                      className='text-emerald-500 focus:ring-emerald-500'
                    />
                    Integral (100% Pago)
                  </label>
                  <label className='flex items-center gap-2 text-xs text-zinc-300 cursor-pointer'>
                    <input
                      type='radio'
                      name='liquidationType'
                      checked={isPartial}
                      onChange={() => setIsPartial(true)}
                      className='text-emerald-500 focus:ring-emerald-500'
                    />
                    Parcial (Valor Total Maior)
                  </label>
                </div>
              </div>
            </div>

            {/* Input de Valor Total quando Parcial */}
            {isPartial && (
              <div className='p-3 bg-zinc-900 border border-amber-500/30 rounded-xl space-y-1.5'>
                <label className='block text-[11px] font-bold text-amber-400 uppercase tracking-wider'>
                  Valor Total Real da OS (R$) *
                </label>
                <input
                  type='number'
                  step='0.01'
                  required
                  placeholder='Informe o valor total do serviço (ex: 1500.00)'
                  value={createTotalValue}
                  onChange={(e) => setCreateTotalValue(e.target.value)}
                  className='w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500'
                />
                <p className='text-[10px] text-zinc-400'>
                  O pagamento de <strong>R$ {txAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> será abatido, deixando um saldo remanescente de <strong>R$ {Math.max(0, Number(createTotalValue || 0) - txAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em aberto no pátio.
                </p>
              </div>
            )}

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='submit'
                disabled={linking}
                className='py-2 px-5 text-xs font-bold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-md shadow-emerald-950/50 flex items-center gap-2 cursor-pointer transition-all'
              >
                {linking ? <LoadingSpinner text='Criando e vinculando...' /> : (
                  <>
                    <PlusCircle size={14} />
                    Criar OS e Vincular Pagamento
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* Aviso Contábil */}
        <div className='p-3 bg-zinc-950/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-400 flex items-start gap-2'>
          <Banknote size={16} className='text-emerald-400 shrink-0 mt-0.5' />
          <span>
            <strong>Garantia Contábil:</strong> Ao vincular o lançamento a uma OS (existente ou nova), o valor pago é amortizado na forma de pagamento correta ({isRede ? 'Cartão' : 'PIX'}), o saldo de pátio é recalculado e a pendência é baixada sem gerar duplicidade no Faturamento.
          </span>
        </div>

        <div className='flex justify-end pt-1'>
          <Button variant='outline' onClick={onClose} className='border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
