// src/hooks/useReconciliationWizardState.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { 
  WizardMasterState, 
  WizardStepId, 
  PendingUnmatchedTransaction, 
  LinkTransactionToOsPayload,
  NonRevenueJustificationItem,
  DanielVaultPickup
} from '@/components/importacoes/wizard/types';

export function useReconciliationWizardState(targetDate: string) {
  const cacheKey = `recon_wizard_draft_${targetDate}`;

  const [state, setState] = useState<WizardMasterState>(() => {
    try {
      const saved = localStorage.getItem(cacheKey);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (_) {}

    return {
      currentStep: 'ingestao',
      targetDate,
      rawFilesLoaded: false,
      manualInputs: {
        odometerAdjustments: {},
        manualBills: []
      },
      unmatchedTransactions: [],
      justifications: {},
      danielVault: {
        hadPickup: null,
        pickups: {}
      }
    };
  });

  // Auto-save no localStorage
  useEffect(() => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(state));
    } catch (_) {}
  }, [state, cacheKey]);

  const setStep = useCallback((step: WizardStepId) => {
    setState(prev => ({ ...prev, currentStep: step }));
  }, []);

  const setRawFilesLoaded = useCallback((loaded: boolean) => {
    setState(prev => ({ ...prev, rawFilesLoaded: loaded }));
  }, []);

  const setUnmatchedTransactions = useCallback((items: PendingUnmatchedTransaction[]) => {
    setState(prev => ({ ...prev, unmatchedTransactions: items }));
  }, []);

  // Vínculo Direto de 1 Clique à OS
  const linkTransactionToOs = useCallback(async (payload: LinkTransactionToOsPayload) => {
    try {
      // 1. Busca a OS atual
      const { data: os, error: osFetchError } = await supabase
        .from('patio_os')
        .select('*')
        .eq('id', payload.osId)
        .single();

      if (osFetchError || !os) {
        throw new Error(osFetchError?.message || 'OS não encontrada no pátio');
      }

      const prevPaid = Number(os.paid_value || 0);
      const newPaid = prevPaid + Number(payload.amount || 0);
      const totalVal = Number(os.total_value || 0);
      const newStatus = newPaid >= totalVal ? 'finalizada' : 'pago_parcial';

      // Concatena meio de pagamento se já existir outro
      const existingMethod = os.payment_method || '';
      const addedMethod = payload.paymentMethod || 'Outros';
      const updatedMethod = existingMethod.includes(addedMethod) 
        ? existingMethod 
        : (existingMethod ? `${existingMethod}, ${addedMethod}` : addedMethod);

      // 2. Atualiza a OS no banco
      const { error: updateError } = await supabase
        .from('patio_os')
        .update({
          paid_value: newPaid,
          payment_method: updatedMethod,
          status: newStatus,
          closed_at: newStatus === 'finalizada' ? new Date().toISOString() : os.closed_at
        })
        .eq('id', payload.osId);

      if (updateError) throw updateError;

      // 3. Registra em conciliation_matches
      await supabase
        .from('conciliation_matches')
        .insert({
          store_id: payload.storeId,
          target_date: targetDate,
          os_id: payload.osId,
          transaction_id: payload.transactionId,
          match_type: 'MANUAL_1CLICK',
          confidence: 1.0,
          notes: `Vínculo manual via Wizard: ${payload.paymentMethod} R$ ${payload.amount.toFixed(2)}`
        });

      // 4. Atualiza estado em memória
      setState(prev => ({
        ...prev,
        unmatchedTransactions: prev.unmatchedTransactions.map(t => 
          t.id === payload.transactionId 
            ? { ...t, status: 'vinculada', matchedOsId: payload.osId, matchedOsNumber: payload.osNumber || os.os_number }
            : t
        )
      }));

      toast.success(`Transação vinculada com sucesso à OS #${os.os_number || payload.osId}!`);
      return true;
    } catch (err: any) {
      console.error('Erro ao vincular transação à OS:', err);
      toast.error(`Falha ao vincular à OS: ${err.message || 'Erro desconhecido'}`);
      return false;
    }
  }, [targetDate]);

  // Salvar ou Editar Justificativa Contábil
  const saveJustification = useCallback((justification: NonRevenueJustificationItem) => {
    setState(prev => ({
      ...prev,
      justifications: {
        ...prev.justifications,
        [justification.transactionId]: justification
      },
      unmatchedTransactions: prev.unmatchedTransactions.map(t => 
        t.id === justification.transactionId 
          ? { ...t, status: 'justificada' }
          : t
      )
    }));
    toast.success('Justificativa salva com sucesso!');
  }, []);

  // Cancelar / Excluir Justificativa
  const removeJustification = useCallback((transactionId: string) => {
    setState(prev => {
      const nextJustifications = { ...prev.justifications };
      delete nextJustifications[transactionId];
      return {
        ...prev,
        justifications: nextJustifications,
        unmatchedTransactions: prev.unmatchedTransactions.map(t => 
          t.id === transactionId 
            ? { ...t, status: 'pendente' }
            : t
        )
      };
    });
    toast.info('Justificativa cancelada.');
  }, []);

  // Daniel / Cofre
  const setHadDanielPickup = useCallback((hadPickup: boolean) => {
    setState(prev => ({
      ...prev,
      danielVault: {
        ...prev.danielVault,
        hadPickup
      }
    }));
  }, []);

  const updateDanielPickup = useCallback((storeId: string, storeName: string, balance: number, collected: number) => {
    setState(prev => ({
      ...prev,
      danielVault: {
        ...prev.danielVault,
        pickups: {
          ...prev.danielVault.pickups,
          [storeId]: {
            storeId,
            storeName,
            currentVaultBalance: balance,
            amountCollected: collected,
            confirmed: collected > 0
          }
        }
      }
    }));
  }, []);

  // Baixa no banco para recolhimento do Daniel
  const submitDanielPickups = useCallback(async () => {
    try {
      const pickups = Object.values(state.danielVault.pickups).filter(p => p.amountCollected > 0);
      if (pickups.length === 0) {
        toast.info('Nenhum recolhimento informado.');
        return true;
      }

      for (const pickup of pickups) {
        // Registra entrada de saída/depósito no store_cash_vault
        await supabase
          .from('store_cash_vault')
          .insert({
            store_id: pickup.storeId,
            entry_date: targetDate,
            amount: -Math.abs(pickup.amountCollected),
            status: 'depositado',
            deposited_at: new Date().toISOString(),
            notes: `Recolhimento Daniel: R$ ${pickup.amountCollected.toFixed(2)} para depósito`
          });
      }

      toast.success('Recolhimento do Daniel baixado com sucesso nos cofres!');
      return true;
    } catch (err: any) {
      console.error('Erro ao baixar recolhimento do Daniel:', err);
      toast.error(`Erro ao registrar baixa do Daniel: ${err.message}`);
      return false;
    }
  }, [state.danielVault.pickups, targetDate]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(cacheKey);
    } catch (_) {}
    setState({
      currentStep: 'ingestao',
      targetDate,
      rawFilesLoaded: false,
      manualInputs: {
        odometerAdjustments: {},
        manualBills: []
      },
      unmatchedTransactions: [],
      justifications: {},
      danielVault: {
        hadPickup: null,
        pickups: {}
      }
    });
  }, [cacheKey, targetDate]);

  return {
    state,
    setStep,
    setRawFilesLoaded,
    setUnmatchedTransactions,
    linkTransactionToOs,
    saveJustification,
    removeJustification,
    setHadDanielPickup,
    updateDanielPickup,
    submitDanielPickups,
    clearDraft
  };
}
