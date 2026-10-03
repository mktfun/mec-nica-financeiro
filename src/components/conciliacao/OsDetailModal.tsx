import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  FileText, 
  User, 
  Calendar, 
  CreditCard, 
  QrCode, 
  Banknote, 
  CheckCircle2, 
  ShieldCheck, 
  Check, 
  RotateCcw, 
  DollarSign,
  AlertTriangle,
  Link2,
  Clock,
  ArrowDownRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useUpdateOsStatus } from '@/hooks/useConciliacao';
import { parsePaymentBreakdown } from '@/lib/osPaymentUtils';
import { formatCurrency } from '@/lib/utils';
import { OsPaymentLaunchModal } from './OsPaymentLaunchModal';

export interface OsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  osData: {
    id?: string;
    os_number: string;
    store_id?: string;
    target_date?: string;
    client_name?: string;
    vehicle?: string;
    plate?: string;
    entry_date?: string;
    total_value?: number;
    paid_value?: number;
    payment_method?: string;
    credit_value?: number;
    debit_value?: number;
    pix_transfer_value?: number;
    cash_value?: number;
    parsed_credit_debit?: number;
    parsed_pix_transfer?: number;
    status?: string;
    history_log?: any[];
  } | null;
  os?: any;
  storeId?: string;
}

interface PaymentTransactionItem {
  id: string;
  sourceType: 'pos' | 'ofx' | 'declared';
  dateLabel: string;
  dateRaw: string;
  category: 'credito' | 'debito' | 'pix' | 'dinheiro' | 'transferencia' | 'boleto' | 'outro';
  label: string;
  detail?: string;
  amount: number;
  isCovered: boolean;
  coverageStatus: string;
  badgeVariant: 'success' | 'danger' | 'warning' | 'neutral' | 'brand';
  needsAction: boolean;
}

function formatDateDisplay(raw?: string | null): string {
  if (!raw) return 'Data não inf.';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return String(raw);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hasTime = raw.includes('T') || raw.includes(':');
    if (hasTime) {
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    }
    return `${day}/${month}/${year}`;
  } catch {
    return String(raw);
  }
}

