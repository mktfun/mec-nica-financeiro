import React, { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { 
  SandboxReconciliationSession, 
  saveSandboxSession,
  SandboxCashVaultItem
} from '@/lib/sandbox/sandboxStorage';
import { 
  Banknote, 
  Car, 
  Receipt, 
  TrendingUp, 
  FileSpreadsheet, 
  Landmark, 
  CheckCircle2, 
  Clock, 
  Search,
  Check,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { SaldoBancosDetailModal } from '@/components/conciliacao/SaldoBancosDetailModal';

export type ActiveDrilldownModal = 'cofre' | 'patio' | 'recebiveis' | 'faturamento' | 'contas' | 'saldos' | null;

interface Props {
  session: SandboxReconciliationSession;
  activeModal: ActiveDrilldownModal;
  onClose: () => void;
  onUpdateSession: (updated: SandboxReconciliationSession) => void;
  onSandboxBaixaDinheiro?: (storeId: string, amount: number, itemIds?: string[]) => void;
}

export function SandboxDrilldownModals({
  session,
  activeModal,
  onClose,
  onUpdateSession,
  onSandboxBaixaDinheiro
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!activeModal) return null;

  const { cashVaultEntries, receivables, summary, targetDate } = session;

  // Entradas de cofre com fallback sintético por loja caso cashVaultEntries não tenha sido populado item a item
  const effectiveCashVaultEntries = useMemo<SandboxCashVaultItem[]>(() => {
    if (cashVaultEntries && cashVaultEntries.length > 0) {
      return cashVaultEntries;
    }
    const synth: SandboxCashVaultItem[] = [];
    (summary?.stores || []).forEach(st => {
      if ((st.dinheiro_loja || 0) > 0) {
        synth.push({
          id: `synth-vault-${st.store_id}`,
          store_id: st.store_id,
          store_name: st.store_name,
          os_number_ref: 'FECHAMENTO',
          amount: st.dinheiro_loja,
          entry_date: targetDate,
          status: 'em_transito'
        });
      }
    });
    return synth;
  }, [cashVaultEntries, summary?.stores, targetDate]);

  // Helper para recalcular summary quando os lançamentos do cofre mudam
  const recalculateSessionWithVault = (updatedEntries: typeof cashVaultEntries): SandboxReconciliationSession => {
    const emTransitoTotal = updatedEntries
      .filter(c => c.status === 'em_transito')
      .reduce((acc, c) => acc + Number(c.amount || 0), 0);

    // Mapear saldo em trânsito por filial
    const inTransitByStore = new Map<string, number>();
    updatedEntries
      .filter(c => c.status === 'em_transito')
      .forEach(c => {
        inTransitByStore.set(c.store_id, (inTransitByStore.get(c.store_id) || 0) + Number(c.amount || 0));
      });

    // Atualizar cada filial em summary.stores
    const updatedStores = (session.summary.stores || []).map(st => {
      const hasVaultRecords = updatedEntries.some(c => c.store_id === st.store_id);
      const newDinheiro = hasVaultRecords
        ? (inTransitByStore.get(st.store_id) || 0)
        : (st.dinheiro_loja || 0);

      const newConsolidado = Math.round((((st.previsto_ofx || 0) + newDinheiro + (st.maquininha || 0)) + Number.EPSILON) * 100) / 100;
      return {
        ...st,
        dinheiro_loja: newDinheiro,
        saldo_consolidado: newConsolidado
      };
    });

    const prevSummary = session.summary;
    const oldDinheiro = prevSummary.dinheiro_lojas || 0;
    const diffDinheiro = emTransitoTotal - oldDinheiro;
    const newCaixaAtual = Math.round(((prevSummary.caixa_atual + diffDinheiro) + Number.EPSILON) * 100) / 100;
    const newFluxoCaixa = Math.round(((newCaixaAtual - prevSummary.caixa_anterior) + Number.EPSILON) * 100) / 100;
    const faturamento = prevSummary.faturamento_periodo || prevSummary.faturamento_oi_base || 0;
    const newValorDispContas = Math.round(((faturamento - newFluxoCaixa) + Number.EPSILON) * 100) / 100;
    const newDiferencaFinal = Math.round(((newValorDispContas - prevSummary.subtotal_contas) + Number.EPSILON) * 100) / 100;

    return {
      ...session,
      cashVaultEntries: updatedEntries,
      summary: {
        ...prevSummary,
        stores: updatedStores,
        dinheiro_em_lojas: emTransitoTotal,
        dinheiro_lojas: emTransitoTotal,
        caixa_atual: newCaixaAtual,
        fluxo_caixa: newFluxoCaixa,
        valor_disp_contas: newValorDispContas,
        diferenca_final: newDiferencaFinal,
        status_geral: Math.abs(newDiferencaFinal) <= 50 ? 'approved' : 'divergence'
      }
    };
  };

  // Toggle status de cofre (em_transito <-> depositado)
  const handleToggleCashStatus = (id: string) => {
    const listToUpdate = effectiveCashVaultEntries;
    const updatedEntries = listToUpdate.map(c => {
      if (c.id === id) {
        const nextStatus = c.status === 'em_transito' ? 'depositado' : 'em_transito';
        return { ...c, status: nextStatus as 'em_transito' | 'depositado' };
      }
      return c;
    });

    const updatedSession = recalculateSessionWithVault(updatedEntries);
    saveSandboxSession(updatedSession);
    onUpdateSession(updatedSession);
    toast.success('Status do cofre e fechamento recalculados na sessão local!');
  };

  const handleDepositAllCash = () => {
    const listToUpdate = effectiveCashVaultEntries;
    const updatedEntries = listToUpdate.map(c => ({
      ...c,
      status: 'depositado' as const
    }));

    const updatedSession = recalculateSessionWithVault(updatedEntries);
    saveSandboxSession(updatedSession);
    onUpdateSession(updatedSession);
    toast.success('Todos os lançamentos foram marcados como depositados e o fechamento foi recalculado!');
  };

  return (
    <>
      {/* 1. MODAL COFRE & DINHEIRO DANIEL */}
      {activeModal === 'cofre' && (
        <Modal
          isOpen={true}
          onClose={onClose}
          title={`Raio-X do Cofre / Recolhimento Daniel (Data: ${targetDate})`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-zinc-200">
                  Total em Espécie Extraído das OSs
                </span>
                <p className="text-[11px] text-zinc-400">
                  Valores recebidos em dinheiro nas lojas no fechamento.
                </p>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold text-emerald-400">
                  R$ {effectiveCashVaultEntries.reduce((acc, c) => acc + c.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
                <div className="mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDepositAllCash}
                    className="h-6 text-[10px] px-2 border-emerald-500/30 text-emerald-400 hover:bg-emerald-950/30"
                  >
                    Marcar Todos Depositados
                  </Button>
                </div>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
              {effectiveCashVaultEntries.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  Nenhum recebimento em dinheiro extraído dos relatórios de OS.
                </div>
              ) : (
                effectiveCashVaultEntries.map((c) => (
                  <div key={c.id} className="p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100">OS #{c.os_number_ref}</span>
                        <Badge variant="outline" className={`text-[10px] ${c.status === 'depositado' ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-amber-500/30 text-amber-400 bg-amber-500/10'}`}>
                          {c.status}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        Loja: {c.store_name} • Data: {c.entry_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-zinc-200">
                        R$ {Number(c.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleCashStatus(c.id)}
                        className="h-7 text-[10px] px-2 text-zinc-400 hover:text-zinc-100"
                        title="Alternar entre em_transito e depositado"
                      >
                        Alternar
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. MODAL TÍTULOS A RECEBER */}
      {activeModal === 'recebiveis' && (
        <Modal
          isOpen={true}
          onClose={onClose}
          title={`Detalhamento de Títulos a Receber (Boletos & Faturamento)`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-200">Total a Receber na Simulação</span>
              <span className="text-sm font-bold text-indigo-400">
                R$ {Number(summary.a_receber || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
              {receivables.length === 0 ? (
                <div className="p-8 text-center text-xs text-zinc-500">
                  Nenhum título individual extraído das OSs da simulação (valor herdado do D-1: R$ {Number(summary.a_receber).toFixed(2)}).
                </div>
              ) : (
                receivables.map((r) => (
                  <div key={r.id} className="p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-100">{r.client_name}</span>
                        <Badge variant="outline" className="text-[10px] border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                          {r.payment_method}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-zinc-400">
                        OS #{r.os_number} • Vencimento: {r.due_date}
                      </p>
                    </div>

                    <span className="text-xs font-bold text-indigo-400">
                      R$ {Number(r.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 3. MODAL PÁTIO OS */}
      {activeModal === 'patio' && (
        <Modal
          isOpen={true}
          onClose={onClose}
          title={`Ordens de Serviço no Pátio (Em Aberto)`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-xs font-bold text-zinc-200">Saldo Total de Pátio (Restante a Receber)</span>
              <span className="text-sm font-bold text-amber-400">
                R$ {Number(summary.na_loja_os || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
              {summary.stores.filter(s => (s.na_loja_os || 0) > 0).map((s) => (
                <div key={s.store_id} className="p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                  <span className="text-xs font-bold text-zinc-100">{s.store_name}</span>
                  <span className="text-xs font-bold text-amber-400">
                    R$ {Number(s.na_loja_os).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. MODAL SALDOS BANCÁRIOS (RAIO-X) */}
      {activeModal === 'saldos' && (
        <Modal
          isOpen={true}
          onClose={onClose}
          title={`Raio-X de Saldos Bancários por Unidade`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Total Positivo</span>
                <p className="text-sm font-bold text-emerald-400">
                  R$ {Number(summary.total_saldo_banco_positivo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase">(-) Cheque Especial</span>
                <p className="text-sm font-bold text-rose-400">
                  - R$ {Number(summary.saldo_negativo_itau || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
              {summary.stores.map((s) => (
                <div key={s.store_id} className="p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-zinc-100">{s.store_name}</span>
                    <p className="text-[10px] text-zinc-400">
                      Entradas OFX: R$ {Number(s.entradas_realizadas || 0).toFixed(2)}
                    </p>
                  </div>
                  <span className={`text-xs font-bold ${s.saldo_banco >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    R$ {Number(s.saldo_banco).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 5. MODAL CONTAS (MANUAL) */}
      {activeModal === 'contas' && (
        <Modal
          isOpen={true}
          onClose={onClose}
          title={`Detalhamento de Contas e Juros da Rede`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Base Contas (Manual)</span>
                <p className="text-sm font-bold text-zinc-100">
                  R$ {Number(summary.contas_manual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-400 uppercase">Juros Rede (Taxas)</span>
                <p className="text-sm font-bold text-amber-400">
                  R$ {Number(summary.juros_rede || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-200">Subtotal de Contas a Cobrir</span>
              <span className="text-sm font-bold text-rose-400">
                R$ {Number(summary.subtotal_contas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 6. MODAL FATURAMENTO DO DIA */}
      {activeModal === 'faturamento' && (
        <Modal
          isOpen={true}
          onClose={onClose}
          title={`Detalhamento de Faturamento e Odômetro`}
          className="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-center">
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">Odômetro Hoje</span>
                <p className="text-sm font-bold text-zinc-100">
                  R$ {Number(summary.odometro_hoje || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 uppercase">(-) Odômetro Anterior</span>
                <p className="text-sm font-bold text-zinc-400">
                  R$ {Number(summary.odometro_anterior || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 uppercase">(=) Faturamento Líquido</span>
                <p className="text-sm font-bold text-emerald-400">
                  R$ {Number(summary.faturamento_oi_base || summary.faturamento_periodo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-950">
              {summary.stores.map((s) => (
                <div key={s.store_id} className="p-3 flex items-center justify-between hover:bg-zinc-900/50 transition-colors">
                  <div>
                    <span className="text-xs font-bold text-zinc-100">{s.store_name}</span>
                    <p className="text-[10px] text-zinc-400">
                      OFX: R$ {Number(s.entradas_realizadas || 0).toFixed(2)} • Cartão: R$ {Number(s.maquininha || 0).toFixed(2)}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-zinc-200">
                    R$ {Number(s.previsto_ofx || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} className="text-xs">
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 7. MODAL RAIO-X SALDO BANCOS + DINHEIRO */}
      {activeModal === 'saldos' && (
        <SaldoBancosDetailModal
          isOpen={true}
          onClose={onClose}
          targetDate={targetDate}
          stores={summary.stores}
          isSandbox={true}
          onSandboxBaixaDinheiro={onSandboxBaixaDinheiro}
        />
      )}
    </>
  );
}
