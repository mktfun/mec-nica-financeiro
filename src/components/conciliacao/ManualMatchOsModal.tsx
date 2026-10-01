import React, { useState, useMemo, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Search, Link2, FileText, CheckCircle2, AlertCircle, CreditCard, Banknote, Sparkles, PlusCircle, Building2, User, Car, DollarSign } from 'lucide-react';
import { useAvailableStoreOs, useManualMatch, StoreOsCandidate } from '@/hooks/useManualMatch';
import { useStores } from '@/hooks/useStores';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'sonner';
import { clientLog } from '@/lib/logger';

export interface ManualMatchTransaction {
  id: string;
  title?: string;
  counterpart_name?: string;
  amount: number;
  gross_amount?: number;
  fee_amount?: number;
  net_amount?: number;
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
  const [showHistorical, setShowHistorical] = useState(false);
  
  const isRede = transaction?.source === 'rede' || transaction?.source === 'maquininha';
  const matchType = isRede ? 'rede' : 'pix';
  const txAmount = transaction ? Math.abs(transaction.amount) : 0;
  const grossAmount = transaction?.gross_amount ?? txAmount;
  const feeAmount = transaction?.fee_amount ?? 0;
  const netAmount = transaction?.net_amount ?? (grossAmount - feeAmount);

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
      setShowHistorical(false);
      if (isRede) {
        const pm = (transaction.payment_method || '').toUpperCase();
        setCreatePaymentMethod(pm.includes('DEB') ? 'DEBITO' : 'CREDITO');
      } else {
        setCreatePaymentMethod('PIX');
      }
    }
  }, [transaction, storeId, isRede]);

  const [exceptionalCandidate, setExceptionalCandidate] = useState<StoreOsCandidate | null>(null);

  const { data: osCandidates = [], isLoading, isError, error, refetch } = useAvailableStoreOs(
    createStoreId || storeId, 
    targetDate, 
    matchType,
    transaction?.id,
    showHistorical
  );
  const { linkTransactionToOs, createAndLinkOs, settleOsWithCash, loading: linking } = useManualMatch();

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
          os.payment_method.toLowerCase().includes(q) ||
          (os.reason_code && os.reason_code.toLowerCase().includes(q))
      );
    }

    return list.sort((a, b) => {
      // Prioridade máxima por candidate_status se vier do motor canônico da Spec 444 / Spec 461
      const statusWeight: Record<string, number> = {
        eligible: 100,
        collision: 80,
        identity_mismatch: 70,
        modality_mismatch: 60,
        divergent_value: 40,
        already_consumed: 20,
        no_card_delta: 10,
        historical_no_delta: 0
      };

      const weightA = a.candidate_status ? (statusWeight[a.candidate_status] ?? 30) : 50;
      const weightB = b.candidate_status ? (statusWeight[b.candidate_status] ?? 30) : 50;

      if (weightA !== weightB) {
        return weightB - weightA;
      }

      const nameMatchA = checkNameMatch(transaction.counterpart_name, transaction.title, a.client_name);
      const nameMatchB = checkNameMatch(transaction.counterpart_name, transaction.title, b.client_name);

      const valA = isRede 
        ? (a.available_card_amount ?? 0) 
        : (a.pix_transfer_value > 0 ? a.pix_transfer_value : Math.max(0, a.total_value - a.paid_value));
      const valB = isRede 
        ? (b.available_card_amount ?? 0) 
        : (b.pix_transfer_value > 0 ? b.pix_transfer_value : Math.max(0, b.total_value - b.paid_value));

      const diffA = Math.abs(valA - txAmount);
      const diffB = Math.abs(valB - txAmount);
      const exactA = valA > 0.05 && diffA < 0.05;
      const exactB = valB > 0.05 && diffB < 0.05;

      const scoreA = (nameMatchA.isNameMatch && exactA) ? 100 : (nameMatchA.isNameMatch ? 80 : (exactA ? 60 : 0));
      const scoreB = (nameMatchB.isNameMatch && exactB) ? 100 : (nameMatchB.isNameMatch ? 80 : (exactB ? 60 : 0));

      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      const hasOpenA = ((a.open_balance > 0.05) || ((a.total_value - a.paid_value) > 0.05));
      const hasOpenB = ((b.open_balance > 0.05) || ((b.total_value - b.paid_value) > 0.05));
      if (hasOpenA !== hasOpenB) {
        return hasOpenA ? -1 : 1;
      }

      return diffA - diffB;
    });
  }, [osCandidates, search, transaction, isRede, txAmount]);

  // Log de diagnóstico da avaliação de candidatos ao abrir o modal
  useEffect(() => {
    if (isOpen && transaction && osCandidates.length > 0) {
      const eligible = osCandidates.filter(c => c.candidate_status === 'eligible').length;
      const collisions = osCandidates.filter(c => c.candidate_status === 'collision').length;
      const mismatches = osCandidates.filter(c => c.candidate_status === 'modality_mismatch').length;
      clientLog({
        type: 'match.evaluate',
        action: 'modal.candidates_evaluated',
        data: {
          pos_id: transaction.id,
          store_id: storeId,
          target_date: targetDate,
          total_candidates: osCandidates.length,
          eligible_count: eligible,
          collision_count: collisions,
          modality_mismatch_count: mismatches
        }
      });
    }
  }, [isOpen, transaction?.id, osCandidates.length]);

  if (!transaction) return null;

  const handleLink = async (os: StoreOsCandidate) => {
    const t0 = performance.now();
    clientLog({
      type: 'action.start',
      action: 'modal.link_os',
      data: {
        pos_id: transaction.id,
        os_number: os.os_number,
        amount: txAmount,
        source: isRede ? 'rede' : 'ofx',
        candidate_status: os.candidate_status
      }
    });

    try {
      const src = isRede ? 'rede' : 'ofx';
      const res = await linkTransactionToOs(transaction.id, os.os_number, createStoreId || storeId, src, txAmount);
      const duration = Math.round(performance.now() - t0);

      if (res.success) {
        clientLog({
          type: 'action.success',
          action: 'modal.link_os',
          duration_ms: duration,
          data: {
            pos_id: transaction.id,
            os_number: os.os_number,
            accounting_effect: res.data?.accounting_effect
          }
        });

        const effect = res.data?.accounting_effect;
        if (effect === 'baixa_aplicada') {
          toast.success(`Baixa de R$ ${Number(txAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aplicada à OS #${os.os_number}! Pátio recalculado.`);
        } else if (effect === 'vinculo_informativo_sem_baixa') {
          toast.info(`OS #${os.os_number} vinculada para conciliação (pagamento já constava na OS).`);
        } else {
          toast.success(`Transação vinculada com sucesso à OS #${os.os_number}!`);
        }
        if (onSuccess) onSuccess();
        onClose();
      } else {
        clientLog({
          type: 'action.error',
          action: 'modal.link_os',
          duration_ms: duration,
          data: {
            pos_id: transaction.id,
            os_number: os.os_number,
            error: res.error
          }
        });
        toast.error('Falha ao vincular: ' + res.error);
      }
    } catch (err: any) {
      clientLog({
        type: 'action.error',
        action: 'modal.link_os',
        duration_ms: Math.round(performance.now() - t0),
        data: {
          pos_id: transaction.id,
          os_number: os.os_number,
          error: err.message || String(err)
        }
      });
      toast.error('Erro ao vincular: ' + (err.message || err));
    }
  };

  const handleSettleCash = async (os: StoreOsCandidate) => {
    const t0 = performance.now();
    clientLog({
      type: 'action.start',
      action: 'modal.settle_cash',
      data: {
        os_number: os.os_number,
        store_id: createStoreId || storeId,
        amount: txAmount
      }
    });

    try {
      const openVal = Math.max(0, os.open_balance || (os.total_value - os.paid_value));
      const payVal = Math.min(openVal, txAmount > 0 ? txAmount : openVal);
      if (payVal <= 0) {
        toast.info(`A OS #${os.os_number} já está totalmente quitada.`);
        return;
      }
      const res = await settleOsWithCash(createStoreId || storeId, os.os_number, payVal, targetDate);
      const duration = Math.round(performance.now() - t0);

      if (res.success) {
        clientLog({
          type: 'action.success',
          action: 'modal.settle_cash',
          duration_ms: duration,
          data: { os_number: os.os_number, paid_value: payVal }
        });
        toast.success(`OS #${os.os_number} liquidada em dinheiro físico no balcão (R$ ${payVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        clientLog({
          type: 'action.error',
          action: 'modal.settle_cash',
          duration_ms: duration,
          data: { os_number: os.os_number, error: res.error }
        });
        toast.error('Falha ao registrar dinheiro: ' + res.error);
      }
    } catch (err: any) {
      clientLog({
        type: 'action.error',
        action: 'modal.settle_cash',
        duration_ms: Math.round(performance.now() - t0),
        data: { os_number: os.os_number, error: err.message || String(err) }
      });
      toast.error('Erro ao registrar recebimento em dinheiro: ' + (err.message || err));
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

    const t0 = performance.now();
    clientLog({
      type: 'action.start',
      action: 'modal.create_and_link',
      data: {
        pos_id: transaction.id,
        os_number: createOsNumber.trim(),
        store_id: createStoreId || storeId,
        total_value: totalVal,
        link_amount: txAmount
      }
    });

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
      const duration = Math.round(performance.now() - t0);

      if (res.success) {
        clientLog({
          type: 'action.success',
          action: 'modal.create_and_link',
          duration_ms: duration,
          data: {
            pos_id: transaction.id,
            os_number: createOsNumber.trim()
          }
        });
        toast.success(`🎉 OS #${createOsNumber.trim()} criada e pagamento de R$ ${txAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} vinculado com sucesso!`);
        if (onSuccess) onSuccess();
        onClose();
      } else {
        clientLog({
          type: 'action.error',
          action: 'modal.create_and_link',
          duration_ms: duration,
          data: {
            pos_id: transaction.id,
            os_number: createOsNumber.trim(),
            error: res.error
          }
        });
        toast.error('Falha ao criar/vincular: ' + res.error);
      }
    } catch (err: any) {
      clientLog({
        type: 'action.error',
        action: 'modal.create_and_link',
        duration_ms: Math.round(performance.now() - t0),
        data: {
          pos_id: transaction.id,
          os_number: createOsNumber.trim(),
          error: err.message || String(err)
        }
      });
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
        <div className='p-4 bg-card/40 border border-border/30 rounded-xl space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1.5'>
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
              <p className='font-semibold text-sm text-foreground'>
                {transaction.title || (isRede ? 'Venda de Cartão na Maquininha' : 'Depósito Bancário / PIX')}
              </p>
              {transaction.counterpart_name && (
                <p className='text-xs text-muted-foreground font-mono'>
                  Contraparte: {transaction.counterpart_name}
                </p>
              )}
              {isRede && (transaction.nsu || transaction.authorization || transaction.payment_method) && (
                <p className='text-[11px] text-muted-foreground font-mono mt-0.5'>
                  {transaction.payment_method && <span className='mr-2'>Modalidade: {transaction.payment_method}</span>}
                  {transaction.nsu && <span className='mr-2'>NSU: {transaction.nsu}</span>}
                  {transaction.authorization && <span>Aut: {transaction.authorization}</span>}
                </p>
              )}
            </div>
            <div className='text-right shrink-0'>
              {isRede ? (
                <div className='space-y-0.5'>
                  <div className='flex items-center justify-end gap-1.5'>
                    <span className='text-[10px] text-muted-foreground uppercase font-semibold'>Valor Bruto (OS):</span>
                    <span className='text-base font-bold font-mono text-emerald-400'>
                      R$ {grossAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {feeAmount > 0 && (
                    <div className='flex items-center justify-end gap-1.5'>
                      <span className='text-[10px] text-muted-foreground uppercase'>Taxa MDR:</span>
                      <span className='text-xs font-mono text-amber-400/80'>
                        - R$ {feeAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {netAmount > 0 && (
                    <div className='flex items-center justify-end gap-1.5'>
                      <span className='text-[10px] text-muted-foreground uppercase'>Líquido (Banco):</span>
                      <span className='text-xs font-mono text-sky-400'>
                        R$ {netAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <span className='text-xs text-muted-foreground block uppercase'>Valor Depositado</span>
                  <span className='text-xl font-bold font-mono text-emerald-400'>
                    R$ {txAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Abas de Navegação: Buscar Existente vs Criar Nova */}
        <div className='flex items-center gap-1.5 p-1 bg-muted/30 border border-border/20 rounded-xl'>
          <button
            type='button'
            data-debug-action='modal.tab_search'
            onClick={() => setActiveTab('search')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-secondary text-foreground shadow-sm shadow-black/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Search size={14} />
            🔍 Vincular à OS Existente ({sortedAndDeduplicatedCandidates.length})
          </button>
          <button
            type='button'
            data-debug-action='modal.tab_create'
            onClick={() => setActiveTab('create')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm shadow-emerald-950/40'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <PlusCircle size={14} />
            ➕ Criar Nova OS na Filial
          </button>
        </div>

        {/* ABA 1: BUSCAR E VINCULAR OS EXISTENTE */}
        {activeTab === 'search' && (
          <div className='space-y-3'>
            <div className='relative'>
              <Search size={16} className='absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground' />
              <input
                type='text'
                placeholder='Buscar por Nº da OS, Nome do Cliente, Placa ou Forma de Pagamento...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='w-full bg-background/60 border border-border/40 rounded-xl pl-10 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/40 transition-colors'
              />
            </div>

            {isRede && (
              <div className='flex items-center justify-between text-xs text-muted-foreground px-1 py-0.5'>
                <span>
                  Exibindo <strong className='text-foreground'>{sortedAndDeduplicatedCandidates.length}</strong> candidata(s) {showHistorical ? '(histórico completo da filial)' : '(conciliação atual)'}
                </span>
                <label className='flex items-center gap-2 cursor-pointer select-none text-xs text-foreground font-medium'>
                  <input
                    type='checkbox'
                    data-debug-action='modal.toggle_historical'
                    checked={showHistorical}
                    onChange={(e) => setShowHistorical(e.target.checked)}
                    className='rounded border-border/50 bg-background text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer'
                  />
                  <span>Buscar no histórico antigo</span>
                </label>
              </div>
            )}

            <div className='border border-border/30 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-card/20'>
              {isError ? (
                <div className='p-8 text-center text-rose-400 bg-rose-500/10 space-y-3'>
                  <AlertCircle size={28} className='mx-auto text-rose-400' />
                  <p className='font-bold text-xs text-foreground'>Falha ao carregar candidatos da maquininha</p>
                  <p className='text-[11px] text-muted-foreground font-mono max-w-md mx-auto'>
                    {error instanceof Error ? error.message : String(error || 'Erro na consulta dos candidatos')}
                  </p>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => refetch()}
                    className='border-rose-500/40 text-rose-300 hover:bg-rose-500/20 text-xs mt-2'
                  >
                    Tentar Novamente
                  </Button>
                </div>
              ) : isLoading ? (
                <div className='p-8 flex justify-center'>
                  <LoadingSpinner text='Carregando OSs da filial...' />
                </div>
              ) : sortedAndDeduplicatedCandidates.length === 0 ? (
                <div className='p-8 text-center text-muted-foreground text-xs'>
                  <AlertCircle size={24} className='mx-auto mb-2 text-muted-foreground/60' />
                  <p className='font-bold text-foreground'>Nenhuma OS pendente encontrada para esta filial.</p>
                  <p className='text-muted-foreground mt-1'>Clique na aba <strong>"➕ Criar Nova OS na Filial"</strong> para cadastrar e vincular na hora.</p>
                </div>
              ) : (
                <table className='w-full text-xs'>
                  <thead className='bg-muted/30 border-b border-border/30 text-muted-foreground uppercase font-mono text-[10px]'>
                    <tr>
                      <th className='py-2.5 px-3 text-left'>OS #</th>
                      <th className='py-2.5 px-3 text-left'>Cliente / Placa</th>
                      <th className='py-2.5 px-3 text-left'>Pagamento</th>
                      <th className='py-2.5 px-3 text-right'>Total OS</th>
                      <th className='py-2.5 px-3 text-right'>Saldo Aberto</th>
                      <th className='py-2.5 px-3 text-center'>Match</th>
                      <th className='py-2.5 px-3 text-right'>Ações</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-border/20 font-sans'>
                    {sortedAndDeduplicatedCandidates.map((os) => {
                      const totalVal = os.total_value || 0;
                      const paidVal = os.paid_value || 0;
                      const saldoAberto = Math.max(0, os.open_balance ?? (totalVal - paidVal));
                      const isAlreadySettled = saldoAberto <= 0.05 || (os.status && ['finalizada', 'paga', 'finalizado', 'pago'].includes(String(os.status).toLowerCase()));
                      const novoSaldoAposVinculo = Math.max(0, saldoAberto - txAmount);
                      const isQuitaTotal = !isAlreadySettled && novoSaldoAposVinculo <= 0.05 && saldoAberto > 0.05;

                      const availableAmount = isRede 
                        ? (os.available_card_amount ?? 0) 
                        : (os.pix_transfer_value > 0 ? os.pix_transfer_value : saldoAberto);

                      const diff = Math.abs(availableAmount - txAmount);
                      const isExact = availableAmount > 0.05 && diff < 0.05;
                      const nameMatch = checkNameMatch(transaction.counterpart_name, transaction.title, os.client_name);
                      const isEligible = os.candidate_status === 'eligible';
                      const isHighPriority = (nameMatch.isNameMatch && isExact) || isEligible;
                      const isZeroAvailable = isRede && availableAmount <= 0.05;

                      return (
                        <tr
                          key={os.os_number}
                          className={`transition-colors ${
                            os.candidate_status === 'eligible'
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-l-2 border-emerald-400'
                              : os.candidate_status === 'collision'
                              ? 'bg-amber-500/10 hover:bg-amber-500/15 border-l-2 border-amber-400'
                              : os.candidate_status === 'identity_mismatch'
                              ? 'bg-rose-500/10 hover:bg-rose-500/15 border-l-2 border-rose-400'
                              : os.candidate_status === 'modality_mismatch'
                              ? 'bg-purple-500/10 hover:bg-purple-500/15 border-l-2 border-purple-400'
                              : isHighPriority
                              ? 'bg-emerald-500/10 hover:bg-emerald-500/15 border-l-2 border-emerald-400'
                              : isExact
                              ? 'bg-blue-500/10 hover:bg-blue-500/15 border-l-2 border-blue-400'
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          <td className='py-2.5 px-3 font-mono font-bold text-foreground'>
                            <div className='flex items-center gap-1.5'>
                              <FileText size={13} className='shrink-0 text-emerald-400' />
                              <span>OS #{os.os_number}</span>
                            </div>
                          </td>
                          <td className='py-2.5 px-3 text-muted-foreground'>
                            <div className='flex flex-col'>
                              <span className={`font-semibold truncate max-w-[200px] ${nameMatch.isNameMatch || isEligible ? 'text-emerald-400' : 'text-foreground'}`}>
                                {os.client_name || 'Cliente'}
                              </span>
                              {os.plate && (
                                <span className='text-[10px] text-muted-foreground font-mono'>
                                  Placa: {os.plate}
                                </span>
                              )}
                              {os.reason_code && (
                                <span className='text-[10px] text-muted-foreground mt-0.5 line-clamp-1 italic' title={os.reason_code}>
                                  {os.reason_code}
                                </span>
                              )}
                              {isRede && (os.delta_credit !== undefined || os.delta_debit !== undefined) && (
                                <div className='mt-1 text-[9px] font-mono text-muted-foreground/80 flex flex-wrap gap-x-2 gap-y-0.5 bg-muted/40 p-1 rounded border border-border/20'>
                                  <span>Base: R$ {((os.credit_before ?? 0) + (os.debit_before ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  <span>Acum: R$ {((os.credit_after ?? 0) + (os.debit_after ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  <span className='text-primary font-semibold'>Delta: R$ {((os.delta_credit ?? 0) + (os.delta_debit ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  <span>Cons: R$ {((os.consumed_credit ?? 0) + (os.consumed_debit ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                  <span className={(os.available_card_amount ?? 0) > 0.05 ? 'text-emerald-400 font-bold' : 'text-muted-foreground'}>
                                    Disp: R$ {(os.available_card_amount ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td className='py-2.5 px-3 text-muted-foreground font-mono'>
                            <span className='px-1.5 py-0.5 rounded bg-muted/50 border border-border/20 text-[10px] text-foreground font-mono'>
                              {os.payment_method || (isRede ? 'CARTAO' : 'PIX')}
                            </span>
                          </td>
                          <td className='py-2.5 px-3 text-right font-mono text-muted-foreground'>
                            R$ {totalVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          <td className='py-2.5 px-3 text-right font-mono font-bold'>
                            <div className='flex flex-col items-end'>
                              <span className={saldoAberto > 0.05 ? 'text-amber-400' : 'text-muted-foreground'}>
                                R$ {saldoAberto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                              {saldoAberto > 0.05 && (
                                <span className='text-[10px] text-muted-foreground font-normal'>
                                  Restante: R$ {novoSaldoAposVinculo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className='py-2.5 px-3 text-center font-mono'>
                            {os.candidate_status === 'eligible' ? (
                              <Badge variant='success' className='bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold'>
                                <CheckCircle2 size={10} className='mr-1' /> Elegível 1:1
                              </Badge>
                            ) : os.candidate_status === 'collision' ? (
                              <Badge variant='outline' className='bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px] font-bold'>
                                <AlertCircle size={10} className='mr-1' /> Colisão Ambígua
                              </Badge>
                            ) : os.candidate_status === 'identity_mismatch' ? (
                              <Badge variant='outline' className='bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px] font-bold'>
                                <AlertCircle size={10} className='mr-1' /> Nome/Doc Divergente
                              </Badge>
                            ) : os.candidate_status === 'modality_mismatch' ? (
                              <Badge variant='outline' className='bg-purple-500/10 text-purple-400 border-purple-500/30 text-[10px] font-bold'>
                                <AlertCircle size={10} className='mr-1' /> Modalidade Oposta
                              </Badge>
                            ) : os.candidate_status === 'already_consumed' ? (
                              <Badge variant='outline' className='bg-muted/30 text-muted-foreground border-border/30 text-[10px] font-medium'>
                                Já Consumido
                              </Badge>
                            ) : os.candidate_status === 'no_card_delta' || os.candidate_status === 'historical_no_delta' ? (
                              <Badge variant='outline' className='bg-muted/30 text-muted-foreground border-border/30 text-[10px] font-medium'>
                                Sem Delta no Dia
                              </Badge>
                            ) : nameMatch.isNameMatch && isExact ? (
                              <Badge variant='success' className='bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] font-bold'>
                                <Sparkles size={10} className='mr-1 text-emerald-400' /> Match Nome + Delta
                              </Badge>
                            ) : nameMatch.isNameMatch ? (
                              <Badge variant='outline' className='bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px] font-bold'>
                                <Sparkles size={10} className='mr-1 text-emerald-400' /> Match por Nome
                              </Badge>
                            ) : isExact ? (
                              <Badge variant='success' className='bg-blue-500/20 text-blue-300 border-blue-500/40 text-[10px] font-bold'>
                                <CheckCircle2 size={10} className='mr-1' /> Delta Exato
                              </Badge>
                            ) : (
                              <span className='text-[10px] text-muted-foreground font-medium'>
                                ± R$ {diff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </td>
                          <td className='py-2.5 px-3 text-right'>
                            <div className='flex items-center justify-end gap-1.5'>
                              <Button
                                size='sm'
                                variant='outline'
                                disabled={linking}
                                data-debug-action='modal.link_os'
                                onClick={() => {
                                  if (isZeroAvailable) {
                                    setExceptionalCandidate(os);
                                  } else {
                                    handleLink(os);
                                  }
                                }}
                                className={`h-7 px-3 text-xs font-semibold gap-1 shrink-0 cursor-pointer transition-all ${
                                  isZeroAvailable
                                    ? 'bg-secondary/40 hover:bg-secondary text-muted-foreground border-border/40'
                                    : isAlreadySettled
                                    ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-semibold border-sky-500/40'
                                    : isHighPriority || isQuitaTotal
                                    ? 'bg-emerald-500 hover:bg-emerald-400 text-black font-bold border-emerald-400 shadow-sm shadow-emerald-950/40'
                                    : isExact
                                    ? 'bg-blue-600 hover:bg-blue-500 text-white font-semibold border-blue-500 shadow-sm shadow-blue-950/40'
                                    : 'bg-secondary/50 hover:bg-secondary text-foreground border border-border/30'
                                }`}
                                title={
                                  isZeroAvailable
                                    ? 'OS sem incremento comprovado nesta data contábil. Requer confirmação de segurança.'
                                    : isAlreadySettled
                                    ? 'OS já quitada. Registra vínculo informativo sem duplicar baixa no Pátio'
                                    : isQuitaTotal
                                    ? 'Vincular este crédito e quitar totalmente a OS'
                                    : 'Vincular este crédito à OS'
                                }
                              >
                                <Link2 size={12} className={!isZeroAvailable && (isHighPriority || isQuitaTotal) ? 'text-black stroke-[2.5]' : isAlreadySettled ? 'text-sky-300' : 'text-foreground'} />
                                {isZeroAvailable ? 'Vincular (Excepcional)' : isAlreadySettled ? 'Vincular (Informativo)' : isQuitaTotal ? 'Vincular & Quitar' : 'Vincular'}
                              </Button>

                              {saldoAberto > 0.05 && (
                                <Button
                                  size='sm'
                                  variant='ghost'
                                  disabled={linking}
                                  data-debug-action='modal.settle_cash'
                                  onClick={() => handleSettleCash(os)}
                                  className='h-7 px-2 text-[11px] font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/20 rounded-lg cursor-pointer'
                                  title='Liquidar em dinheiro físico na oficina (cofre loja)'
                                >
                                  <Banknote size={12} className='mr-1' />
                                  Dinheiro
                                </Button>
                              )}
                            </div>
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
          <form onSubmit={handleCreateAndLink} className='space-y-4 bg-card/40 p-4 border border-border/30 rounded-xl'>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
              {/* Filial */}
              <div>
                <label className='block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <Building2 size={13} className='text-emerald-400' /> Filial / Loja
                </label>
                <select
                  value={createStoreId}
                  onChange={(e) => setCreateStoreId(e.target.value)}
                  className='w-full bg-background/80 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors'
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
                <label className='block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <FileText size={13} className='text-emerald-400' /> Número da OS *
                </label>
                <input
                  type='text'
                  required
                  placeholder='Ex: 1892, 5021'
                  value={createOsNumber}
                  onChange={(e) => setCreateOsNumber(e.target.value)}
                  className='w-full bg-background/80 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors'
                />
              </div>

              {/* Nome do Cliente */}
              <div>
                <label className='block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <User size={13} className='text-emerald-400' /> Nome do Cliente
                </label>
                <input
                  type='text'
                  placeholder='Nome completo ou razão social'
                  value={createClientName}
                  onChange={(e) => setCreateClientName(e.target.value)}
                  className='w-full bg-background/80 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors'
                />
              </div>

              {/* Placa do Veículo */}
              <div>
                <label className='block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <Car size={13} className='text-emerald-400' /> Placa do Veículo (Opcional)
                </label>
                <input
                  type='text'
                  placeholder='Ex: ABC-1234'
                  value={createPlate}
                  onChange={(e) => setCreatePlate(e.target.value.toUpperCase())}
                  className='w-full bg-background/80 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors'
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className='block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <CreditCard size={13} className='text-emerald-400' /> Forma de Pagamento
                </label>
                <select
                  value={createPaymentMethod}
                  onChange={(e) => setCreatePaymentMethod(e.target.value)}
                  className='w-full bg-background/80 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/60 focus:ring-1 focus:ring-emerald-500/40 transition-colors'
                >
                  <option value='PIX'>PIX / Transferência</option>
                  <option value='CREDITO'>Cartão de Crédito</option>
                  <option value='DEBITO'>Cartão de Débito</option>
                  <option value='DINHEIRO'>Dinheiro Físico</option>
                </select>
              </div>

              {/* Opção Parcial / Integral */}
              <div>
                <label className='block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5'>
                  <DollarSign size={13} className='text-emerald-400' /> Tipo de Liquidação
                </label>
                <div className='flex items-center gap-3 pt-1'>
                  <label className='flex items-center gap-2 text-xs text-foreground cursor-pointer'>
                    <input
                      type='radio'
                      name='liquidationType'
                      checked={!isPartial}
                      onChange={() => setIsPartial(false)}
                      className='text-emerald-500 focus:ring-emerald-500'
                    />
                    Integral (100% Pago)
                  </label>
                  <label className='flex items-center gap-2 text-xs text-foreground cursor-pointer'>
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
              <div className='p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-1.5'>
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
                  className='w-full bg-background/80 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/40'
                />
                <p className='text-[10px] text-muted-foreground'>
                  O pagamento de <strong className='text-foreground'>R$ {txAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> será abatido, deixando um saldo remanescente de <strong className='text-foreground'>R$ {Math.max(0, Number(createTotalValue || 0) - txAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> em aberto no pátio.
                </p>
              </div>
            )}

            <div className='flex justify-end gap-2 pt-2'>
              <Button
                type='submit'
                disabled={linking}
                data-debug-action='modal.create_os'
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
        <div className='p-3 bg-card/20 border border-border/20 rounded-xl text-[11px] text-muted-foreground flex items-start gap-2'>
          <Banknote size={16} className='text-emerald-400 shrink-0 mt-0.5' />
          <span>
            <strong>Garantia Contábil:</strong> Ao vincular o lançamento a uma OS (existente ou nova), o valor pago é amortizado na forma de pagamento correta ({isRede ? 'Cartão' : 'PIX'}), o saldo de pátio é recalculado e a pendência é baixada sem gerar duplicidade no Faturamento.
          </span>
        </div>

        {/* Diálogo de Confirmação para Vínculo Excepcional sem Incremento */}
        {exceptionalCandidate && (
          <div className='fixed inset-0 z-[120] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm'>
            <div className='bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4'>
              <div className='flex items-center gap-3 text-amber-400'>
                <AlertCircle size={24} className='shrink-0' />
                <h3 className='font-bold text-base text-foreground'>Atenção: Vínculo Excepcional sem Incremento</h3>
              </div>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                A <strong className='text-foreground'>OS #{exceptionalCandidate.os_number}</strong> ({exceptionalCandidate.client_name}) possui incremento disponível de <strong className='text-amber-400'>R$ 0,00</strong> nesta data contábil.
              </p>
              <div className='p-3 bg-muted/40 rounded-lg text-xs space-y-1 font-mono text-muted-foreground border border-border/20'>
                <div>Motivo: <span className='text-foreground'>{exceptionalCandidate.reason_code || 'Sem novos lançamentos na data'}</span></div>
                <div>Status Contábil: <span className='text-foreground'>{exceptionalCandidate.candidate_status || 'Sem delta'}</span></div>
                <div>Valor da Venda: <span className='text-foreground font-bold'>R$ {Number(txAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
              </div>
              <p className='text-[11px] text-muted-foreground'>
                Vincular esta venda não aplicará nova baixa financeira no Pátio, pois o valor do cartão já foi consumido ou não houve novo pagamento comprovado na data. Deseja prosseguir com o vínculo apenas para conciliação?
              </p>
              <div className='flex items-center justify-end gap-2 pt-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => setExceptionalCandidate(null)}
                  className='text-xs'
                >
                  Cancelar
                </Button>
                <Button
                  size='sm'
                  className='bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs'
                  onClick={async () => {
                    const cand = exceptionalCandidate;
                    setExceptionalCandidate(null);
                    await handleLink(cand);
                  }}
                >
                  Confirmar Vínculo Excepcional
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className='flex justify-end pt-1'>
          <Button variant='ghost' onClick={onClose} className='text-muted-foreground hover:text-foreground hover:bg-muted/40'>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