export function OsDetailModal({ isOpen, onClose, osData: propOsData, ...props }: OsDetailModalProps) {
  const updateOsStatus = useUpdateOsStatus();
  const rawOs = propOsData || props.os;
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const osNumber = rawOs?.os_number ? String(rawOs.os_number).trim() : '';

  // 1. Busca dados em tempo real da OS em patio_os para pegar histórico completo
  const { data: liveOs } = useQuery({
    queryKey: ['patio-os-detail', osNumber],
    queryFn: async () => {
      if (!osNumber) return null;
      const { data, error } = await supabase
        .from('patio_os')
        .select('*')
        .eq('os_number', osNumber)
        .maybeSingle();
      if (error) return null;
      return data;
    },
    enabled: isOpen && !!osNumber,
  });

  const osData = liveOs || rawOs;

  // 2. Busca transações da maquininha (Rede) vinculadas a esta OS
  const { data: posTransactions = [] } = useQuery({
    queryKey: ['os-pos-transactions', osNumber],
    queryFn: async () => {
      if (!osNumber) return [];
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('*')
        .eq('matched_os_number', osNumber)
        .order('occurred_at', { ascending: false });
      if (error) {
        console.warn('Aviso ao buscar pos_transactions da OS:', error);
        return [];
      }
      return data || [];
    },
    enabled: isOpen && !!osNumber,
  });

  // 3. Busca transações bancárias (OFX / PIX) vinculadas a esta OS
  const { data: ofxTransactions = [] } = useQuery({
    queryKey: ['os-ofx-transactions', osNumber],
    queryFn: async () => {
      if (!osNumber) return [];
      const { data, error } = await supabase
        .from('ofx_transactions')
        .select('*')
        .eq('matched_os_number', osNumber)
        .order('occurred_at', { ascending: false });
      if (error) {
        console.warn('Aviso ao buscar ofx_transactions da OS:', error);
        return [];
      }
      return data || [];
    },
    enabled: isOpen && !!osNumber,
  });

  // 4. Busca observações de importação do dia (deltas e coberturas consumidas)
  const { data: importObservations = [] } = useQuery({
    queryKey: ['os-import-observations', osNumber],
    queryFn: async () => {
      if (!osNumber) return [];
      const { data, error } = await supabase
        .from('os_import_observations')
        .select('*')
        .eq('os_number', osNumber)
        .order('target_date', { ascending: false });
      if (error) return [];
      return data || [];
    },
    enabled: isOpen && !!osNumber,
  });

  if (!osData) return null;

  const isEntrou = osData.status === 'ENTROU';

  const handleToggleEntrou = () => {
    if (!osData.id) return;
    const newStatus = isEntrou ? 'finalizado' : 'ENTROU';
    updateOsStatus.mutate({
      osId: osData.id,
      osNumber: osData.os_number,
      storeId: osData.store_id || '',
      targetDate: osData.target_date || new Date().toISOString().split('T')[0],
      newStatus
    }, {
      onSuccess: () => {
        onClose();
      }
    });
  };

  const breakdown = parsePaymentBreakdown(osData);
  const sumBreakdown = breakdown.reduce((acc, b) => acc + b.value, 0);

  const rawTotal = Number(osData.total_value || 0);
  const rawPaid = Number(osData.paid_value || 0);
  const totalValue = Math.max(rawTotal, rawPaid, sumBreakdown);
  const paidValue = rawPaid > 0 
    ? rawPaid 
    : (isEntrou || osData.status === 'finalizado' ? totalValue : (sumBreakdown > 0 ? sumBreakdown : 0));
  const openValue = Math.max(0, totalValue - paidValue);

  // Mapeamento e unificação da lista de pagamentos e transações (Spec 471)
  const transactionItems = useMemo(() => {
    const list: PaymentTransactionItem[] = [];

    // Fallback de datas da OS para itens sem timestamp explícito
    const baseDateIso = osData.last_payment_date 
      || osData.closed_at 
      || osData.target_date 
      || osData.opened_at 
      || new Date().toISOString();

    // 1. Transações de Cartão/Maquininha (Rede) efetivamente vinculadas
    posTransactions.forEach((pos: any) => {
      const isDeb = (pos.payment_method || '').toLowerCase().includes('deb') || (pos.transaction_type || '').toLowerCase().includes('deb');
      const cat = isDeb ? 'debito' : 'credito';
      const grossVal = Number(pos.gross_amount || pos.net_amount || 0);

      list.push({
        id: `pos-${pos.id}`,
        sourceType: 'pos',
        dateLabel: formatDateDisplay(pos.occurred_at || pos.target_date),
        dateRaw: pos.occurred_at || pos.target_date || baseDateIso,
        category: cat,
        label: isDeb ? 'Cartão Débito (Rede)' : 'Cartão Crédito (Rede)',
        detail: pos.machine_name ? `Máquina: ${pos.machine_name}` : 'Transação de Maquininha',
        amount: grossVal,
        isCovered: true,
        coverageStatus: 'Vinculado à Rede',
        badgeVariant: 'success',
        needsAction: false
      });
    });

    // 2. Transações Bancárias (OFX / PIX) efetivamente vinculadas
    ofxTransactions.forEach((ofx: any) => {
      const amt = Math.abs(Number(ofx.amount || 0));
      list.push({
        id: `ofx-${ofx.id}`,
        sourceType: 'ofx',
        dateLabel: formatDateDisplay(ofx.occurred_at || ofx.target_date),
        dateRaw: ofx.occurred_at || ofx.target_date || baseDateIso,
        category: 'pix',
        label: 'PIX / Extrato Bancário',
        detail: ofx.counterpart_name || ofx.bank_name || 'Vínculo OFX',
        amount: amt,
        isCovered: true,
        coverageStatus: 'Vinculado ao Extrato',
        badgeVariant: 'success',
        needsAction: false
      });
    });

    // 3. Pagamentos declarados na OS (via breakdown / UltraCar)
    // Se o pagamento declarado já foi coberto por uma transação pos/ofx pareada, associamos o status
    const totalPosAmount = posTransactions.reduce((acc: number, p: any) => acc + Number(p.gross_amount || 0), 0);
    const totalOfxAmount = ofxTransactions.reduce((acc: number, o: any) => acc + Math.abs(Number(o.amount || 0)), 0);

    // Verifica observações de importação do dia para checar consumo
    const latestObs = importObservations[0];
    const pendingCreditDelta = latestObs ? Math.max(0, Number(latestObs.delta_credit || 0) - Number(latestObs.consumed_credit || 0)) : 0;
    const pendingDebitDelta = latestObs ? Math.max(0, Number(latestObs.delta_debit || 0) - Number(latestObs.consumed_debit || 0)) : 0;

    breakdown.forEach((item, index) => {
      let isCovered = false;
      let coverageStatus = 'Declarado';
      let badgeVariant: 'success' | 'danger' | 'warning' | 'neutral' | 'brand' = 'neutral';
      let needsAction = false;

      if (item.category === 'credito') {
        const hasMatchingPos = totalPosAmount >= item.value - 0.05;
        const hasPendingDelta = pendingCreditDelta > 0.05;
        if (hasMatchingPos && !hasPendingDelta) {
          isCovered = true;
          coverageStatus = 'Vinculado à Rede';
          badgeVariant = 'success';
        } else {
          isCovered = false;
          coverageStatus = 'Sem Cobertura na Maquininha';
          badgeVariant = 'danger';
          needsAction = true;
        }
      } else if (item.category === 'debito') {
        const hasMatchingPos = totalPosAmount >= item.value - 0.05;
        const hasPendingDelta = pendingDebitDelta > 0.05;
        if (hasMatchingPos && !hasPendingDelta) {
          isCovered = true;
          coverageStatus = 'Vinculado à Rede';
          badgeVariant = 'success';
        } else {
          isCovered = false;
          coverageStatus = 'Sem Cobertura na Maquininha';
          badgeVariant = 'danger';
          needsAction = true;
        }
      } else if (item.category === 'pix' || item.category === 'transferencia') {
        const hasMatchingOfx = totalOfxAmount >= item.value - 0.05;
        if (hasMatchingOfx) {
          isCovered = true;
          coverageStatus = 'Vinculado ao Extrato';
          badgeVariant = 'success';
        } else {
          isCovered = false;
          coverageStatus = 'Sem Vínculo no Extrato';
          badgeVariant = 'danger';
          needsAction = true;
        }
      } else if (item.category === 'dinheiro') {
        isCovered = true;
        coverageStatus = 'Cofre da Filial';
        badgeVariant = 'warning';
      } else if (item.category === 'boleto') {
        isCovered = true;
        coverageStatus = 'A Receber / Boleto';
        badgeVariant = 'neutral';
      }

      // Evita duplicar se posTransactions/ofxTransactions já listaram as transações com exatidão
      const hasExactMatchInPos = posTransactions.length > 0 && (item.category === 'credito' || item.category === 'debito');
      const hasExactMatchInOfx = ofxTransactions.length > 0 && (item.category === 'pix' || item.category === 'transferencia');

      // Se houver transação pareada correspondente, só exibe o item declarado se ele estiver com pendência ou sem par
      if (!isCovered || (!hasExactMatchInPos && !hasExactMatchInOfx)) {
        list.push({
          id: `declared-${index}`,
          sourceType: 'declared',
          dateLabel: formatDateDisplay(baseDateIso),
          dateRaw: baseDateIso,
          category: item.category as any,
          label: item.method,
          detail: 'Lançamento registrado na Ordem de Serviço',
          amount: item.value,
          isCovered,
          coverageStatus,
          badgeVariant,
          needsAction
        });
      }
    });

    // Ordenação estritamente cronológica descendente (mais recentes no topo)
    return list.sort((a, b) => {
      const timeA = new Date(a.dateRaw).getTime();
      const timeB = new Date(b.dateRaw).getTime();
      return timeB - timeA;
    });
  }, [breakdown, posTransactions, ofxTransactions, importObservations, osData]);

  const hasAnyPending = transactionItems.some(item => !item.isCovered);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Ordem de Serviço #${osData.os_number}`} size="xl">
      <div className="space-y-5 pt-1 text-zinc-100 font-sans">
        
        {/* Header da OS */}
        <div className="bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold">
              <FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-zinc-100">OS #{osData.os_number}</h3>
                {isEntrou ? (
                  <Badge variant="success" size="sm">
                    <CheckCircle2 size={11} className="mr-1" /> ENTROU
                  </Badge>
                ) : hasAnyPending ? (
                  <Badge variant="danger" size="sm" dot>
                    Sem Cobertura
                  </Badge>
                ) : (
                  <Badge variant="brand" size="sm">
                    <ShieldCheck size={11} className="mr-1" /> No Sistema
                  </Badge>
                )}
              </div>
              <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                <User size={12} className="text-zinc-500" />
                <span className="font-medium text-zinc-300">{osData.client_name || 'Cliente'}</span>
                {(osData.plate || osData.vehicle) && (
                  <span className="font-mono text-zinc-400 font-semibold">• {osData.plate || osData.vehicle}</span>
                )}
              </p>
            </div>
          </div>

          <div className="text-right font-mono text-xs text-zinc-400 flex flex-col items-end gap-0.5">
            {osData.last_payment_date && (
              <span className="flex items-center gap-1 text-zinc-300">
                <Clock size={12} className="text-emerald-400" />
                Pagto: {formatDateDisplay(osData.last_payment_date)}
              </span>
            )}
            {osData.opened_at && (
              <span className="flex items-center gap-1 text-zinc-500 text-[11px]">
                <Calendar size={11} />
                Abertura: {formatDateDisplay(osData.opened_at)}
              </span>
            )}
          </div>
        </div>

        {/* Resumo de Valores */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-zinc-900/40 border border-zinc-800 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold font-mono">Valor Total da OS</span>
            <p className="text-lg font-bold text-zinc-100 mt-0.5 font-mono">
              {formatCurrency(totalValue)}
            </p>
          </div>
          <div className="p-3.5 bg-zinc-900/40 border border-zinc-800 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold font-mono">Valor Pago Registrado</span>
            <p className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">
              {formatCurrency(paidValue)}
            </p>
          </div>
          <div className="p-3.5 bg-zinc-900/40 border border-zinc-800 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold font-mono">Saldo no Pátio</span>
            <p className={`text-lg font-bold mt-0.5 font-mono ${openValue > 0.05 ? 'text-amber-400' : 'text-zinc-400'}`}>
              {formatCurrency(openValue)}
            </p>
          </div>
        </div>

        {/* Lista Individualizada de Transações & Pagamentos (Ordem Cronológica Descendente) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <CreditCard size={14} className="text-zinc-400" />
              Transações & Movimentações de Pagamento
            </h4>
            <span className="text-[11px] text-zinc-400 font-mono">
              {transactionItems.length} {transactionItems.length === 1 ? 'registro' : 'registros'} (mais recentes no topo)
            </span>
          </div>

          <div className="space-y-2 font-mono text-xs">
            {transactionItems.length === 0 ? (
              <div className="p-6 bg-zinc-900/30 border border-zinc-800 rounded-xl text-center text-xs text-zinc-500 italic">
                Nenhum pagamento ou transação vinculado a esta Ordem de Serviço.
              </div>
            ) : (
              transactionItems.map((item) => {
                let Icon = CreditCard;
                let iconColor = 'text-blue-400';

                if (item.category === 'credito') {
                  Icon = CreditCard;
                  iconColor = 'text-blue-400';
                } else if (item.category === 'debito') {
                  Icon = CreditCard;
                  iconColor = 'text-cyan-400';
                } else if (item.category === 'pix' || item.category === 'transferencia') {
                  Icon = QrCode;
                  iconColor = 'text-emerald-400';
                } else if (item.category === 'dinheiro') {
                  Icon = Banknote;
                  iconColor = 'text-amber-400';
                } else if (item.category === 'boleto') {
                  Icon = FileText;
                  iconColor = 'text-purple-400';
                }

                return (
                  <div 
                    key={item.id} 
                    className={`p-3 bg-zinc-900/50 border rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                      item.needsAction ? 'border-rose-500/40 bg-rose-950/10' : 'border-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 ${iconColor}`}>
                        <Icon size={16} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-zinc-100 font-sans">{item.label}</span>
                          <span className="text-[11px] text-zinc-400 font-mono">
                            {item.dateLabel}
                          </span>
                        </div>
                        {item.detail && (
                          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                            {item.detail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      <span className="font-bold text-zinc-100 font-mono text-sm">
                        {formatCurrency(item.amount)}
                      </span>

                      <Badge variant={item.badgeVariant} size="sm" dot={!item.isCovered}>
                        {item.coverageStatus}
                      </Badge>

                      {item.needsAction && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setIsPaymentModalOpen(true)}
                          className="h-6 text-[10px] px-2 rounded-lg gap-1 font-sans cursor-pointer"
                          title="Lançar ou vincular transação para cobrir este pagamento"
                        >
                          <Link2 size={10} />
                          Lançar / Vincular
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* String de Pagamento Original / Nota Informativa */}
        {osData.payment_method && (
          <div className="p-3 bg-zinc-900/30 border border-zinc-800/80 rounded-xl text-xs text-zinc-400 font-sans">
            <span className="font-semibold text-zinc-300 font-mono text-[11px]">Lançamento Bruto do Sistema:</span>
            <p className="font-mono text-[11px] text-zinc-400 mt-0.5 truncate">{osData.payment_method}</p>
          </div>
        )}

        {/* Ações da OS */}
        {osData.id && (
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPaymentModalOpen(true)}
              className="gap-1.5 text-xs font-semibold rounded-lg border-zinc-700 hover:bg-zinc-800 text-zinc-200"
            >
              <DollarSign size={14} className="text-emerald-400" />
              Lançar / Editar Pagamento
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant={isEntrou ? "outline" : "secondary"}
                onClick={handleToggleEntrou}
                disabled={updateOsStatus.isPending}
                className="gap-2 text-xs font-semibold rounded-lg"
              >
                {isEntrou ? (
                  <>
                    <RotateCcw size={14} />
                    Reverter para Pendente
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Marcar como ENTROU (Baixa Manual)
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={onClose}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                Fechar
              </Button>
            </div>
          </div>
        )}
      </div>

      {isPaymentModalOpen && (
        <OsPaymentLaunchModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          os={osData}
          targetDate={osData.target_date}
          onSuccess={() => {
            setIsPaymentModalOpen(false);
            onClose();
          }}
        />
      )}
    </Modal>
  );
}

